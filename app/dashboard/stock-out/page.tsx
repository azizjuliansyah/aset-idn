import type { Metadata } from 'next'
import { StockTransactionClient } from '@/components/warehouse-app/stock/stock-transaction-client'

export const metadata: Metadata = { title: 'Barang Keluar — Gudang IDN' }

import { PageWrapper } from '@/components/shared/page-wrapper'

export default function StockOutPage() {
  return (
    <PageWrapper
      title="Barang Keluar"
      description="Catat pengeluaran barang dari gudang"
    >
      <StockTransactionClient type="out" />
    </PageWrapper>
  )
}
