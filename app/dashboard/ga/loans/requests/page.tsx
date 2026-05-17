import type { Metadata } from 'next'
import { GaLoansClient } from '@/components/warehouse-app/loans/ga-loans-client'
import { PageWrapper } from '@/components/shared/page-wrapper'

export const metadata: Metadata = {
  title: 'Request Peminjaman — Gudang IDN',
  description: 'Review dan setujui request peminjaman barang',
}

export default function GaLoansRequestsPage() {
  return (
    <PageWrapper
      title="Request Peminjaman"
      description="Review, setujui, atau tolak request peminjaman barang dari user"
    >
      <GaLoansClient mode="requests" />
    </PageWrapper>
  )
}
