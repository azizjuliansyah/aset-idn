'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDebounce } from '@/hooks/use-debounce'
import { createClient } from '@/lib/supabase/client'
import type { StockLedger, Warehouse, ItemCategory } from '@/types/database'
import { DataTable } from '@/components/shared/data-table'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, cn } from '@/lib/utils'
import { AlertTriangle } from 'lucide-react'

const PAGE_SIZE = 10

export function StockLedgerClient() {
  const supabase = createClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [warehouseId, setWarehouseId] = useState<string>('all')
  const [categoryId, setCategoryId] = useState<string>('all')
  const [stockStatus, setStockStatus] = useState<string>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['stock_ledger', page, debouncedSearch, warehouseId, categoryId, stockStatus],
    queryFn: async () => {
      let q = supabase
        .from('stock_ledger')
        .select('*', { count: 'exact' })
        .order('item_name', { ascending: true })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

      if (warehouseId !== 'all') {
        q = q.eq('warehouse_id', warehouseId)
      }

      if (categoryId !== 'all') {
        const cat = categories?.find(c => c.id === categoryId)
        if (cat) q = q.eq('category_name', cat.name)
      }

      if (stockStatus !== 'all') {
        if (stockStatus === 'above_min') {
          q = q.eq('is_low_stock', false).gt('current_stock', 0)
        } else if (stockStatus === 'below_min') {
          q = q.eq('is_low_stock', true).gt('current_stock', 0)
        } else if (stockStatus === 'out_of_stock') {
          q = q.eq('current_stock', 0)
        }
      }

      if (debouncedSearch) {
        q = q.or(`item_name.ilike.%${debouncedSearch}%,warehouse_name.ilike.%${debouncedSearch}%`)
      }

      const { data, count, error } = await q
      if (error) throw error
      return { data: (data ?? []) as StockLedger[], count: count ?? 0 }
    },
  })

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses_all'],
    queryFn: async () => {
      const { data } = await supabase.from('warehouses').select('id, name').order('name')
      return (data ?? []) as Warehouse[]
    },
  })

  const { data: categories } = useQuery({
    queryKey: ['item_category_all'],
    queryFn: async () => {
      const { data } = await supabase.from('item_category').select('id, name').order('name')
      return (data ?? []) as ItemCategory[]
    },
  })

  const filterBar = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gudang</Label>
        <Select 
          value={warehouseId} 
          onValueChange={(v) => { setWarehouseId(v); setPage(1) }}
          items={[
            { value: 'all', label: 'Semua Gudang' },
            ...(warehouses?.map((w) => ({ value: w.id, label: w.name })) ?? [])
          ]}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Semua Gudang" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Gudang</SelectItem>
            {warehouses?.map((w) => (
              <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kategori</Label>
        <Select 
          value={categoryId} 
          onValueChange={(v) => { setCategoryId(v); setPage(1) }}
          items={[
            { value: 'all', label: 'Semua Kategori' },
            ...(categories?.map((c) => ({ value: c.id, label: c.name })) ?? [])
          ]}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Semua Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {categories?.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status Stok</Label>
        <Select 
          value={stockStatus} 
          onValueChange={(v) => { setStockStatus(v); setPage(1) }}
          items={[
            { value: 'all', label: 'Semua Status' },
            { value: 'above_min', label: 'Di Atas Batas Minimum' },
            { value: 'below_min', label: 'Di Bawah Batas Minimum' },
            { value: 'out_of_stock', label: 'Tidak Tersedia' },
          ]}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="above_min">Di Atas Batas Minimum</SelectItem>
            <SelectItem value="below_min">Di Bawah Batas Minimum</SelectItem>
            <SelectItem value="out_of_stock">Tidak Tersedia</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )

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
      filters={filterBar}
      emptyText="Belum ada data stok"
    />
  )
}
