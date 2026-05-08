import type { Metadata } from 'next'
import { GaLoansClient } from '@/components/warehouse-app/loans/ga-loans-client'
import { PageWrapper } from '@/components/shared/page-wrapper'

export const metadata: Metadata = {
  title: 'Pengajuan Peminjaman — Gudang IDN',
  description: 'Review dan setujui request peminjaman barang',
}

export default function GaLoansPage() {
  return (
    <PageWrapper
      title="Pengajuan Peminjaman"
      description="Review, setujui, atau tolak request peminjaman barang dari user"
    >
      <GaLoansClient isHistory={false} />
    </PageWrapper>
  )
}
