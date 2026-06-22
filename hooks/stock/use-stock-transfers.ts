'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { apiService } from '@/lib/api-service'
import type { StockTransfer, PaginatedResponse } from '@/types/database'


export function useStockTransfers() {
  const supabase = createClient()
  const qc = useQueryClient()
  
  // State
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [itemId, setItemId] = useState<string>('all')
  const [fromWarehouseId, setFromWarehouseId] = useState<string>('all')
  const [toWarehouseId, setToWarehouseId] = useState<string>('all')
  const [categoryId, setCategoryId] = useState<string>('all')
  const [dateRange, setDateRange] = useState<{from?: Date, to?: Date}>({})

  // Query
  const query = useQuery({
    queryKey: ['stock_transfer', page, pageSize, search, itemId, fromWarehouseId, toWarehouseId, categoryId, dateRange],
    queryFn: async () => {
      const url = new URL('/api/v1/stock-transfer', window.location.origin)
      url.searchParams.append('page', page.toString())
      url.searchParams.append('pageSize', pageSize.toString())
      if (search) url.searchParams.append('search', search)
      if (itemId !== 'all') url.searchParams.append('item_id', itemId)
      if (fromWarehouseId !== 'all') url.searchParams.append('from_warehouse_id', fromWarehouseId)
      if (toWarehouseId !== 'all') url.searchParams.append('to_warehouse_id', toWarehouseId)
      if (categoryId !== 'all') url.searchParams.append('category_id', categoryId)
      if (dateRange.from) url.searchParams.append('start_date', dateRange.from.toISOString())
      if (dateRange.to) url.searchParams.append('end_date', dateRange.to.toISOString())

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
    fromWarehouseId, setFromWarehouseId,
    toWarehouseId, setToWarehouseId,
    categoryId, setCategoryId,
    dateRange, setDateRange,
    
    // Data
    data: query.data,
    isLoading: query.isLoading,
    pageSize,
    setPageSize: (size: number) => {
      setPageSize(size)
      setPage(1)
    },
    
    // Actions
    createMutation,
  }
}
