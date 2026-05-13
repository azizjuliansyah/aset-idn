import { Metadata } from 'next'
import { PageWrapper } from '@/components/shared/page-wrapper'
import { StockOpnameClient } from '@/components/warehouse-app/stock/stock-opname-client'

export const metadata: Metadata = {
  title: 'Stock Opname | Gudang IDN',
}

export default function StockOpnamePage() {
  return (
    <PageWrapper title="Stock Opname">
      <StockOpnameClient />
    </PageWrapper>
  )
}
