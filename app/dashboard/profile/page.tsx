import type { Metadata } from 'next'
import { ProfileClient } from '@/components/profile/profile-client'

export const metadata: Metadata = { title: 'Profil Saya — Gudang IDN' }

import { PageWrapper } from '@/components/shared/page-wrapper'

export default function ProfilePage() {
  return (
    <PageWrapper
      title="Profil Saya"
      description="Kelola informasi akun Anda"
      contentClassName="p-0"
      wrapWithCard={false}
    >
      <ProfileClient />
    </PageWrapper>
  )
}
