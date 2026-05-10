import type { Metadata } from 'next'
import { WhatsappSettings } from '@/components/admin/settings/whatsapp-settings'
import { PageWrapper } from '@/components/shared/page-wrapper'

export const metadata: Metadata = { title: 'Pengaturan WhatsApp — Gudang IDN' }

export default function WhatsappSettingsPage() {
  return (
    <PageWrapper
      title="Pengaturan WhatsApp"
      description="Konfigurasi pengingat dan template pesan WhatsApp"
      wrapWithCard={false}
    >
      <WhatsappSettings />
    </PageWrapper>
  )
}
