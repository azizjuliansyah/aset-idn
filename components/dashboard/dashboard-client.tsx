'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import {
  Package, Warehouse, ArrowDownToLine, ArrowUpFromLine,
  AlertTriangle, TrendingUp, TrendingDown, Activity,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'

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

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard_stats'],
    queryFn: async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const [items, warehouses, stockIn, stockOut, ledger] = await Promise.all([
        supabase.from('items').select('id', { count: 'exact', head: true }),
        supabase.from('warehouses').select('id', { count: 'exact', head: true }),
        supabase.from('stock_in').select('id', { count: 'exact', head: true }).gte('date', today.toISOString()),
        supabase.from('stock_out').select('id', { count: 'exact', head: true }).gte('date', today.toISOString()),
        supabase.from('stock_ledger').select('is_low_stock').eq('is_low_stock', true),
      ])

      return {
        totalItems: items.count ?? 0,
        totalWarehouses: warehouses.count ?? 0,
        stockInToday: stockIn.count ?? 0,
        stockOutToday: stockOut.count ?? 0,
        lowStockItems: ledger.data?.length ?? 0,
      } as DashboardStats
    },
    refetchInterval: 30000,
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
    { label: 'Total Barang', value: stats?.totalItems ?? 0, icon: Package, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Total Gudang', value: stats?.totalWarehouses ?? 0, icon: Warehouse, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Masuk Hari Ini', value: stats?.stockInToday ?? 0, icon: ArrowDownToLine, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Keluar Hari Ini', value: stats?.stockOutToday ?? 0, icon: ArrowUpFromLine, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { label: 'Stok Rendah', value: stats?.lowStockItems ?? 0, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
  ]

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label} className="relative overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{card.label}</p>
                    {statsLoading ? (
                      <div className="h-8 w-12 bg-muted animate-pulse rounded mt-1" />
                    ) : (
                      <p className="text-3xl font-bold text-foreground mt-1">{card.value}</p>
                    )}
                  </div>
                  <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                    <Icon size={18} className={card.color} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
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
