import { Package, Warehouse, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { DashboardStats } from '@/hooks/dashboard/use-dashboard-data'

interface StatCardsProps {
  stats: Partial<DashboardStats> | undefined
  isLoading: boolean
}

export function StatCards({ stats, isLoading }: StatCardsProps) {
  const cards = [
    { label: 'Total Barang', value: stats?.totalItems ?? 0, icon: Package, color: 'text-red-600', bg: 'bg-red-600/10' },
    { label: 'Total Gudang', value: stats?.totalWarehouses ?? 0, icon: Warehouse, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: 'Stok Rendah', value: stats?.lowStockItems ?? 0, icon: AlertTriangle, color: 'text-red-700', bg: 'bg-red-700/10' },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.label} className="relative overflow-hidden border-none shadow-lg bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">{card.label}</p>
                  {isLoading ? (
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
  )
}
