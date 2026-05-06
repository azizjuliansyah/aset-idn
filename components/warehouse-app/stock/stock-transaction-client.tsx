'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Eye, MoreHorizontal } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'

import { DataTable } from '@/components/shared/data-table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDateTime } from '@/lib/utils'

import { useStockTransactions, type StockInWithJoins } from '@/hooks/stock/use-stock-transactions'
import { StockTransactionFilter } from './sub-components/stock-transaction-filter'
import { StockTransactionDialogs } from './sub-components/stock-transaction-dialogs'

interface StockClientProps {
  type: 'in' | 'out'
}

export function StockTransactionClient({ type }: StockClientProps) {
  const label = type === 'in' ? 'Barang Masuk' : 'Barang Keluar'
  
  // Custom Hook for State & Data
  const {
    page, setPage,
    search, setSearch,
    warehouseId, setWarehouseId,
    categoryId, setCategoryId,
    datePreset, setDatePreset,
    customStartDate, setCustomStartDate,
    customEndDate, setCustomEndDate,
    data, isLoading, pageSize,
    deleteMutation, bulkDeleteMutation
  } = useStockTransactions(type)

  const debouncedSearch = useDebounce(search, 400)

  // Dialog States
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<StockInWithJoins | null>(null)
  const [deleteItem, setDeleteItem] = useState<StockInWithJoins | null>(null)
  const [viewItem, setViewItem] = useState<StockInWithJoins | null>(null)

  const openCreate = () => {
    setEditItem(null)
    setDialogOpen(true)
  }

  const openEdit = (item: StockInWithJoins) => {
    setEditItem(item)
    setDialogOpen(true)
  }

  return (
    <>
      <DataTable
        columns={[
          { key: 'item', header: 'Barang', render: (_, row) => row.item?.name ?? '—' },
          { key: 'category', header: 'Kategori', render: (_, row) => row.item?.item_category?.name ?? '—' },
          { key: 'warehouse', header: 'Gudang', render: (_, row) => row.warehouse?.name ?? '—' },
          { key: 'quantity', header: 'Jumlah',
            render: (v) => (
              <span className={`font-semibold ${type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                {type === 'in' ? '+' : '-'}{v as number}
              </span>
            ),
          },
          { key: 'creator', header: 'PIC', render: (_, row) => row.creator?.full_name ?? '—' },
          { key: 'date', header: 'Tanggal', render: (v) => formatDateTime(v as string) },
          {
            key: 'actions', header: '', className: 'w-16 text-right',
            render: (_, row) => (
              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger 
                    render={<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" />}
                  >
                    <MoreHorizontal size={16} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setViewItem(row)}>
                      <Eye size={14} className="mr-2 text-muted-foreground" /> Detail Transaksi
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openEdit(row)}>
                      <Pencil size={14} className="mr-2 text-muted-foreground" /> Edit Transaksi
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setDeleteItem(row)} className="text-destructive focus:text-destructive focus:bg-red-50">
                      <Trash2 size={14} className="mr-2" /> Hapus Transaksi
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ),
          },
        ]}
        data={data?.data ?? []}
        isLoading={isLoading}
        page={page}
        pageSize={pageSize}
        totalCount={data?.count ?? 0}
        onPageChange={setPage}
        onBulkDelete={(ids) => bulkDeleteMutation.mutate(ids)}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1) }}
        searchPlaceholder="Cari barang..."
        filters={
          <StockTransactionFilter 
            warehouseId={warehouseId} setWarehouseId={(v) => { setWarehouseId(v); setPage(1) }}
            categoryId={categoryId} setCategoryId={(v) => { setCategoryId(v); setPage(1) }}
            datePreset={datePreset} setDatePreset={(v) => { setDatePreset(v); setPage(1) }}
            customStartDate={customStartDate} setCustomStartDate={(v) => { setCustomStartDate(v); setPage(1) }}
            customEndDate={customEndDate} setCustomEndDate={(v) => { setCustomEndDate(v); setPage(1) }}
          />
        }
        actions={
          <Button size="sm" onClick={openCreate} className={type === 'in' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}>
            <Plus size={14} className="mr-1.5" /> Tambah
          </Button>
        }
        emptyText={`Belum ada ${label.toLowerCase()}`}
      />

      <StockTransactionDialogs 
        type={type}
        editItem={editItem}
        viewItem={viewItem}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCloseView={() => setViewItem(null)}
      />

      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={(o) => !o && setDeleteItem(null)}
        description={`Hapus transaksi ini?`}
        onConfirm={() => deleteMutation.mutate(deleteItem!.id, { onSuccess: () => setDeleteItem(null) })}
        loading={deleteMutation.isPending}
      />
    </>
  )
}
