import type { Metadata } from 'next'
import { ItemsClient } from '@/components/warehouse-app/items/items-client'

export const metadata: Metadata = { title: 'Barang — Gudang IDN' }

export default function ItemsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Barang</h1>
        <p className="text-muted-foreground text-sm mt-1">Kelola master data barang</p>
      </div>
      <ItemsClient />
    </div>
  )
}
