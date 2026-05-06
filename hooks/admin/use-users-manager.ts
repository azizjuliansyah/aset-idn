import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Profile } from '@/types/database'
import { useDebounce } from '@/hooks/use-debounce'

const PAGE_SIZE = 10

export function useUsersManager() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [roleFilter, setRoleFilter] = useState<string>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, debouncedSearch, roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        search: debouncedSearch,
        role: roleFilter,
      })
      const res = await fetch(`/api/admin/users?${params}`)
      if (!res.ok) throw new Error('Gagal memuat data')
      return res.json() as Promise<{ data: Profile[]; count: number }>
    },
  })

  const createMutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Gagal membuat user')
      }
    },
    onSuccess: () => {
      toast.success('User berhasil ditambahkan')
      qc.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const editMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: any }) => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Gagal memperbarui user')
      }
    },
    onSuccess: () => {
      toast.success('User diperbarui')
      qc.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Gagal menghapus user')
      }
    },
    onSuccess: () => {
      toast.success('User dihapus')
      qc.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Gagal menghapus user terpilih')
      }
    },
    onSuccess: () => {
      toast.success('User terpilih dihapus')
      qc.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return {
    state: {
      page,
      search,
      roleFilter,
      PAGE_SIZE,
    },
    handlers: {
      setPage,
      setSearch,
      setRoleFilter,
    },
    queries: {
      data,
      isLoading,
    },
    mutations: {
      create: createMutation,
      edit: editMutation,
      delete: deleteMutation,
      bulkDelete: bulkDeleteMutation,
    }
  }
}
