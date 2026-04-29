'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import {
  Package, Warehouse, ArrowDownToLine, ArrowUpFromLine,
  AlertTriangle, TrendingUp, TrendingDown, Activity,
  Calendar as CalendarIcon, ChevronDown,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatDateTime, formatDate } from '@/lib/utils'
import { StockChart } from './stock-chart'
import { Input } from '@/components/ui/input'
import { subDays, startOfDay, endOfDay } from 'date-fns'

interface DashboardStats {
  totalItems: number
  totalWarehouses: number
  stockInToday: number
  stockOutToday: number
  lowStockItems: number
}

interface RecentTransaction {
  id: string
  type: 'in' | 'out'
  item_name: string
  warehouse_name: string
  quantity: number
  date: string
}

export function DashboardClient() {
  const [mounted, setMounted] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
  }, [])

  const [datePreset, setDatePreset] = useState('7')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  const getDates = () => {
    let from = subDays(new Date(), 7)
    let to = new Date()

    if (datePreset === 'all') {
      from = new Date(2000, 0, 1) // Far past
    } else if (datePreset === 'custom') {
      if (customStartDate) from = startOfDay(new Date(customStartDate))
      if (customEndDate) to = endOfDay(new Date(customEndDate))
    } else {
      from = subDays(new Date(), parseInt(datePreset))
    }
    return { from, to }
  }

  const { from, to } = getDates()

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard_stats'],
    queryFn: async () => {
      const today = startOfDay(new Date())

      const [items, warehouses, ledger] = await Promise.all([
        supabase.from('items').select('id', { count: 'exact', head: true }),
        supabase.from('warehouses').select('id', { count: 'exact', head: true }),
        supabase.from('stock_ledger').select('is_low_stock').eq('is_low_stock', true),
      ])

      return {
        totalItems: items.count ?? 0,
        totalWarehouses: warehouses.count ?? 0,
        lowStockItems: ledger.data?.length ?? 0,
      } as Partial<DashboardStats>
    },
    refetchInterval: 30000,
  })

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ['dashboard_chart', datePreset, customStartDate, customEndDate],
    queryFn: async () => {
      const fromIso = startOfDay(from).toISOString()
      const toIso = endOfDay(to).toISOString()

      const [si, so] = await Promise.all([
        supabase.from('stock_in').select('quantity, date').gte('date', fromIso).lte('date', toIso),
        supabase.from('stock_out').select('quantity, date').gte('date', fromIso).lte('date', toIso),
      ])

      const aggregated: Record<string, { masuk: number, keluar: number }> = {}

      // Fill in all dates in range with 0s
      let current = new Date(from)
      const end = new Date(to)
      while (current <= end) {
        const d = current.toISOString().split('T')[0]
        aggregated[d] = { masuk: 0, keluar: 0 }
        current.setDate(current.getDate() + 1)
      }

      si.data?.forEach(item => {
        const d = item.date.split('T')[0]
        if (aggregated[d]) aggregated[d].masuk += item.quantity
      })

      so.data?.forEach(item => {
        const d = item.date.split('T')[0]
        if (aggregated[d]) aggregated[d].keluar += item.quantity
      })

      return Object.entries(aggregated).map(([date, vals]) => ({
        date: formatDate(date),
        ...vals
      }))
    }
  })

  const { data: recent } = useQuery({
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

  const statCards = [
    { label: 'Total Barang', value: stats?.totalItems ?? 0, icon: Package, color: 'text-red-600', bg: 'bg-red-600/10' },
    { label: 'Total Gudang', value: stats?.totalWarehouses ?? 0, icon: Warehouse, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: 'Stok Rendah', value: stats?.lowStockItems ?? 0, icon: AlertTriangle, color: 'text-red-700', bg: 'bg-red-700/10' },
  ]

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label} className="relative overflow-hidden border-none shadow-lg bg-card/50 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">{card.label}</p>
                    {statsLoading ? (
                      <div className="h-10 w-16 bg-muted animate-pulse rounded" />
                    ) : (
                      <p className="text-4xl font-black text-foreground">{card.value}</p>
                    )}
                  </div>
                  <div className={`w-14 h-14 rounded-2xl ${card.bg} flex items-center justify-center shadow-inner`}>
                    <Icon size={28} className={card.color} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Chart Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card/30 p-4 rounded-2xl border border-border/50">
          <div className="flex items-center gap-2 px-2">
            <div className="w-2 h-8 bg-red-600 rounded-full" />
            <h2 className="text-lg font-bold">Analisis Stok</h2>
          </div>
          
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <Popover>
              <PopoverTrigger render={
                <Button variant="outline" className="h-9 w-64 justify-between font-normal px-3 bg-background/50 backdrop-blur-sm border-border/50">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <CalendarIcon size={14} className="text-muted-foreground shrink-0" />
                    <span className="truncate text-xs font-medium">
                      {datePreset === 'all' ? 'Semua Tanggal' : 
                       datePreset === 'custom' ? (customStartDate && customEndDate ? `${customStartDate} - ${customEndDate}` : 'Custom Tanggal') : 
                       `${datePreset} Hari Terakhir`}
                    </span>
                  </div>
                  <ChevronDown size={14} className="text-muted-foreground shrink-0" />
                </Button>
              } />
              <PopoverContent className="w-64 p-3" align="end">
                <div className="space-y-3">
                  <div className="space-y-2">
                    {[
                      { label: 'Semua Tanggal', value: 'all' },
                      { label: '1 Hari Yang Lalu', value: '1' },
                      { label: '7 Hari Yang Lalu', value: '7' },
                      { label: '14 Hari Yang Lalu', value: '14' },
                      { label: '30 Hari Yang Lalu', value: '30' },
                      { label: '60 Hari Yang Lalu', value: '60' },
                      { label: 'Custom Tanggal', value: 'custom' },
                    ].map((opt) => (
                      <label key={opt.value} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded transition-colors">
                        <input
                          type="radio"
                          name="datePreset"
                          value={opt.value}
                          checked={datePreset === opt.value}
                          onChange={(e) => setDatePreset(e.target.value)}
                          className="w-3.5 h-3.5 text-primary focus:ring-primary border-gray-300"
                        />
                        <span className="text-sm">{opt.label}</span>
                      </label>
                    ))}
                  </div>

                  {datePreset === 'custom' && (
                    <div className="space-y-2 pt-2 border-t">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Mulai Tanggal</Label>
                        <Input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Sampai Tanggal</Label>
                        <Input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {chartLoading ? (
          <Card className="w-full h-[450px] flex items-center justify-center bg-card/50 backdrop-blur-sm border-none shadow-xl">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-red-600/20 border-t-red-600 rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground font-medium">Memuat data analisis...</p>
            </div>
          </Card>
        ) : (
          <StockChart data={chartData ?? []} />
        )}
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-primary" />
            <CardTitle className="text-base">Transaksi Terbaru</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {!recent || recent.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">Belum ada transaksi</p>
          ) : (
            <div className="space-y-2">
              {recent.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      tx.type === 'in' ? 'bg-green-500/15' : 'bg-red-500/15'
                    }`}>
                      {tx.type === 'in'
                        ? <TrendingUp size={14} className="text-green-600" />
                        : <TrendingDown size={14} className="text-red-600" />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{tx.item_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {tx.warehouse_name} · {mounted ? formatDateTime(tx.date) : '...'}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={tx.type === 'in' ? 'default' : 'destructive'}
                    className={`text-xs font-semibold ${tx.type === 'in' ? 'bg-green-600 hover:bg-green-600' : ''}`}
                  >
                    {tx.type === 'in' ? '+' : '-'}{tx.quantity}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
