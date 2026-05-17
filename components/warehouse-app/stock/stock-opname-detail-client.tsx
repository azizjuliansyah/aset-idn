'use client'

import { useState, useMemo } from 'react'
import { Plus, Trash2, ArrowLeft, CheckCircle2, Filter, Eye, Clock, MoreHorizontal, Pencil, Download } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { DataTable } from '@/components/shared/data-table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

import { useStockOpnameGroup, useStockOpnameMutations, useStockOpnameEntries } from '../../../hooks/stock/use-stock-opname'
import { StockOpnameEntryDialog } from '@/components/warehouse-app/stock/sub-components/stock-opname-entry-dialog'
import { StockOpnameDetailFilter } from './sub-components/stock-opname-detail-filter'
import { Skeleton } from '@/components/ui/skeleton'
import { TableSkeleton } from '@/components/shared/table-skeleton'

function StockOpnameDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-32 rounded-full" />
        </div>
      </div>

      {/* Table Skeleton */}
      <TableSkeleton rowCount={8} columnCount={7} />
    </div>
  )
}

interface StockOpnameDetailClientProps {
  id: string
}

export function StockOpnameDetailClient({ id }: StockOpnameDetailClientProps) {
  const router = useRouter()
  
  const { data: res, isLoading } = useStockOpnameGroup(id)
  const group = res?.data

  const { deleteEntry, bulkDeleteEntries, finalizeGroup } = useStockOpnameMutations()

  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false)
  const [editEntryData, setEditEntryData] = useState<any>(null)
  const [deleteEntryData, setDeleteEntryData] = useState<{ id: string, name: string } | null>(null)
  const [isFinalizeOpen, setIsFinalizeOpen] = useState(false)

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [warehouseFilter, setWarehouseFilter] = useState('all')
  const [selectedEntryDetail, setSelectedEntryDetail] = useState<any>(null)
  const [datePreset, setDatePreset] = useState('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  // Pagination State
  const [page, setPage] = useState(1)
  const pageSize = 10

  const { data: entriesRes, isLoading: isLoadingEntries } = useStockOpnameEntries(id, {
    page,
    pageSize,
    search: searchTerm,
    filterType,
    categoryId: categoryFilter,
    warehouseId: warehouseFilter,
    datePreset,
    customStartDate,
    customEndDate
  })

  const entries = entriesRes?.data || []
  const totalCount = entriesRes?.metadata?.totalCount || 0

  if (isLoading) return <StockOpnameDetailSkeleton />
  if (!group) return <div>Group tidak ditemukan</div>

  const isDraft = group.status === 'draft'

  const handleExportCSV = async () => {
    if (totalCount === 0) return

    // Fetch all matching data for export
    const searchParams = new URLSearchParams()
    searchParams.append('page', '1')
    searchParams.append('pageSize', '10000') // fetch up to 10k items
    if (searchTerm) searchParams.append('search', searchTerm)
    if (warehouseFilter && warehouseFilter !== 'all') searchParams.append('warehouse_id', warehouseFilter)
    if (categoryFilter && categoryFilter !== 'all') searchParams.append('category_id', categoryFilter)
    if (filterType && filterType !== 'all') searchParams.append('filter_type', filterType)
    
    if (datePreset === 'custom') {
      if (customStartDate) searchParams.append('start_date', customStartDate)
      if (customEndDate) searchParams.append('end_date', customEndDate)
    } else if (datePreset && datePreset !== 'all') {
      const days = parseInt(datePreset)
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - days)
      searchParams.append('start_date', cutoff.toISOString().split('T')[0])
    }

    try {
      const res = await fetch(`/api/v1/stock-opname-groups/${id}/entries?${searchParams}`)
      if (!res.ok) throw new Error('Gagal memuat data untuk export')
      const exportData = await res.json()
      const entriesToExport = exportData.data || []

      const headers = ['Barang', 'Kategori', 'Gudang', 'Stok Sistem', 'Stok Fisik', 'Selisih', 'Waktu', 'Catatan']
      
      const csvContent = [
        headers.join(','),
        ...entriesToExport.map((entry: any) => {
          const item = entry.item?.name || '—'
          const category = entry.item?.category?.name || '—'
          const warehouse = entry.warehouse?.name || '—'
          const systemStock = entry.system_stock
          const actualStock = entry.actual_stock
          const difference = entry.difference > 0 ? `+${entry.difference}` : entry.difference
          const time = formatDateTime(entry.created_at)
          const note = entry.note || ''

          return [item, category, warehouse, systemStock, actualStock, difference, time, note]
            .map(value => `"${String(value).replace(/"/g, '""')}"`)
            .join(',')
        })
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `Stock_Opname_${group.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Export Error:', err)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className='cursor-pointer' onClick={() => router.back()}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{group.name}</h1>
            <p className="text-muted-foreground">{group.description || 'Tidak ada deskripsi'}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={isDraft ? 'secondary' : 'default'} className="h-7 px-3 flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
            Status: {isDraft ? 'Draft' : 'Selesai'}
          </Badge>
          <Badge variant="outline" className="h-7 px-3 border-dashed bg-muted/30 font-medium">
            Total Item: {totalCount}
          </Badge>
          <Badge variant="outline" className="h-7 px-3 border-dashed bg-muted/30 font-medium text-muted-foreground">
            {formatDateTime(group.created_at)}
          </Badge>
        </div>
      </div>

      <DataTable
        columns={[
          { key: 'item', header: 'Barang', render: (_, row) => (row as any).item?.name || '—' },
          { key: 'category', header: 'Kategori', render: (_, row) => (row as any).item?.category?.name || '—' },
          { key: 'warehouse', header: 'Gudang', render: (_, row) => (row as any).warehouse?.name || '—' },
          { key: 'system_stock', header: 'Stok Sistem', className: 'text-right font-medium' },
          { key: 'actual_stock', header: 'Stok Fisik', className: 'text-right font-medium text-blue-600' },
          {
            key: 'difference',
            header: 'Selisih',
            className: 'text-right',
            render: (v) => {
              const diff = v as number
              return (
                <span className={`font-bold ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                  {diff > 0 ? '+' : ''}{diff}
                </span>
              )
            }
          },
          { key: 'created_at', header: 'Waktu', render: (v) => formatDateTime(v as string) },
          {
            key: 'actions', header: '', className: 'w-10 text-right',
            render: (_, row) => (
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
                  <MoreHorizontal size={16} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => setSelectedEntryDetail(row)} className="cursor-pointer">
                    <Eye size={14} className="mr-2" />
                    Lihat Detail
                  </DropdownMenuItem>
                  
                  {isDraft && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => setEditEntryData(row)} 
                        className="cursor-pointer"
                      >
                        <Pencil size={14} className="mr-2" />
                        Edit Item
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setDeleteEntryData({ id: row.id, name: (row as any).item?.name })}
                        className="cursor-pointer text-destructive focus:text-destructive focus:bg-red-50"
                      >
                        <Trash2 size={14} className="mr-2" />
                        Hapus
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          },
        ]}
        data={entries}
        isLoading={isLoadingEntries}
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={setPage}
        searchValue={searchTerm}
        onSearchChange={(v) => {
          setSearchTerm(v)
          setPage(1)
        }}
        searchPlaceholder="Cari nama barang..."
        filters={
          <StockOpnameDetailFilter
            filterType={filterType} setFilterType={(v) => { setFilterType(v); setPage(1) }}
            warehouseId={warehouseFilter} setWarehouseId={(v) => { setWarehouseFilter(v); setPage(1) }}
            categoryId={categoryFilter} setCategoryId={(v) => { setCategoryFilter(v); setPage(1) }}
            datePreset={datePreset} setDatePreset={(v) => { setDatePreset(v); setPage(1) }}
            customStartDate={customStartDate} setCustomStartDate={(v) => { setCustomStartDate(v); setPage(1) }}
            customEndDate={customEndDate} setCustomEndDate={(v) => { setCustomEndDate(v); setPage(1) }}
          />
        }
        onBulkDelete={isDraft ? (ids) => bulkDeleteEntries.mutate({ ids, groupId: id }) : undefined}
        emptyText="Belum ada item yang di-opname"
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleExportCSV}>
              <Download size={14} className="mr-1.5" /> Export CSV
            </Button>
            {isDraft && (
              <>
                <Button size="sm" variant="outline" onClick={() => setIsEntryDialogOpen(true)}>
                  <Plus size={14} className="mr-1.5" /> Tambah Item
                </Button>
                <Button size="sm" onClick={() => setIsFinalizeOpen(true)} className="bg-green-600 hover:bg-green-700 text-white">
                  <CheckCircle2 size={14} className="mr-1.5" /> Finalisasi Opname
                </Button>
              </>
            )}
          </div>
        }
      />

      <StockOpnameEntryDialog
        open={isEntryDialogOpen}
        onOpenChange={setIsEntryDialogOpen}
        groupId={id}
        existingEntries={[]} // Note: With pagination, we can't easily pass all existing entries for duplicate check locally
      />

      <StockOpnameEntryDialog
        open={!!editEntryData}
        onOpenChange={(open) => !open && setEditEntryData(null)}
        groupId={id}
        initialData={editEntryData}
        existingEntries={[]} 
      />

      <ConfirmDialog
        open={!!deleteEntryData}
        onOpenChange={(o) => !o && setDeleteEntryData(null)}
        title="Hapus Item Opname"
        description={`Apakah Anda yakin ingin menghapus catatan opname untuk ${deleteEntryData?.name}?`}
        onConfirm={() => deleteEntryData && deleteEntry.mutate({ id: deleteEntryData.id, groupId: id }, { onSuccess: () => setDeleteEntryData(null) })}
        loading={deleteEntry.isPending}
      />

      {/* Detail Dialog */}
      <Dialog open={!!selectedEntryDetail} onOpenChange={(open) => !open && setSelectedEntryDetail(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detail Stok Opname</DialogTitle>
            <DialogDescription>
              Informasi lengkap untuk entri opname ini.
            </DialogDescription>
          </DialogHeader>
          
          {selectedEntryDetail && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-muted-foreground uppercase">Barang</div>
                  <div className="text-sm font-semibold">{selectedEntryDetail.item?.name}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground uppercase">Gudang</div>
                  <div className="text-sm font-semibold">{selectedEntryDetail.warehouse?.name}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 p-3 bg-muted/30 rounded-lg">
                <div>
                  <div className="text-xs font-medium text-muted-foreground uppercase">Sistem</div>
                  <div className="text-sm font-bold">{selectedEntryDetail.system_stock}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground uppercase">Fisik</div>
                  <div className="text-sm font-bold text-blue-600">{selectedEntryDetail.actual_stock}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground uppercase">Selisih</div>
                  <div className={`text-sm font-bold ${selectedEntryDetail.difference > 0 ? 'text-green-600' : selectedEntryDetail.difference < 0 ? 'text-red-600' : ''}`}>
                    {selectedEntryDetail.difference > 0 ? '+' : ''}{selectedEntryDetail.difference}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase mb-1">Catatan</div>
                <div className="text-sm p-3 bg-card border rounded-md min-h-[60px]">
                  {selectedEntryDetail.note || <span className="italic text-muted-foreground">Tidak ada catatan</span>}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock size={12} />
                <span>Dicatat pada {formatDateTime(selectedEntryDetail.created_at)}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="secondary" onClick={() => setSelectedEntryDetail(null)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={isFinalizeOpen}
        onOpenChange={setIsFinalizeOpen}
        title="Finalisasi Stock Opname"
        description="Finalisasi akan menyesuaikan stok sistem dengan stok fisik yang telah dicatat. Tindakan ini tidak dapat dibatalkan. Lanjutkan?"
        confirmText="Finalisasi Sekarang"
        variant="default"
        onConfirm={() => finalizeGroup.mutate(id, { onSuccess: () => setIsFinalizeOpen(false) })}
        loading={finalizeGroup.isPending}
      />
    </div>
  )
}
