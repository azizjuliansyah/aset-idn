import type { Metadata } from 'next'
import { StockLedgerClient } from '@/components/warehouse-app/stock/stock-ledger-client'

export const metadata: Metadata = { title: 'Stok Ledger — Gudang IDN' }

import { PageWrapper } from '@/components/shared/page-wrapper'

export default function StockLedgerPage() {
  return (
    <PageWrapper
      title="Stok Ledger"
      description="Laporan stok aktual per barang per gudang"
    >
      <StockLedgerClient />
    </PageWrapper>
  )
}
