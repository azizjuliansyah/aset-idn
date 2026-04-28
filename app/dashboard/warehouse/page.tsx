import type { Metadata } from 'next'
import { WarehouseClient } from '@/components/warehouse-app/warehouse/warehouse-client'

export const metadata: Metadata = { title: 'Gudang — Gudang IDN' }

export default function WarehousePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gudang</h1>
        <p className="text-muted-foreground text-sm mt-1">Kelola lokasi penyimpanan barang</p>
      </div>
      <WarehouseClient />
    </div>
  )
}
