import type { Metadata } from 'next'
import { UserLoansClient } from '@/components/warehouse-app/loans/user-loans-client'
import { PageWrapper } from '@/components/shared/page-wrapper'

export const metadata: Metadata = {
  title: 'Riwayat Pinjam | Gudang IDN',
  description: 'Lihat riwayat peminjaman barang Anda',
}

export default function LoanHistoryPage() {
  return (
    <PageWrapper
      title="Riwayat Peminjaman"
      description="Daftar seluruh riwayat peminjaman barang yang pernah Anda lakukan"
    >
      <UserLoansClient isHistory={true} />
    </PageWrapper>
  )
}
