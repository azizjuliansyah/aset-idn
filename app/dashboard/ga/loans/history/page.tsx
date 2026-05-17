import type { Metadata } from 'next'
import { GaLoansClient } from '@/components/warehouse-app/loans/ga-loans-client'
import { PageWrapper } from '@/components/shared/page-wrapper'

export const metadata: Metadata = { title: 'Kelola Peminjaman — Gudang IDN' }

export default function GaLoanHistoryPage() {
  return (
    <PageWrapper
      title="Kelola Peminjaman"
      description="Daftar seluruh peminjaman yang telah ditangani (Ditolak, Kembali, Dibatalkan)"
    >
      <GaLoansClient mode="history" />
    </PageWrapper>
  )
}
