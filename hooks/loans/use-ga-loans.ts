'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { LoanRequest, LoanItem, Item, Warehouse, Profile, LoanWithJoins } from '@/types/database'
import { useDebounce } from '@/hooks/use-debounce'
 
export type { LoanWithJoins }



const EMPTY_ARRAY: string[] = []

export type GaLoanMode = 'requests' | 'manage' | 'history'

export function useGaLoans(mode: GaLoanMode, selectedIds: string[] = EMPTY_ARRAY) {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
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

  const { data: overdueCountData } = useQuery({
    queryKey: ['loans_ga', 'overdue_count'],
    queryFn: async () => {
      const params = new URLSearchParams({
        summary: 'true',
        status: 'approved',
        due_filter: 'overdue',
      })
      const res = await fetch(`/api/v1/loans?${params}`)
      if (!res.ok) return { count: 0 }
      const json = await res.json()
      return { count: json.count || 0 }
    },
    enabled: mode !== 'history',
  })

  const { data: validSelectedCountData } = useQuery({
    queryKey: ['loans_ga', 'valid_selected_count', selectedIds],
    queryFn: async () => {
      if (!selectedIds || selectedIds.length === 0) return { count: 0 }
      const params = new URLSearchParams({
        summary: 'true',
        ids: selectedIds.join(','),
        status: 'approved',
        due_filter: 'overdue',
      })
      const res = await fetch(`/api/v1/loans?${params}`)
      if (!res.ok) return { count: 0 }
      const json = await res.json()
      return { count: json.count || 0 }
    },
    enabled: !!selectedIds && selectedIds.length > 0 && mode !== 'history',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['loans_ga', page, pageSize, debouncedSearch, statusFilter, actionedByFilter, mode, warehouseId, datePreset, customStartDate, customEndDate, returnDatePreset, returnCustomStartDate, returnCustomEndDate, dueFilter],
    queryFn: async () => {
      let finalStatus = statusFilter
      if (statusFilter === 'all') {
        if (mode === 'history') finalStatus = 'rejected,returned,cancelled'
        else if (mode === 'requests') finalStatus = 'pending'
        else if (mode === 'manage') finalStatus = 'approved'
      }

      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
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
      pageSize,
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
      setPageSize: (size: number) => {
        setPageSize(size)
        setPage(1)
      },
    },
    queries: {
      data,
      isLoading,
      handlers,
      overdueCount: overdueCountData?.count || 0,
      validSelectedCount: validSelectedCountData?.count || 0
    },
    mutations: {
      performAction,
      deleteLoan,
      deleteBulkLoans,
      remindLoan,
      remindOverdue: useMutation({
        mutationFn: async (target?: string | string[]) => {
          const res = await fetch('/api/v1/loans/remind-overdue', { 
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-manual-trigger': 'true'
            },
            body: JSON.stringify(
              Array.isArray(target) 
                ? { loanIds: target } 
                : { loanId: target }
            )
          })
          const result = await res.json()
          if (!res.ok) throw new Error(result.error ?? 'Gagal mengirim pengingat')
          return result
        },
        onSuccess: (res) => toast.success(res.message || 'Pengingat massal berhasil dikirim'),
        onError: (err: Error) => toast.error(err.message),
      }),
    }
  }
}
