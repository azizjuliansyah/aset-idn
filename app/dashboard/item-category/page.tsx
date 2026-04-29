import type { Metadata } from 'next'
import { ItemCategoryClient } from '@/components/warehouse-app/item-category/item-category-client'

export const metadata: Metadata = { title: 'Kategori Barang — Gudang IDN' }

import { PageWrapper } from '@/components/shared/page-wrapper'

export default function ItemCategoryPage() {
  return (
    <PageWrapper
      title="Kategori Barang"
      description="Kelola kelompok jenis barang"
    >
      <ItemCategoryClient />
    </PageWrapper>
  )
}
