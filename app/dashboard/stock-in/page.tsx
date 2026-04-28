import type { Metadata } from 'next'
import { StockTransactionClient } from '@/components/warehouse-app/stock/stock-transaction-client'

export const metadata: Metadata = { title: 'Barang Masuk — Gudang IDN' }

export default function StockInPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Barang Masuk</h1>
        <p className="text-muted-foreground text-sm mt-1">Catat penerimaan barang ke gudang</p>
      </div>
      <StockTransactionClient type="in" />
    </div>
  )
}
