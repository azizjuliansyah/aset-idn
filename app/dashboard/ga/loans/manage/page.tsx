import type { Metadata } from 'next'
import { GaLoansClient } from '@/components/warehouse-app/loans/ga-loans-client'
import { PageWrapper } from '@/components/shared/page-wrapper'

export const metadata: Metadata = {
  title: 'Kelola Peminjaman — Gudang IDN',
  description: 'Kelola peminjaman barang yang sedang aktif',
}

export default function GaLoansManagePage() {
  return (
    <PageWrapper
      title="Kelola Peminjaman"
      description="Pantau barang yang sedang dipinjam, kirim pengingat, atau tandai sebagai sudah dikembalikan"
    >
      <GaLoansClient mode="manage" />
    </PageWrapper>
  )
}
