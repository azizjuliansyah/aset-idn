import type { Metadata } from 'next'
import { StockLedgerClient } from '@/components/warehouse-app/stock/stock-ledger-client'

export const metadata: Metadata = { title: 'Stok Ledger — Gudang IDN' }

export default function StockLedgerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Stok Ledger</h1>
        <p className="text-muted-foreground text-sm mt-1">Laporan stok aktual per barang per gudang</p>
      </div>
      <StockLedgerClient />
    </div>
  )
}
