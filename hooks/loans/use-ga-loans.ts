import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ItemLoan } from '@/types/database'
import { useDebounce } from '@/hooks/use-debounce'

export type LoanWithJoins = ItemLoan & {
  item?: { id: string; name: string }
  warehouse?: { id: string; name: string }
  requester?: { id: string; full_name: string }
  actioner?: { id: string; full_name: string }
}

const PAGE_SIZE = 10

export function useGaLoans(isHistory: boolean) {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  
  const [statusFilter, setStatusFilter] = useState('all')
  const [actionedByFilter, setActionedByFilter] = useState('all')
  const [warehouseId, setWarehouseId] = useState('all')
  const [datePreset, setDatePreset] = useState('all') // Represents loan_date filter
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  
  const [returnDatePreset, setReturnDatePreset] = useState('all')
  const [returnCustomStartDate, setReturnCustomStartDate] = useState('')
  const [returnCustomEndDate, setReturnCustomEndDate] = useState('')
  const [dueFilter, setDueFilter] = useState('all')

  const { data: handlers } = useQuery({
    queryKey: ['profiles', 'handlers'],
    queryFn: async () => {
      const res = await fetch('/api/v1/profiles?role=admin,general_affair')
      if (!res.ok) throw new Error('Gagal memuat list admin/ga')
      return await res.json() as { id: string; full_name: string }[]
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  })

  const { data, isLoading } = useQuery({
    queryKey: ['loans_ga', page, debouncedSearch, statusFilter, actionedByFilter, isHistory, warehouseId, datePreset, customStartDate, customEndDate, returnDatePreset, returnCustomStartDate, returnCustomEndDate, dueFilter],
    queryFn: async () => {
      let finalStatus = statusFilter
      if (statusFilter === 'all') {
        finalStatus = isHistory ? 'rejected,returned,cancelled' : 'pending,approved'
      }

      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        search: debouncedSearch,
        status: finalStatus,
        actioned_by: actionedByFilter,
        warehouse_id: warehouseId,
        due_filter: dueFilter,
      })

      if (datePreset !== 'all' || returnDatePreset !== 'all') {
        const { endOfDay, startOfDay, subDays, parseISO } = await import('date-fns')
        
        if (datePreset !== 'all') {
          let start: Date | null = null
          let end: Date = endOfDay(new Date())

          if (datePreset === 'custom') {
            if (customStartDate) start = startOfDay(parseISO(customStartDate))
            if (customEndDate) end = endOfDay(parseISO(customEndDate))
          } else {
            start = startOfDay(subDays(new Date(), parseInt(datePreset)))
          }

          if (start) params.append('date_from', start.toISOString())
          params.append('date_to', end.toISOString())
        }

        if (returnDatePreset !== 'all') {
          let rStart: Date | null = null
          let rEnd: Date = endOfDay(new Date())

          if (returnDatePreset === 'custom') {
            if (returnCustomStartDate) rStart = startOfDay(parseISO(returnCustomStartDate))
            if (returnCustomEndDate) rEnd = endOfDay(parseISO(returnCustomEndDate))
          } else {
            rStart = startOfDay(subDays(new Date(), parseInt(returnDatePreset)))
          }

          if (rStart) params.append('return_date_from', rStart.toISOString())
          params.append('return_date_to', rEnd.toISOString())
        }
      }

      const res = await fetch(`/api/v1/loans?${params}`)
      if (!res.ok) throw new Error('Gagal memuat data')
      return await res.json() as { data: LoanWithJoins[]; count: number }
    },
  })

  const performAction = useMutation({
    mutationFn: async ({ id, action, extra }: { id: string; action: string; extra?: Record<string, any> }) => {
      const res = await fetch(`/api/v1/loans/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Gagal memproses')
      }
    },
    onSuccess: (_, variables) => {
      const messages: Record<string, string> = {
        approve: 'Peminjaman disetujui',
        reject: 'Peminjaman ditolak',
        return: 'Peminjaman ditandai dikembalikan',
        undo_return: 'Status pengembalian dibatalkan',
      }
      toast.success(messages[variables.action] || 'Berhasil diproses')
      qc.invalidateQueries({ queryKey: ['loans_ga'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteLoan = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/loans/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Gagal menghapus peminjaman')
      }
    },
    onSuccess: () => {
      toast.success('Peminjaman berhasil dihapus')
      qc.invalidateQueries({ queryKey: ['loans_ga'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteBulkLoans = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch(`/api/v1/loans`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Gagal menghapus data secara massal')
      }
    },
    onSuccess: (_, variables) => {
      toast.success(`${variables.length} data peminjaman berhasil dihapus`)
      qc.invalidateQueries({ queryKey: ['loans_ga'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const remindLoan = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/loans/${id}/remind`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Gagal mengirim pengingat WhatsApp')
      }
    },
    onSuccess: () => toast.success('Pengingat WhatsApp berhasil dikirim'),
    onError: (err: Error) => toast.error(err.message),
  })

  return {
    state: {
      page,
      search,
      statusFilter,
      actionedByFilter,
      warehouseId,
      datePreset,
      customStartDate,
      customEndDate,
      returnDatePreset,
      returnCustomStartDate,
      returnCustomEndDate,
      dueFilter,
      PAGE_SIZE,
    },
    handlers: {
      setPage,
      setSearch,
      setStatusFilter,
      setActionedByFilter,
      setWarehouseId,
      setDatePreset,
      setCustomStartDate,
      setCustomEndDate,
      setReturnDatePreset,
      setReturnCustomStartDate,
      setReturnCustomEndDate,
      setDueFilter,
    },
    queries: {
      data,
      isLoading,
      handlers,
    },
    mutations: {
      performAction,
      deleteLoan,
      deleteBulkLoans,
      remindLoan,
    }
  }
}
