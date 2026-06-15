import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { StockOpnameGroup, StockOpname, PaginatedResponse, StockOpnameTemplate } from '@/types/database'
import { toast } from 'sonner'

const PAGE_SIZE = 10

export function useStockOpnameGroups() {
  // State
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [warehouseId, setWarehouseId] = useState<string>('all')
  const [categoryId, setCategoryId] = useState<string>('all')
  const [dateRange, setDateRange] = useState<{ from?: Date, to?: Date }>({})

  // Query
  const query = useQuery<PaginatedResponse<StockOpnameGroup>>({
    queryKey: ['stock-opname-groups', page, search, warehouseId, categoryId, dateRange],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        page: page.toString(),
        pageSize: PAGE_SIZE.toString(),
        search: search || '',
      })
      if (warehouseId && warehouseId !== 'all') searchParams.append('warehouse_id', warehouseId)
      if (categoryId && categoryId !== 'all') searchParams.append('category_id', categoryId)
      if (dateRange.from) searchParams.append('start_date', dateRange.from.toISOString())
      if (dateRange.to) searchParams.append('end_date', dateRange.to.toISOString())

      const res = await fetch(`/api/v1/stock-opname-groups?${searchParams}`)
      if (!res.ok) throw new Error('Gagal mengambil data group opname')
      return res.json()
    }
  })

  return {
    // State
    page, setPage,
    search, setSearch,
    warehouseId, setWarehouseId,
    categoryId, setCategoryId,
    dateRange, setDateRange,

    // Data
    data: query.data,
    isLoading: query.isLoading,
    pageSize: PAGE_SIZE,
  }
}

