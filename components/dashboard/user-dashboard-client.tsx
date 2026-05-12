'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserStatCards } from './sub-components/user-stat-cards'
import { UserRecentLoans } from './sub-components/user-recent-loans'
import { useUserDashboardData } from '@/hooks/dashboard/use-user-dashboard-data'
import { LoanRequestDialog } from '@/components/warehouse-app/loans/loan-request-dialog'
import { LoanDetailModal } from '@/components/warehouse-app/loans/loan-detail-modal'
import type { LoanWithJoins } from '@/types/database'

export function UserDashboardClient() {
  const { queries } = useUserDashboardData()
  const [requestOpen, setRequestOpen] = useState(false)
  const [detailLoan, setDetailLoan] = useState<LoanWithJoins | null>(null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight">Selamat Datang!</h2>
          <p className="text-muted-foreground text-sm">Berikut adalah ringkasan aktivitas peminjaman Anda.</p>
        </div>
        <Button onClick={() => setRequestOpen(true)} className="gap-2">
          <Plus size={16} /> Pinjam Barang
        </Button>
      </div>

      <UserStatCards 
        stats={queries.stats.data} 
        isLoading={queries.stats.isLoading} 
      />

      <UserRecentLoans 
        loans={queries.recent.data} 
        onViewDetail={setDetailLoan}
      />

      <LoanRequestDialog 
        open={requestOpen} 
        onOpenChange={setRequestOpen} 
      />

      <LoanDetailModal 
        loan={detailLoan} 
        open={!!detailLoan} 
        onOpenChange={(o) => !o && setDetailLoan(null)} 
      />
    </div>
  )
}
