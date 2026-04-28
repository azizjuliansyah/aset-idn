import type { Metadata } from 'next'
import { ItemCategoryClient } from '@/components/warehouse-app/item-category/item-category-client'

export const metadata: Metadata = { title: 'Kategori Barang — Gudang IDN' }

export default function ItemCategoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Kategori Barang</h1>
        <p className="text-muted-foreground text-sm mt-1">Kelola kelompok jenis barang</p>
      </div>
      <ItemCategoryClient />
    </div>
  )
}
