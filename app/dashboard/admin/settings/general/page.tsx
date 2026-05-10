import type { Metadata } from 'next'
import { GeneralSettings } from '@/components/admin/settings/general-settings'
import { PageWrapper } from '@/components/shared/page-wrapper'

export const metadata: Metadata = { title: 'Informasi Umum — Gudang IDN' }

export default function GeneralSettingsPage() {
  return (
    <PageWrapper
      title="Informasi Umum"
      description="Konfigurasi dasar perusahaan dan logo"
      wrapWithCard={false}
      className="max-w-4xl"
    >
      <GeneralSettings />
    </PageWrapper>
  )
}
