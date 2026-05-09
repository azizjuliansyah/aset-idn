import type { Metadata } from 'next'
import { LogsClient } from '@/components/admin/logs/logs-client'
import { PageWrapper } from '@/components/shared/page-wrapper'

export const metadata: Metadata = { title: 'Log Aktivitas — Gudang IDN' }

export default function LogsPage() {
  return (
    <PageWrapper
      title="Log Aktivitas"
      description="Pantau seluruh aktivitas pengguna di dalam aplikasi"
    >
      <LogsClient />
    </PageWrapper>
  )
}
