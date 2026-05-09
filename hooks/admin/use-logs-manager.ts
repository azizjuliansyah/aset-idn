'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDebounce } from '@/hooks/use-debounce'

const PAGE_SIZE = 15

export function useLogsManager() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [actionFilter, setActionFilter] = useState('all')
  const [entityFilter, setEntityFilter] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['activity-logs', page, debouncedSearch, actionFilter, entityFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        search: debouncedSearch,
        action: actionFilter,
        entity_type: entityFilter,
      })
      const res = await fetch(`/api/admin/logs?${params}`)
      if (!res.ok) throw new Error('Gagal memuat data log')
      return res.json()
    },
  })

  return {
    state: {
      page,
      search,
      actionFilter,
      entityFilter,
      PAGE_SIZE,
    },
    handlers: {
      setPage,
      setSearch,
      setActionFilter,
      setEntityFilter,
    },
    queries: {
      data,
      isLoading,
    },
  }
}
