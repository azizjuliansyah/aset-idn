import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { subDays, startOfDay, endOfDay } from 'date-fns'
import { formatDate } from '@/lib/utils'

export interface DashboardStats {
  totalItems: number
  totalWarehouses: number
  lowStockItems: number
}

export interface RecentTransaction {
  id: string
  type: 'in' | 'out'
  item_name: string
  warehouse_name: string
  quantity: number
  date: string
}

export function useDashboardData() {
  const supabase = createClient()
  const [datePreset, setDatePreset] = useState('7')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  const getDates = () => {
    let from = subDays(new Date(), 7)
    let to = new Date()

    if (datePreset === 'all') {
      from = new Date(2000, 0, 1)
    } else if (datePreset === 'custom') {
      if (customStartDate) from = startOfDay(new Date(customStartDate))
      if (customEndDate) to = endOfDay(new Date(customEndDate))
    } else {
      from = subDays(new Date(), parseInt(datePreset))
    }
    return { from, to }
  }

  const { from, to } = getDates()

  const statsQuery = useQuery({
    queryKey: ['dashboard_stats'],
    queryFn: async () => {
      const [items, warehouses, ledger] = await Promise.all([
        supabase.from('items').select('id', { count: 'exact', head: true }),
        supabase.from('warehouses').select('id', { count: 'exact', head: true }),
        supabase.from('stock_ledger').select('is_low_stock').eq('is_low_stock', true),
      ])

      return {
        totalItems: items.count ?? 0,
        totalWarehouses: warehouses.count ?? 0,
        lowStockItems: ledger.data?.length ?? 0,
      } as DashboardStats
    },
    refetchInterval: 30000,
  })

  const chartQuery = useQuery({
    queryKey: ['dashboard_chart', datePreset, customStartDate, customEndDate],
    queryFn: async () => {
      const fromIso = startOfDay(from).toISOString()
      const toIso = endOfDay(to).toISOString()

      const [si, so] = await Promise.all([
        supabase.from('stock_in').select('quantity, date').gte('date', fromIso).lte('date', toIso),
        supabase.from('stock_out').select('quantity, date').gte('date', fromIso).lte('date', toIso),
      ])

      const aggregated: Record<string, { masuk: number, keluar: number }> = {}
      let current = new Date(from)
      const end = new Date(to)
      while (current <= end) {
        const d = current.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
        aggregated[d] = { masuk: 0, keluar: 0 }
        current.setDate(current.getDate() + 1)
      }

      si.data?.forEach(item => {
        const d = new Date(item.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
        if (aggregated[d]) aggregated[d].masuk += item.quantity
      })

      so.data?.forEach(item => {
        const d = new Date(item.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
        if (aggregated[d]) aggregated[d].keluar += item.quantity
      })

      return Object.entries(aggregated).map(([date, vals]) => ({
        date: formatDate(date),
        ...vals
      }))
    }
  })

  const recentQuery = useQuery({
    queryKey: ['dashboard_recent'],
    queryFn: async () => {
      const [siData, soData] = await Promise.all([
        supabase
          .from('stock_in')
          .select('id, quantity, date, item:items(name), warehouse:warehouses(name)')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('stock_out')
          .select('id, quantity, date, item:items(name), warehouse:warehouses(name)')
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      const inItems: RecentTransaction[] = (siData.data ?? []).map((r: any) => ({
        id: r.id,
        type: 'in',
        item_name: r.item?.name ?? '—',
        warehouse_name: r.warehouse?.name ?? '—',
        quantity: r.quantity,
        date: r.date,
      }))

      const outItems: RecentTransaction[] = (soData.data ?? []).map((r: any) => ({
        id: r.id,
        type: 'out',
        item_name: r.item?.name ?? '—',
        warehouse_name: r.warehouse?.name ?? '—',
        quantity: r.quantity,
        date: r.date,
      }))

      return [...inItems, ...outItems]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 8)
    },
  })

  return {
    state: {
      datePreset,
      customStartDate,
      customEndDate,
    },
    handlers: {
      setDatePreset,
      setCustomStartDate,
      setCustomEndDate,
    },
    queries: {
      stats: statsQuery,
      chart: chartQuery,
      recent: recentQuery,
    }
  }
}
