'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDebounce } from '@/hooks/use-debounce'
import { createClient } from '@/lib/supabase/client'
import type { StockLedger } from '@/types/database'
import { DataTable } from '@/components/shared/data-table'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { AlertTriangle } from 'lucide-react'

const PAGE_SIZE = 10

export function StockLedgerClient() {
  const supabase = createClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)

  const { data, isLoading } = useQuery({
    queryKey: ['stock_ledger', page, debouncedSearch],
    queryFn: async () => {
      let q = supabase
        .from('stock_ledger')
        .select('*', { count: 'exact' })
        .order('item_name', { ascending: true })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

      if (debouncedSearch) {
        q = q.or(`item_name.ilike.%${debouncedSearch}%,warehouse_name.ilike.%${debouncedSearch}%`)
      }

      const { data, count, error } = await q
      if (error) throw error
      return { data: (data ?? []) as StockLedger[], count: count ?? 0 }
    },
  })

  return (
    <DataTable<StockLedger>
      columns={[
        { key: 'item_name', header: 'Barang' },
        { key: 'category_name', header: 'Kategori', render: (v) => (v as string) ?? '—' },
        { key: 'warehouse_name', header: 'Gudang' },
        {
          key: 'total_in', header: 'Masuk',
          render: (v) => <span className="text-green-600 font-semibold">+{v as number}</span>,
        },
        {
          key: 'total_out', header: 'Keluar',
          render: (v) => <span className="text-red-600 font-semibold">-{v as number}</span>,
        },
        {
          key: 'current_stock', header: 'Stok Saat Ini',
          render: (v, row) => (
            <div className="flex items-center gap-1.5">
              <span className={`font-bold ${(v as number) <= row.minimum_stock ? 'text-red-600' : 'text-foreground'}`}>
                {v as number}
              </span>
              {(v as number) <= row.minimum_stock && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-0.5">
                  <AlertTriangle size={9} />
                  Rendah
                </Badge>
              )}
            </div>
          ),
        },
        { key: 'minimum_stock', header: 'Min. Stok' },
        { key: 'price', header: 'Harga', render: (v) => formatCurrency(v as number) },
      ]}
      data={data?.data ?? []}
      isLoading={isLoading}
      page={page}
      pageSize={PAGE_SIZE}
      totalCount={data?.count ?? 0}
      onPageChange={setPage}
      searchValue={search}
      onSearchChange={(v) => { setSearch(v); setPage(1) }}
      searchPlaceholder="Cari barang atau gudang..."
      emptyText="Belum ada data stok"
    />
  )
}
