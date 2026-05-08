import type { Metadata } from 'next'
import { UserLoansClient } from '@/components/warehouse-app/loans/user-loans-client'
import { PageWrapper } from '@/components/shared/page-wrapper'

export const metadata: Metadata = {
  title: 'Kelola Pinjam | Gudang IDN',
  description: 'Lihat kelola peminjaman barang Anda',
}

export default function LoanHistoryPage() {
  return (
    <PageWrapper
      title="Kelola Peminjaman"
      description="Daftar seluruh kelola peminjaman barang yang pernah Anda lakukan"
    >
      <UserLoansClient isHistory={true} />
    </PageWrapper>
  )
}
