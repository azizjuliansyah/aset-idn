import type { Metadata } from 'next'
import { StockOpnameDiffCategoryClient } from '@/components/admin/stock-opname-diff-category/stock-opname-diff-category-client'
import { PageWrapper } from '@/components/shared/page-wrapper'

export const metadata: Metadata = { title: 'Kategori Selisih Opname — Gudang IDN' }

export default function StockOpnameDiffCategoryPage() {
  return (
    <PageWrapper
      title="Kategori Selisih Opname"
      description="Kelola kategori alasan selisih stock opname (master data)"
    >
      <StockOpnameDiffCategoryClient />
    </PageWrapper>
  )
}
