import type { Metadata } from 'next'
import { UsersClient } from '@/components/admin/users/users-client'

export const metadata: Metadata = { title: 'Manajemen User — Gudang IDN' }

import { PageWrapper } from '@/components/shared/page-wrapper'

export default function UsersPage() {
  return (
    <PageWrapper
      title="Manajemen User"
      description="Kelola akun pengguna sistem"
    >
      <UsersClient />
    </PageWrapper>
  )
}
