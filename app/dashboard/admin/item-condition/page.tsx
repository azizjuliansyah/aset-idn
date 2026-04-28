import type { Metadata } from 'next'
import { ItemConditionClient } from '@/components/admin/item-condition/item-condition-client'

export const metadata: Metadata = { title: 'Kondisi Barang — Gudang IDN' }

export default function ItemConditionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Kondisi Barang</h1>
        <p className="text-muted-foreground text-sm mt-1">Kelola kondisi fisik barang di gudang</p>
      </div>
      <ItemConditionClient />
    </div>
  )
}
