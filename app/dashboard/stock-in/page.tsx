import type { Metadata } from 'next'
import { StockTransactionClient } from '@/components/warehouse-app/stock/stock-transaction-client'

export const metadata: Metadata = { title: 'Barang Masuk — Gudang IDN' }

import { PageWrapper } from '@/components/shared/page-wrapper'

export default function StockInPage() {
  return (
    <PageWrapper
      title="Barang Masuk"
      description="Catat penerimaan barang ke gudang"
    >
      <StockTransactionClient type="in" />
    </PageWrapper>
  )
}
