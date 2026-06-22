'use client'

import { useState } from 'react'
import { Plus, Repeat, Eye } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'

import { DataTable } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/utils'

import { useStockTransfers } from '@/hooks/stock/use-stock-transfers'
import { StockTransferDialog } from '@/components/warehouse-app/stock/sub-components/stock-transfer-dialog'
import { StockTransferDetailDialog } from '@/components/warehouse-app/stock/sub-components/stock-transfer-detail-dialog'
import { StockListFilter } from '@/components/warehouse-app/stock/sub-components/stock-list-filter'

export function StockTransferClient() {
  const {
    page, setPage,
    search, setSearch,
    fromWarehouseId, setFromWarehouseId,
    toWarehouseId, setToWarehouseId,
    categoryId, setCategoryId,
    dateRange, setDateRange,
    data, isLoading, pageSize, setPageSize,
  } = useStockTransfers()

  const [datePreset, setDatePreset] = useState('all')

  const debouncedSearch = useDebounce(search, 400)

  // Dialog States
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewItem, setViewItem] = useState<any>(null)

  return (
    <>
      <DataTable
        columns={[
          { key: 'item', header: 'Barang', render: (_, row) => row.item?.name ?? '—' },
          { key: 'from', header: 'Dari Gudang', render: (_, row) => row.from?.name ?? '—' },
          { key: 'to', header: 'Ke Gudang', render: (_, row) => row.to?.name ?? '—' },
          { key: 'quantity', header: 'Jumlah', 
            render: (v) => <span className="font-semibold text-blue-600">{v as number} pcs</span> 
          },
          { key: 'creator', header: 'PIC', render: (_, row) => row.creator?.full_name ?? '—' },
          { key: 'date', header: 'Tanggal', render: (v) => formatDateTime(v as string) },
          {
            key: 'actions', header: '', className: 'w-16 text-right',
            render: (_, row) => (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setViewItem(row)}>
                <Eye size={16} />
              </Button>
            ),
          },
        ]}
        data={data?.data ?? []}
        isLoading={isLoading}
        page={page}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        totalCount={data?.count ?? 0}
        onPageChange={setPage}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1) }}
        searchPlaceholder="Cari barang..."
        filters={
          <StockListFilter 
            fromWarehouseId={fromWarehouseId}
            setFromWarehouseId={(v) => { setFromWarehouseId(v); setPage(1) }}
            toWarehouseId={toWarehouseId}
            setToWarehouseId={(v) => { setToWarehouseId(v); setPage(1) }}
            categoryId={categoryId}
            setCategoryId={(v) => { setCategoryId(v); setPage(1) }}
            dateRange={dateRange}
            setDateRange={(v) => { setDateRange(v); setPage(1) }}
            datePreset={datePreset}
            setDatePreset={setDatePreset}
          />
        }
        actions={
          <Button size="sm" onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-medium">
            <Repeat size={14} className="mr-1.5" /> Pindah Barang
          </Button>
        }
        emptyText="Belum ada riwayat perpindahan barang"
      />

      <StockTransferDialog 
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
      
      <StockTransferDetailDialog 
        transfer={viewItem}
        onOpenChange={(open) => !open && setViewItem(null)}
      />
    </>
  )
}
