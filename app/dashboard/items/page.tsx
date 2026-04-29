import type { Metadata } from 'next'
import { ItemsClient } from '@/components/warehouse-app/items/items-client'

export const metadata: Metadata = { title: 'Barang — Gudang IDN' }

import { PageWrapper } from '@/components/shared/page-wrapper'

export default function ItemsPage() {
  return (
    <PageWrapper
      title="Barang"
      description="Kelola master data barang"
    >
      <ItemsClient />
    </PageWrapper>
  )
}