export function useStockOpnameGroup(id: string) {
  return useQuery<{ data: StockOpnameGroup }>({
    queryKey: ['stock-opname-group', id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/stock-opname-groups/${id}`)
      if (!res.ok) throw new Error('Gagal mengambil data group opname')
      return res.json()
    },
    enabled: !!id
  })
}

export function useStockOpnameEntries(groupId: string, params: any) {
  return useQuery({
    queryKey: ['stock-opname-entries', groupId, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (params.page) searchParams.append('page', params.page.toString())
      if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString())
      if (params.search) searchParams.append('search', params.search)
      if (params.warehouseId && params.warehouseId !== 'all') searchParams.append('warehouse_id', params.warehouseId)
      if (params.categoryId && params.categoryId !== 'all') searchParams.append('category_id', params.categoryId)
      if (params.filterType && params.filterType !== 'all') searchParams.append('filter_type', params.filterType)

      if (params.datePreset === 'custom') {
        if (params.customStartDate) searchParams.append('start_date', params.customStartDate)
        if (params.customEndDate) searchParams.append('end_date', params.customEndDate)
      } else if (params.datePreset && params.datePreset !== 'all') {
        const days = parseInt(params.datePreset)
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - days)
        searchParams.append('start_date', cutoff.toISOString().split('T')[0])
      }

      const res = await fetch(`/api/v1/stock-opname-groups/${groupId}/entries?${searchParams}`)
      if (!res.ok) throw new Error('Gagal mengambil data entries opname')
      return res.json()
    },
    enabled: !!groupId
  })
}

export function useStockOpnameMutations() {
  const queryClient = useQueryClient()

  const createGroup = useMutation({
    mutationFn: async (data: { name: string; description?: string; template_id?: string }) => {
      const res = await fetch('/api/v1/stock-opname-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal membuat group opname')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-opname-groups'] })
      toast.success('Group opname berhasil dibuat')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal membuat group opname')
    }
  })

  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/stock-opname-groups/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal menghapus group opname')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-opname-groups'] })
      toast.success('Group opname berhasil dihapus')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal menghapus group opname')
    }
  })

  const bulkDeleteGroups = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch('/api/v1/stock-opname-groups', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal menghapus data terpilih')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-opname-groups'] })
      toast.success('Data terpilih berhasil dihapus')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal menghapus data terpilih')
    }
  })

  const addEntry = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/v1/stock-opnames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal menambah item opname')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stock-opname-group', variables.group_id] })
      queryClient.invalidateQueries({ queryKey: ['stock-opname-entries', variables.group_id] })
      toast.success('Item opname berhasil ditambahkan')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal menambah item opname')
    }
  })

  const deleteEntry = useMutation({
    mutationFn: async ({ id, groupId }: { id: string; groupId: string }) => {
      const res = await fetch(`/api/v1/stock-opnames/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal menghapus item opname')
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stock-opname-group', variables.groupId] })
      queryClient.invalidateQueries({ queryKey: ['stock-opname-entries', variables.groupId] })
      toast.success('Item opname berhasil dihapus')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal menghapus item opname')
    }
  })

  const bulkDeleteEntries = useMutation({
    mutationFn: async ({ ids, groupId }: { ids: string[]; groupId: string }) => {
      const res = await fetch('/api/v1/stock-opnames', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal menghapus data terpilih')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stock-opname-group', variables.groupId] })
      queryClient.invalidateQueries({ queryKey: ['stock-opname-entries', variables.groupId] })
      toast.success('Data terpilih berhasil dihapus')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal menghapus data terpilih')
    }
  })

  const updateEntry = useMutation({
    mutationFn: async ({ id, groupId, ...data }: any) => {
      const res = await fetch(`/api/v1/stock-opnames/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal mengubah item opname')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stock-opname-group', variables.groupId] })
      queryClient.invalidateQueries({ queryKey: ['stock-opname-entries', variables.groupId] })
      toast.success('Item opname berhasil diubah')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal mengubah item opname')
    }
  })

  const finalizeGroup = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/stock-opname-groups/${id}/finalize`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal finalisasi opname')
      }
      return res.json()
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['stock-opname-group', id] })
      queryClient.invalidateQueries({ queryKey: ['stock-opname-entries', id] })
      queryClient.invalidateQueries({ queryKey: ['stock-opname-groups'] })
      toast.success('Opname berhasil difinalisasi. Stok telah disesuaikan.')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal finalisasi opname')
    }
  })

  const updateGroup = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string; description?: string }) => {
      const res = await fetch(`/api/v1/stock-opname-groups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal mengubah group opname')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stock-opname-group', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['stock-opname-groups'] })
      toast.success('Group opname berhasil diubah')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal mengubah group opname')
    }
  })

  const createTemplate = useMutation({
    mutationFn: async (data: { name: string; description?: string; warehouse_id: string; item_ids: string[] }) => {
      const res = await fetch('/api/v1/stock-opname-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal membuat template opname')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-opname-templates'] })
      toast.success('Template opname berhasil dibuat')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal membuat template opname')
    }
  })

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; description?: string; warehouse_id?: string; item_ids?: string[] }) => {
      const res = await fetch(`/api/v1/stock-opname-templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal mengubah template opname')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stock-opname-template', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['stock-opname-templates'] })
      toast.success('Template opname berhasil diubah')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal mengubah template opname')
    }
  })

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/stock-opname-templates/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal menghapus template opname')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-opname-templates'] })
      toast.success('Template opname berhasil dihapus')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal menghapus template opname')
    }
  })

  return { 
    createGroup, 
    updateGroup, 
    deleteGroup, 
    bulkDeleteGroups, 
    addEntry, 
    deleteEntry, 
    bulkDeleteEntries, 
    updateEntry, 
    finalizeGroup,
    // templates
    createTemplate,
    updateTemplate,
    deleteTemplate
  }
}

export function useStockOpnameTemplates() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [warehouseId, setWarehouseId] = useState<string>('all')

  const query = useQuery<PaginatedResponse<StockOpnameTemplate>>({
    queryKey: ['stock-opname-templates', page, search, warehouseId],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        page: page.toString(),
        pageSize: PAGE_SIZE.toString(),
        search: search || '',
      })
      if (warehouseId && warehouseId !== 'all') searchParams.append('warehouse_id', warehouseId)

      const res = await fetch(`/api/v1/stock-opname-templates?${searchParams}`)
      if (!res.ok) throw new Error('Gagal mengambil data template opname')
      return res.json()
    }
  })

  return {
    page, setPage,
    search, setSearch,
    warehouseId, setWarehouseId,
    data: query.data,
    isLoading: query.isLoading,
    pageSize: PAGE_SIZE,
  }
}

export function useStockOpnameTemplate(id: string) {
  return useQuery<{ data: StockOpnameTemplate }>({
    queryKey: ['stock-opname-template', id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/stock-opname-templates/${id}`)
      if (!res.ok) throw new Error('Gagal mengambil data template opname')
      return res.json()
    },
    enabled: !!id
  })
}
