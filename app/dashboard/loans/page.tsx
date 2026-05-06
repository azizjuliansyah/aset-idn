import type { Metadata } from 'next'
import { UserLoansClient } from '@/components/warehouse-app/loans/user-loans-client'
import { PageWrapper } from '@/components/shared/page-wrapper'

export const metadata: Metadata = {
  title: 'Peminjaman Barang | Gudang IDN',
  description: 'Kelola request peminjaman barang Anda',
}

export default function LoansPage() {
  return (
    <PageWrapper
      title="Peminjaman Barang"
      description="Buat dan pantau request peminjaman barang Anda"
    >
      <UserLoansClient isHistory={false} />
    </PageWrapper>
  )
}
