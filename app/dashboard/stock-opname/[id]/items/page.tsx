import { Metadata } from 'next'
import { Suspense } from 'react'
import { PageWrapper } from '@/components/shared/page-wrapper'
import { StockOpnameDetailClient, StockOpnameDetailSkeleton } from '@/components/warehouse-app/stock/stock-opname-detail-client'

export const metadata: Metadata = {
  title: 'Daftar Barang Opname | Gudang IDN',
}

export default async function StockOpnameDetailItemsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  return (
    <PageWrapper title="Daftar Barang Opname">
      <Suspense fallback={<StockOpnameDetailSkeleton />}>
        <StockOpnameDetailClient id={id} />
      </Suspense>
    </PageWrapper>
  )
}
