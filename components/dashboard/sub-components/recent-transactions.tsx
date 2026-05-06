import { Activity, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'
import type { RecentTransaction } from '@/hooks/dashboard/use-dashboard-data'

interface RecentTransactionsProps {
  transactions: RecentTransaction[] | undefined
  mounted: boolean
}

export function RecentTransactions({ transactions, mounted }: RecentTransactionsProps) {
  return (
    <Card className='py-6'>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-primary" />
          <CardTitle className="text-base">Transaksi Terbaru</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {!transactions || transactions.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">Belum ada transaksi</p>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
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
  )
}
