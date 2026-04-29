import type { Metadata } from 'next'
import { ItemStatusClient } from '@/components/admin/item-status/item-status-client'

export const metadata: Metadata = { title: 'Status Barang — Gudang IDN' }

import { PageWrapper } from '@/components/shared/page-wrapper'

export default function ItemStatusPage() {
  return (
    <PageWrapper
      title="Status Barang"
      description="Kelola status kondisi barang di gudang"
    >
      <ItemStatusClient />
    </PageWrapper>
  )
}
