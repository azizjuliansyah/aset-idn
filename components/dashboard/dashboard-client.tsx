'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { StockChart } from './stock-chart'
import { StatCards } from './sub-components/stat-cards'
import { RecentTransactions } from './sub-components/recent-transactions'
import { DashboardDateRange } from './sub-components/dashboard-date-range'
import { useDashboardData } from '@/hooks/dashboard/use-dashboard-data'

export function DashboardClient() {
  const [mounted, setMounted] = useState(false)
  const { state, handlers, queries } = useDashboardData()

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="space-y-6">
      <StatCards 
        stats={queries.stats.data} 
        isLoading={queries.stats.isLoading} 
      />

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card/30 p-4 rounded-2xl border border-border/50">
          <div className="flex items-center gap-2 px-2">
            <div className="w-2 h-8 bg-red-600 rounded-full" />
            <h2 className="text-lg font-bold">Analisis Stok</h2>
          </div>
          
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <DashboardDateRange 
              datePreset={state.datePreset}
              setDatePreset={handlers.setDatePreset}
              customStartDate={state.customStartDate}
              setCustomStartDate={handlers.setCustomStartDate}
              customEndDate={state.customEndDate}
              setCustomEndDate={handlers.setCustomEndDate}
            />
          </div>
        </div>

        {queries.chart.isLoading ? (
          <Card className="w-full h-[450px] flex items-center justify-center bg-card/50 backdrop-blur-sm border-none shadow-xl">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-red-600/20 border-t-red-600 rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground font-medium">Memuat data analisis...</p>
            </div>
          </Card>
        ) : (
          <StockChart data={queries.chart.data ?? []} />
        )}
      </div>

      <RecentTransactions 
        transactions={queries.recent.data} 
        mounted={mounted} 
      />
    </div>
  )
}
