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
  const [userFilter, setUserFilter] = useState('all')
  const [datePreset, setDatePreset] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['activity-logs', page, debouncedSearch, actionFilter, entityFilter, userFilter, datePreset, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        search: debouncedSearch,
        action: actionFilter,
        entity_type: entityFilter,
        user_id: userFilter,
        days: datePreset,
      })
      if (startDate) params.set('start_date', startDate)
      if (endDate) params.set('end_date', endDate)
      
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
      userFilter,
      datePreset,
      startDate,
      endDate,
      PAGE_SIZE,
    },
    handlers: {
      setPage,
      setSearch,
      setActionFilter,
      setEntityFilter,
      setUserFilter,
      setDatePreset,
      setStartDate,
      setEndDate,
    },
    queries: {
      data,
      isLoading,
    },
  }
}
