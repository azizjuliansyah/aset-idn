import type { Metadata } from 'next'
import { WarehouseClient } from '@/components/warehouse-app/warehouse/warehouse-client'

export const metadata: Metadata = { title: 'Gudang — Gudang IDN' }

import { PageWrapper } from '@/components/shared/page-wrapper'

export default function WarehousePage() {
  return (
    <PageWrapper
      title="Gudang"
      description="Kelola lokasi penyimpanan barang"
    >
      <WarehouseClient />
    </PageWrapper>
  )
}
