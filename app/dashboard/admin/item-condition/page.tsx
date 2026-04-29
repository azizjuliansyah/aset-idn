import type { Metadata } from 'next'
import { ItemConditionClient } from '@/components/admin/item-condition/item-condition-client'

export const metadata: Metadata = { title: 'Kondisi Barang — Gudang IDN' }

import { PageWrapper } from '@/components/shared/page-wrapper'

export default function ItemConditionPage() {
  return (
    <PageWrapper
      title="Kondisi Barang"
      description="Kelola kondisi fisik barang di gudang"
    >
      <ItemConditionClient />
    </PageWrapper>
  )
}
