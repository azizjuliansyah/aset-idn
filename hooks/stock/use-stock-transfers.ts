'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { apiService } from '@/lib/api-service'
import type { StockTransfer, PaginatedResponse } from '@/types/database'

const PAGE_SIZE = 10

export function useStockTransfers() {
  const supabase = createClient()
  const qc = useQueryClient()
  
  // State
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [itemId, setItemId] = useState<string>('all')

  // Query
  const query = useQuery({
    queryKey: ['stock_transfer', page, search, itemId],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE
      const url = new URL('/api/v1/stock-transfer', window.location.origin)
      url.searchParams.append('page', page.toString())
      url.searchParams.append('pageSize', PAGE_SIZE.toString())
      if (search) url.searchParams.append('search', search)
      if (itemId !== 'all') url.searchParams.append('item_id', itemId)

      return apiService.get<PaginatedResponse<StockTransfer>>(url.toString())
    },
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => apiService.post('/api/v1/stock-transfer', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock_transfer'] })
      qc.invalidateQueries({ queryKey: ['stock_ledger'] })
      qc.invalidateQueries({ queryKey: ['stock_in'] })
      qc.invalidateQueries({ queryKey: ['stock_out'] })
    },
  })

  return {
    // State
    page, setPage,
    search, setSearch,
    itemId, setItemId,
    
    // Data
    data: query.data,
    isLoading: query.isLoading,
    pageSize: PAGE_SIZE,
    
    // Actions
    createMutation,
  }
}
