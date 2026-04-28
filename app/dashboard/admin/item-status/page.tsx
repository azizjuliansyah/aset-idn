import type { Metadata } from 'next'
import { ItemStatusClient } from '@/components/admin/item-status/item-status-client'

export const metadata: Metadata = { title: 'Status Barang — Gudang IDN' }

export default function ItemStatusPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Status Barang</h1>
        <p className="text-muted-foreground text-sm mt-1">Kelola status kondisi barang di gudang</p>
      </div>
      <ItemStatusClient />
    </div>
  )
}
