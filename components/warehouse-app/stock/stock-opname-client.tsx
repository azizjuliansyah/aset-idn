'use client'

import { useState } from 'react'
import { Plus, Trash2, Eye, MoreHorizontal, ClipboardList } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useDebounce } from '@/hooks/use-debounce'

import { DataTable } from '@/components/shared/data-table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'

import { useStockOpnameGroups, useStockOpnameMutations } from '@/hooks/stock/use-stock-opname'
import { StockOpnameGroupDialog } from '@/components/warehouse-app/stock/sub-components/stock-opname-group-dialog'
import type { StockOpnameGroup } from '@/types/database'
import { StockListFilter } from '@/components/warehouse-app/stock/sub-components/stock-list-filter'

export function StockOpnameClient() {
  const router = useRouter()
  const {
    page, setPage,
    search, setSearch,
    warehouseId, setWarehouseId,
    categoryId, setCategoryId,
    dateRange, setDateRange,
    data, isLoading, pageSize
  } = useStockOpnameGroups()

  const [datePreset, setDatePreset] = useState('all')
  const { deleteGroup, bulkDeleteGroups } = useStockOpnameMutations()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  return (
    <>
      <DataTable
        columns={[
          { 
            key: 'name', 
            header: 'Nama Group',
            render: (v, row) => (
              <button 
                onClick={() => router.push(`/dashboard/stock-opname/${row.id}`)}
                className="font-bold text-red-600 hover:underline text-left"
              >
                {v as string}
              </button>
            )
          },
          { key: 'description', header: 'Deskripsi', render: (v) => v || '—' },
          {
            key: 'status',
            header: 'Status',
            render: (v) => (
              <Badge variant={v === 'completed' ? 'default' : 'secondary'}>
                {v === 'completed' ? 'Selesai' : 'Draft'}
              </Badge>
            )
          },
          { key: 'creator', header: 'Dibuat Oleh', render: (_, row) => (row as any).creator?.full_name || '—' },
          { key: 'created_at', header: 'Tanggal', render: (v) => formatDateTime(v as string) },
          {
            key: 'actions', header: '', className: 'w-16 text-right',
            render: (_, row) => {
              const group = row as StockOpnameGroup
              return (
                <div className="flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" />}
                    >
                      <MoreHorizontal size={16} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => router.push(`/dashboard/stock-opname/${group.id}`)}>
                        <Eye size={14} className="mr-2 text-muted-foreground" /> Lihat Detail
                      </DropdownMenuItem>
                      {group.status === 'draft' && (
                        <DropdownMenuItem
                          onClick={() => setDeleteId(group.id)}
                          className="text-destructive focus:text-destructive focus:bg-red-50"
                        >
                          <Trash2 size={14} className="mr-2" /> Hapus Group
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            },
          },
        ]}
        data={data?.data ?? []}
        isLoading={isLoading}
        page={page}
        pageSize={pageSize}
        totalCount={data?.count ?? 0}
        onPageChange={setPage}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1) }}
        searchPlaceholder="Cari group opname..."
        filters={
          <StockListFilter 
            warehouseId={warehouseId}
            setWarehouseId={(v) => { setWarehouseId(v); setPage(1) }}
            categoryId={categoryId}
            setCategoryId={(v) => { setCategoryId(v); setPage(1) }}
            dateRange={dateRange}
            setDateRange={(v) => { setDateRange(v); setPage(1) }}
            datePreset={datePreset}
            setDatePreset={setDatePreset}
          />
        }
        onBulkDelete={(ids) => bulkDeleteGroups.mutate(ids)}
        actions={
          <Button size="sm" onClick={() => setIsDialogOpen(true)}>
            <Plus size={14} className="mr-1.5" /> Buat Group Baru
          </Button>
        }
        emptyText="Belum ada group stock opname"
      />

      <StockOpnameGroupDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Hapus Group Opname"
        description="Apakah Anda yakin ingin menghapus group opname ini? Semua data di dalamnya akan ikut terhapus."
        onConfirm={() => deleteId && deleteGroup.mutate(deleteId, { onSuccess: () => setDeleteId(null) })}
        loading={deleteGroup.isPending}
      />
    </>
  )
}
