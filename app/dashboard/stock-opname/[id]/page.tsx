import { Metadata } from 'next'
import { PageWrapper } from '@/components/shared/page-wrapper'
import { StockOpnameDetailClient } from '@/components/warehouse-app/stock/stock-opname-detail-client'

export const metadata: Metadata = {
  title: 'Detail Stock Opname | Gudang IDN',
}

export default async function StockOpnameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  return (
    <PageWrapper title="Detail Stock Opname">
      <StockOpnameDetailClient id={id} />
    </PageWrapper>
  )
}
