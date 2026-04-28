import type { Metadata } from 'next'
import { DashboardClient } from '@/components/dashboard/dashboard-client'

export const metadata: Metadata = { title: 'Dashboard — Gudang IDN' }

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Ringkasan aktivitas gudang</p>
      </div>
      <DashboardClient />
    </div>
  )
}
