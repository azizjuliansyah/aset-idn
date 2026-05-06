import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { apiService } from '@/lib/api-service'
import { useDebounce } from '@/hooks/use-debounce'
import type { Item, ItemCategory, ItemStatus, ItemCondition } from '@/types/database'
import type { ItemFormValues } from '@/lib/validations/item'

export type ItemWithJoins = Item & {
  item_category?: ItemCategory
  item_status?: ItemStatus
  item_condition?: ItemCondition
  current_stock?: number
  category_name?: string
  condition_name?: string
}

const PAGE_SIZE = 10

export function useItemsManager() {
  const supabase = createClient()
  const qc = useQueryClient()
  
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [warehouseId, setWarehouseId] = useState<string>('all')
  const [categoryId, setCategoryId] = useState<string>('all')
  const [conditionId, setConditionId] = useState<string>('all')
  const [stockStatus, setStockStatus] = useState<string>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['items', page, debouncedSearch, warehouseId, categoryId, conditionId, stockStatus],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_items_with_stats', {
        p_search: debouncedSearch,
        p_warehouse_id: warehouseId === 'all' ? null : warehouseId,
        p_category_id: categoryId === 'all' ? null : categoryId,
        p_condition_id: conditionId === 'all' ? null : conditionId,
        p_stock_status: stockStatus,
        p_limit: PAGE_SIZE,
        p_offset: (page - 1) * PAGE_SIZE,
      })
      if (error) throw error
      const count = data?.[0]?.total_count ?? 0
      return { data: (data ?? []) as ItemWithJoins[], count: Number(count) }
    },
  })

  const saveMutation = useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: ItemFormValues }) => {
      const payload = {
        ...values,
        item_category_id: values.item_category_id || null,
        item_status_id: values.item_status_id || null,
        item_condition_id: values.item_condition_id || null,
      }
      
      if (id) {
        return apiService.patch(`/api/v1/items/${id}`, payload)
      } else {
        return apiService.post('/api/v1/items', payload)
      }
    },
    onSuccess: (_, variables) => {
      toast.success(variables.id ? 'Barang diperbarui' : 'Barang ditambahkan')
      qc.invalidateQueries({ queryKey: ['items'] })
    },
    onError: (err: any) => toast.error(err.message || 'Gagal menyimpan data'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/items/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Gagal menghapus barang')
      }
    },
    onSuccess: () => {
      toast.success('Barang dihapus')
      qc.invalidateQueries({ queryKey: ['items'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('items').delete().in('id', ids)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Barang terpilih dihapus')
      qc.invalidateQueries({ queryKey: ['items'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return {
    state: {
      page,
      search,
      warehouseId,
      categoryId,
      conditionId,
      stockStatus,
      PAGE_SIZE,
    },
    handlers: {
      setPage,
      setSearch,
      setWarehouseId,
      setCategoryId,
      setConditionId,
      setStockStatus,
    },
    queries: {
      data,
      isLoading,
    },
    mutations: {
      save: saveMutation,
      delete: deleteMutation,
      bulkDelete: bulkDeleteMutation,
    }
  }
}
