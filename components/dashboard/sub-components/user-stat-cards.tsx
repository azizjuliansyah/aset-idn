import { Clock, Package, History } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { UserDashboardStats } from '@/hooks/dashboard/use-user-dashboard-data'

interface UserStatCardsProps {
  stats: UserDashboardStats | undefined
  isLoading: boolean
}

export function UserStatCards({ stats, isLoading }: UserStatCardsProps) {
  const cards = [
    { 
      label: 'Peminjaman Aktif', 
      value: stats?.activeLoans ?? 0, 
      icon: Clock, 
      color: 'text-amber-600', 
      bg: 'bg-amber-600/10' 
    },
    { 
      label: 'Barang Dipinjam', 
      value: stats?.itemsBorrowed ?? 0, 
      icon: Package, 
      color: 'text-blue-600', 
      bg: 'bg-blue-600/10' 
    },
    { 
      label: 'Total Riwayat', 
      value: stats?.totalHistory ?? 0, 
      icon: History, 
      color: 'text-slate-600', 
      bg: 'bg-slate-600/10' 
    },
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
