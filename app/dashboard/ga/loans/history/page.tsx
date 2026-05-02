import type { Metadata } from 'next'
import { GaLoansClient } from '@/components/warehouse-app/loans/ga-loans-client'
import { PageWrapper } from '@/components/shared/page-wrapper'

export const metadata: Metadata = { title: 'Riwayat Peminjaman — Gudang IDN' }

export default function GaLoanHistoryPage() {
  return (
    <PageWrapper
      title="Riwayat Peminjaman"
      description="Daftar seluruh peminjaman yang telah ditangani (Ditolak, Kembali, Dibatalkan)"
    >
      <GaLoansClient isHistory={true} />
    </PageWrapper>
  )
}
