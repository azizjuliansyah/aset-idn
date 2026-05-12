import { ListChecks, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoanStatusBadge } from '@/components/warehouse-app/loans/loan-status-badge'
import { formatDateTime } from '@/lib/utils'
import type { LoanWithJoins } from '@/types/database'

interface UserRecentLoansProps {
  loans: LoanWithJoins[] | undefined
  onViewDetail: (loan: LoanWithJoins) => void
}

export function UserRecentLoans({ loans, onViewDetail }: UserRecentLoansProps) {
  return (
    <Card className='py-6'>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ListChecks size={16} className="text-primary" />
          <CardTitle className="text-base">Peminjaman Terbaru Anda</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {!loans || loans.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">Belum ada peminjaman</p>
        ) : (
          <div className="space-y-2">
            {loans.map((loan) => {
              const firstItem = loan.items?.[0]?.item?.name ?? '—'
              const otherCount = (loan.items?.length ?? 0) - 1
              
              return (
                <div
                  key={loan.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <p className="text-sm font-medium text-foreground">
                        {firstItem} {otherCount > 0 && <span className="text-muted-foreground text-xs font-normal">+{otherCount} lainnya</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(loan.loan_date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <LoanStatusBadge status={loan.status} />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => onViewDetail(loan)}
                    >
                      <Eye size={14} />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
