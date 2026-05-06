import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { endOfDay, startOfDay, subDays, parseISO } from 'date-fns'
import { apiService } from '@/lib/api-service'
import type { StockIn, Item, Warehouse } from '@/types/database'

const PAGE_SIZE = 10

export type StockInWithJoins = StockIn & { 
  item?: Item & { item_category?: { name: string } }; 
  warehouse?: Warehouse;
  creator?: { full_name: string };
}

export function useStockTransactions(type: 'in' | 'out') {
  const table = type === 'in' ? 'stock_in' : 'stock_out'
  const queryKey = type === 'in' ? 'stock_in' : 'stock_out'
  
  const supabase = createClient()
  const qc = useQueryClient()
  
  // State
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [warehouseId, setWarehouseId] = useState<string>('all')
  const [categoryId, setCategoryId] = useState<string>('all')
  const [datePreset, setDatePreset] = useState<string>('all')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')

  // Query
  const query = useQuery({
    queryKey: [queryKey, page, search, warehouseId, categoryId, datePreset, customStartDate, customEndDate],
    queryFn: async () => {
      let q = supabase
        .from(table)
        .select('*, item:items!inner(id,name,item_category_id,item_category:item_category(name)), warehouse:warehouses(id,name), creator:profiles!created_by(full_name)', { count: 'exact' })
        .order('date', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

      if (warehouseId !== 'all') q = q.eq('warehouse_id', warehouseId)
      if (categoryId !== 'all') q = q.eq('item.item_category_id', categoryId)

      if (datePreset !== 'all') {
        let start: Date | null = null
        let end: Date = endOfDay(new Date())

        if (datePreset === 'custom') {
          if (customStartDate) start = startOfDay(parseISO(customStartDate))
          if (customEndDate) end = endOfDay(parseISO(customEndDate))
        } else {
          start = startOfDay(subDays(new Date(), parseInt(datePreset)))
        }

        if (start) q = q.gte('date', start.toISOString())
        q = q.lte('date', end.toISOString())
      }

      if (search) {
        q = q.or(`item.name.ilike.%${search}%,note.ilike.%${search}%`)
      }

      const { data, count, error } = await q
      if (error) throw error
      return { data: (data ?? []) as StockInWithJoins[], count: count ?? 0 }
    },
  })

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiService.delete(`/api/v1/stock-${type}/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKey] })
      qc.invalidateQueries({ queryKey: ['stock_ledger'] })
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => apiService.delete(`/api/v1/stock-${type}/${id}`)))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKey] })
      qc.invalidateQueries({ queryKey: ['stock_ledger'] })
    },
  })

  return {
    // State
    page, setPage,
    search, setSearch,
    warehouseId, setWarehouseId,
    categoryId, setCategoryId,
    datePreset, setDatePreset,
    customStartDate, setCustomStartDate,
    customEndDate, setCustomEndDate,
    
    // Data
    data: query.data,
    isLoading: query.isLoading,
    pageSize: PAGE_SIZE,
    
    // Actions
    deleteMutation,
    bulkDeleteMutation,
  }
}
