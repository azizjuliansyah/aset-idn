import { Metadata } from 'next'
import { Suspense } from 'react'
import { PageWrapper } from '@/components/shared/page-wrapper'
import { StockOpnameWarehouseGateClient } from '@/components/warehouse-app/stock/stock-opname-warehouse-gate-client'
import { StockOpnameDetailSkeleton } from '@/components/warehouse-app/stock/stock-opname-detail-client'

export const metadata: Metadata = {
  title: 'Pilih Gudang Opname | Gudang IDN',
}

export default async function StockOpnameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  return (
    <PageWrapper title="Pilih Gudang Opname">
      <Suspense fallback={<StockOpnameDetailSkeleton />}>
        <StockOpnameWarehouseGateClient id={id} />
      </Suspense>
    </PageWrapper>
  )
}

