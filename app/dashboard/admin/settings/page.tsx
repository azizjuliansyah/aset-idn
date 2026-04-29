import type { Metadata } from 'next'
import { SettingsClient } from '@/components/admin/settings/settings-client'

export const metadata: Metadata = { title: 'Pengaturan — Gudang IDN' }

import { PageWrapper } from '@/components/shared/page-wrapper'

export default function SettingsPage() {
  return (
    <PageWrapper
      title="Pengaturan"
      description="Konfigurasi umum perusahaan"
    >
      <SettingsClient />
    </PageWrapper>
  )
}
