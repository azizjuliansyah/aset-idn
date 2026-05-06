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
    queryKey: ['loans_ga', page, debouncedSearch, statusFilter, actionedByFilter, isHistory],
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
      })
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

  return {
    state: {
      page,
      search,
      statusFilter,
      actionedByFilter,
      PAGE_SIZE,
    },
    handlers: {
      setPage,
      setSearch,
      setStatusFilter,
      setActionedByFilter,
    },
    queries: {
      data,
      isLoading,
      handlers,
    },
    mutations: {
      performAction,
    }
  }
}
