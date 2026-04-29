import type { Metadata } from 'next'
import { DashboardClient } from '@/components/dashboard/dashboard-client'

export const metadata: Metadata = { title: 'Dashboard — Gudang IDN' }

import { PageWrapper } from '@/components/shared/page-wrapper'

export default function DashboardPage() {
  return (
    <PageWrapper
      title="Dashboard"
      description="Ringkasan aktivitas gudang"
      contentClassName="bg-transparent p-0"
    >
      <DashboardClient />
    </PageWrapper>
  )
}
