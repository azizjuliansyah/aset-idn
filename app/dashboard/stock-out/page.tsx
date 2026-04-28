import type { Metadata } from 'next'
import { StockTransactionClient } from '@/components/warehouse-app/stock/stock-transaction-client'

export const metadata: Metadata = { title: 'Barang Keluar — Gudang IDN' }

export default function StockOutPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Barang Keluar</h1>
        <p className="text-muted-foreground text-sm mt-1">Catat pengeluaran barang dari gudang</p>
      </div>
      <StockTransactionClient type="out" />
    </div>
  )
}
