import type { Metadata } from 'next'
import { Suspense } from 'react'
import { StockTransferClient } from '@/components/warehouse-app/stock/stock-transfer-client'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { PageWrapper } from '@/components/shared/page-wrapper'

export const metadata: Metadata = { title: 'Pindah Barang — Gudang IDN' }

export default function StockTransferPage() {
  return (
    <PageWrapper
      title="Pindah Barang"
      description="Manajemen perpindahan barang antar gudang"
    >
      <Suspense fallback={<LoadingSpinner />}>
        <StockTransferClient />
      </Suspense>
    </PageWrapper>
  )
}
