'use client'

import { useState, useMemo, useEffect } from 'react'
import { Plus, Trash2, ArrowLeft, CheckCircle2, Filter, Eye, Clock, MoreHorizontal, Pencil, Download, Upload, Building, Building2, Loader2, Save, AlertTriangle, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'


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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { useStockOpnameGroup, useStockOpnameMutations, useStockOpnameEntries } from '../../../hooks/stock/use-stock-opname'
import { StockOpnameEntryDialog } from '@/components/warehouse-app/stock/sub-components/stock-opname-entry-dialog'
import { StockOpnameImportDialog } from '@/components/warehouse-app/stock/sub-components/stock-opname-import-dialog'
import { StockOpnameDetailFilter } from './sub-components/stock-opname-detail-filter'
import { Skeleton } from '@/components/ui/skeleton'
import { TableSkeleton } from '@/components/shared/table-skeleton'
import { useWarehouses } from '@/hooks/queries/use-warehouses'
import { StockOpnameWarehouseGateClient } from './stock-opname-warehouse-gate-client'

export function StockOpnameDetailSkeleton() {
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
  const searchParams = useSearchParams()
  const supabase = createClient()

  const urlWarehouseId = searchParams.get('warehouseId') || searchParams.get('warehouse_id')

  const { data: profile } = useQuery({
    queryKey: ['user_profile_for_opname'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      return data
    }
  })

  const isAdmin = profile?.role === 'admin'
  const isGA = profile?.role === 'general_affair'

  const { data: res, isLoading } = useStockOpnameGroup(id)
  const group = res?.data

  const { data: warehouses = [], isLoading: isLoadingWarehouses } = useWarehouses()
  const selectedWarehouseId = urlWarehouseId || ''

  const { deleteEntry, bulkDeleteEntries, finalizeGroup, addEntry, updateEntry } = useStockOpnameMutations()

  // Local drafts for spreadsheet bulk entry
  const [drafts, setDrafts] = useState<Record<string, {
    item_id: string;
    originalId?: string;
    systemStock?: number;
    actualStock?: string;
    diffCategoryId?: string;
    itemName?: string;
  }>>({})

  // Fetch discrepancy categories
  const { data: diffCategories = [] } = useQuery<any[]>({
    queryKey: ['stock-opname-diff-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_opname_diff_categories')
        .select('id, name')
        .order('name')
      if (error) throw error
      return data || []
    }
  })

  const [isSavingGlobal, setIsSavingGlobal] = useState(false)

  const localStorageKey = useMemo(() => {
    return selectedWarehouseId ? `gudang-idn:stock-opname-draft:${id}:${selectedWarehouseId}` : ''
  }, [id, selectedWarehouseId])

  // Load drafts from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorageKey) {
      const saved = localStorage.getItem(localStorageKey)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          setDrafts(parsed)
        } catch (e) {
          console.error('Failed to parse saved drafts', e)
        }
      } else {
        setDrafts({})
      }
    }
  }, [localStorageKey])

  // Save drafts to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorageKey) {
      if (Object.keys(drafts).length > 0) {
        localStorage.setItem(localStorageKey, JSON.stringify(drafts))
      } else {
        localStorage.removeItem(localStorageKey)
      }
    }
  }, [drafts, localStorageKey])

  const handleGlobalSave = async () => {
    const draftKeys = Object.keys(drafts)
    if (draftKeys.length === 0) return

    // Pre-validate all draft items
    for (const itemId of draftKeys) {
      const draft = drafts[itemId]
      const matchedEntry = entries.find((e: any) => e.item_id === itemId)
      const name = draft.itemName || matchedEntry?.item?.name || 'tersebut'

      const actualStockStr = draft.actualStock ?? ''
      if (actualStockStr.trim() === '') {
        toast.error(`Stok fisik untuk barang "${name}" tidak boleh kosong!`)
        return
      }

      const actualStockVal = parseInt(actualStockStr, 10)
      if (isNaN(actualStockVal) || actualStockVal < 0) {
        toast.error(`Stok fisik untuk barang "${name}" harus berupa angka non-negatif!`)
        return
      }

      const systemStock = draft.systemStock !== undefined
        ? draft.systemStock
        : (matchedEntry?.system_stock !== undefined ? matchedEntry.system_stock : 0)

      const difference = actualStockVal - systemStock
      const diffCategoryId = draft.diffCategoryId || ''

      if (difference !== 0 && !diffCategoryId) {
        toast.error(`Kategori selisih wajib dipilih untuk barang "${name}" karena ada selisih stok!`)
        return
      }
    }

    try {
      setIsSavingGlobal(true)
      const savePromises = draftKeys.map(async (itemId) => {
        const draft = drafts[itemId]
        const matchedEntry = entries.find((e: any) => e.item_id === itemId)

        const actualStockVal = parseInt(draft.actualStock!, 10)
        const diffCategoryIdVal = draft.diffCategoryId || null

        const systemStock = draft.systemStock !== undefined
          ? draft.systemStock
          : (matchedEntry?.system_stock !== undefined ? matchedEntry.system_stock : 0)

        const difference = actualStockVal - systemStock
        const noteVal = null // No longer editing notes in spreadsheet
        const originalId = draft.originalId || matchedEntry?.originalId

        if (originalId) {
          // Update existing
          return updateEntry.mutateAsync({
            id: originalId,
            actual_stock: actualStockVal,
            note: noteVal,
            diff_category_id: difference !== 0 ? diffCategoryIdVal : null,
            groupId: id
          })
        } else {
          // Create new
          return addEntry.mutateAsync({
            group_id: id,
            item_id: itemId,
            warehouse_id: selectedWarehouseId,
            system_stock: systemStock,
            actual_stock: actualStockVal,
            note: noteVal,
            diff_category_id: difference !== 0 ? diffCategoryIdVal : null
          })
        }
      })

      await Promise.all(savePromises)
      toast.success('Semua perubahan berhasil disimpan!')
      setDrafts({})
      if (typeof window !== 'undefined' && localStorageKey) {
        localStorage.removeItem(localStorageKey)
      }
    } catch (err: any) {
      console.error('[Global Save Error]', err)
      toast.error('Terjadi kesalahan saat menyimpan beberapa perubahan.')
    } finally {
      setIsSavingGlobal(false)
    }
  }

  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [editEntryData, setEditEntryData] = useState<any>(null)
  const [deleteEntryData, setDeleteEntryData] = useState<{ id: string, name: string } | null>(null)
  const [isFinalizeOpen, setIsFinalizeOpen] = useState(false)
  const [isUnrecordedListOpen, setIsUnrecordedListOpen] = useState(false)
  const [unrecordedSearchTerm, setUnrecordedSearchTerm] = useState('')

  const { data: summaryRes, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['stock-opname-summary', id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/stock-opname-groups/${id}/summary`)
      if (!res.ok) throw new Error('Gagal memuat summary opname')
      return res.json()
    },
    enabled: isFinalizeOpen
  })

  const summary = summaryRes?.summary

  const filteredUnrecordedItems = useMemo(() => {
    if (!summary?.unrecordedItems) return []
    if (!unrecordedSearchTerm.trim()) return summary.unrecordedItems
    const searchLower = unrecordedSearchTerm.toLowerCase()
    return summary.unrecordedItems.filter((item: any) =>
      item.item_name.toLowerCase().includes(searchLower) ||
      item.warehouse_name.toLowerCase().includes(searchLower)
    )
  }, [summary?.unrecordedItems, unrecordedSearchTerm])

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [selectedEntryDetail, setSelectedEntryDetail] = useState<any>(null)
  const [datePreset, setDatePreset] = useState('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  // Pagination State
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const { data: entriesRes, isLoading: isLoadingEntries } = useStockOpnameEntries(id, {
    page,
    pageSize,
    search: searchTerm,
    filterType,
    categoryId: categoryFilter,
    warehouseId: selectedWarehouseId,
    datePreset,
    customStartDate,
    customEndDate
  })

  const entries = useMemo(() => {
    return (entriesRes?.data || []).map((row: any) => ({
      ...row,
      id: row.id || `unrecorded-${row.item_id}`,
      originalId: row.id
    }))
  }, [entriesRes])

  if (isLoading || isLoadingWarehouses) {
    return <StockOpnameDetailSkeleton />
  }

  if (!group) {
    return (
      <div className="p-8 text-center text-red-600 font-semibold bg-white rounded-lg border border-red-200 shadow-sm animate-in fade-in duration-300">
        Group Opname tidak ditemukan atau telah dihapus.
      </div>
    )
  }

  const isValidWarehouse = selectedWarehouseId && warehouses.some(w => w.id === selectedWarehouseId)

  if (!isValidWarehouse) {
    return <StockOpnameWarehouseGateClient id={id} />
  }
  const totalCount = entriesRes?.metadata?.totalCount || 0

  const selectedWarehouse = warehouses.find(w => w.id === selectedWarehouseId)

  const isDraft = group.status === 'draft'
  const canEdit = isDraft && (isAdmin || isGA)

  const handleExportCSV = async () => {
    if (totalCount === 0) return

    // Fetch all matching data for export
    const searchParams = new URLSearchParams()
    searchParams.append('page', '1')
    searchParams.append('pageSize', '10000') // fetch up to 10k items
    if (searchTerm) searchParams.append('search', searchTerm)
    if (selectedWarehouseId) searchParams.append('warehouse_id', selectedWarehouseId)
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

      const headers = ['Barang', 'Kategori', 'Gudang', 'Stok Sistem (Tercatat)', 'Stok Sistem (Saat Ini)', 'Stok Fisik', 'Selisih', 'Waktu', 'Catatan']

      const csvContent = [
        headers.join(','),
        ...entriesToExport.map((entry: any) => {
          const item = entry.item?.name || '—'
          const category = entry.item?.category?.name || '—'
          const warehouse = entry.warehouse?.name || '—'
          const systemStock = entry.system_stock
          const currentSystemStock = entry.current_system_stock !== undefined ? entry.current_system_stock : entry.system_stock
          const actualStock = entry.actual_stock
          const difference = entry.difference > 0 ? `+${entry.difference}` : entry.difference
          const time = formatDateTime(entry.created_at)
          const note = entry.note || ''

          return [item, category, warehouse, systemStock, currentSystemStock, actualStock, difference, time, note]
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
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="outline" size="icon" className='cursor-pointer' onClick={() => router.back()}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <div className="flex flex-col md:flex-row md:items-center md:gap-3 mb-1.5">
              <h1 className="text-2xl font-bold tracking-tight">{group.name}</h1>
              {selectedWarehouse && (
                <div className="flex items-center gap-2 text-blue-800 text-lg font-semibold">
                  <span className='hidden md:block'>-</span>
                  <span>{selectedWarehouse.name}</span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={isDraft ? 'secondary' : 'success'} className="h-7 px-3 flex items-center gap-1.5 font-medium">
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
        </div>
        <div className="flex items-center justify-end gap-2">
          {Object.keys(drafts).length > 0 && canEdit && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (confirm('Apakah Anda yakin ingin membatalkan semua perubahan belum disimpan?')) {
                    setDrafts({})
                    if (typeof window !== 'undefined' && localStorageKey) {
                      localStorage.removeItem(localStorageKey)
                    }
                    toast.info('Perubahan dibatalkan')
                  }
                }}
                disabled={isSavingGlobal}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Batalkan
              </Button>
              <Button
                size="sm"
                onClick={handleGlobalSave}
                disabled={isSavingGlobal}
                className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                {isSavingGlobal ? (
                  <Loader2 size={14} className="mr-1.5 animate-spin" />
                ) : (
                  <Save size={14} className="mr-1.5" />
                )}
                Simpan Perubahan ({Object.keys(drafts).length})
              </Button>
            </>
          )}
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={handleExportCSV} className="cursor-pointer">
              <Download size={14} className="mr-1.5" /> Export CSV
            </Button>
          )}
          {isDraft && (isAdmin || isGA) && (
            <Button size="sm" onClick={() => setIsFinalizeOpen(true)} className="bg-green-600 hover:bg-green-700 text-white cursor-pointer">
              <CheckCircle2 size={14} className="mr-1.5" /> Finalisasi Opname
            </Button>
          )}
        </div>
      </div>

      <DataTable
        columns={[
          {
            key: 'item',
            header: 'Barang',
            render: (_, row: any) => {
              const isRecorded = !!(row as any).originalId
              return (
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${isRecorded ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    title={isRecorded ? 'Tercatat' : 'Belum Dicatat'}
                  />
                  <span className="font-medium text-foreground">{(row as any).item?.name || '—'}</span>
                </div>
              )
            }
          },
          { key: 'category', header: 'Kategori', render: (_, row: any) => (row as any).item?.category?.name || '—' },
          { key: 'system_stock', header: 'Stok Sistem (Tercatat)', className: 'text-right font-medium text-muted-foreground' },
          {
            key: 'current_system_stock',
            header: 'Stok Sistem (Saat Ini)',
            className: 'text-right font-medium',
            render: (_, row: any) => {
              const current = (row as any).current_system_stock !== undefined ? (row as any).current_system_stock : (row as any).system_stock
              return (
                <Badge variant="outline" className="font-semibold px-2 py-0.5 bg-indigo-50/50 text-indigo-700 border-indigo-200/60 hover:bg-indigo-50/50">
                  {current}
                </Badge>
              )
            }
          },
          {
            key: 'actual_stock',
            header: 'Stok Fisik',
            className: 'w-[120px]',
            render: (_, row: any) => {
              if (canEdit) {
                const currentDraftVal = drafts[row.item_id]?.actualStock
                const displayVal = currentDraftVal !== undefined ? currentDraftVal : (row.actual_stock !== null ? String(row.actual_stock) : '')

                return (
                  <Input
                    type="number"
                    min="0"
                    className="h-8 text-right font-medium focus-visible:ring-1 focus-visible:ring-blue-500 w-24 bg-white"
                    value={displayVal}
                    onChange={(e) => {
                      const val = e.target.value
                      setDrafts(prev => {
                        const existing = prev[row.item_id] || {}
                        return {
                          ...prev,
                          [row.item_id]: {
                            ...existing,
                            item_id: row.item_id,
                            itemName: row.item?.name || 'tersebut',
                            systemStock: row.system_stock !== undefined ? row.system_stock : 0,
                            originalId: row.originalId || undefined,
                            actualStock: val
                          }
                        }
                      })
                    }}
                    placeholder="0"
                  />
                )
              }

              return (
                <div className="text-right font-semibold text-blue-600 pr-4">
                  {row.actual_stock !== null ? row.actual_stock : '—'}
                </div>
              )
            }
          },
          {
            key: 'difference',
            header: 'Selisih',
            className: 'text-right font-semibold w-[90px]',
            render: (_, row: any) => {
              const currentDraftVal = drafts[row.item_id]?.actualStock
              const displayActual = currentDraftVal !== undefined ? currentDraftVal : (row.actual_stock !== null ? String(row.actual_stock) : '')

              const actualNum = displayActual !== '' ? parseInt(displayActual, 10) : null
              const systemStock = row.system_stock || 0

              const diff = actualNum !== null ? actualNum - systemStock : (row.originalId ? row.difference : null)

              if (diff === null) return <span className="text-muted-foreground pr-2">—</span>

              return (
                <span className={`font-bold pr-2 ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                  {diff > 0 ? '+' : ''}{diff}
                </span>
              )
            }
          },
          {
            key: 'diff_category',
            header: 'Kategori Selisih',
            className: 'w-[180px]',
            render: (_, row: any) => {
              const currentDraftVal = drafts[row.item_id]?.actualStock
              const displayActual = currentDraftVal !== undefined ? currentDraftVal : (row.actual_stock !== null ? String(row.actual_stock) : '')

              const actualNum = displayActual !== '' ? parseInt(displayActual, 10) : null
              const systemStock = row.system_stock || 0
              const diff = actualNum !== null ? actualNum - systemStock : (row.originalId ? row.difference : null)

              const hasDiff = diff !== null && diff !== 0

              if (!hasDiff) {
                return <span className="text-muted-foreground text-xs italic">Tidak ada selisih</span>
              }

              if (canEdit) {
                const currentDraftCat = drafts[row.item_id]?.diffCategoryId
                const displayCatId = currentDraftCat !== undefined ? currentDraftCat : (row.diff_category_id || 'none')

                return (
                  <Select
                    value={displayCatId || 'none'}
                    onValueChange={(val) => {
                      setDrafts(prev => {
                        const existing = prev[row.item_id] || {}
                        return {
                          ...prev,
                          [row.item_id]: {
                            ...existing,
                            item_id: row.item_id,
                            itemName: row.item?.name || 'tersebut',
                            systemStock: row.system_stock !== undefined ? row.system_stock : 0,
                            originalId: row.originalId || undefined,
                            diffCategoryId: val === 'none' ? '' : val
                          }
                        }
                      })
                    }}
                  >
                    <SelectTrigger className="h-8 w-[160px] text-xs bg-white">
                      <SelectValue placeholder="Pilih Kategori..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" disabled>Pilih Kategori...</SelectItem>
                      {diffCategories.map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.id} className="text-xs">
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              }

              const categoryName = (row as any).diff_category?.name || '—'
              return (
                <Badge variant="outline" className="text-xs font-normal">
                  {categoryName}
                </Badge>
              )
            }
          },
          {
            key: 'actions',
            header: 'Aksi',
            className: 'w-[80px] text-right',
            render: (_, row: any) => {
              return (
                <div className="flex items-center justify-end gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7" />}>
                      <MoreHorizontal size={14} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => setSelectedEntryDetail(row)} className="cursor-pointer">
                        <Eye size={12} className="mr-2" />
                        Lihat Detail
                      </DropdownMenuItem>

                      {canEdit && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setEditEntryData(row)}
                            className="cursor-pointer"
                          >
                            <Pencil size={12} className="mr-2" />
                            Edit Dialog
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            }
          },
        ]}
        data={entries}
        isLoading={isLoadingEntries}
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setPage(1)
        }}
        searchValue={searchTerm}
        onSearchChange={(v) => {
          setSearchTerm(v)
          setPage(1)
        }}
        searchPlaceholder="Cari nama barang..."
        rowClassName={(row: any) => !row.originalId ? "bg-amber-50/20 dark:bg-amber-950/5 hover:bg-amber-50/30" : ""}
        filters={
          <StockOpnameDetailFilter
            filterType={filterType} setFilterType={(v) => { setFilterType(v); setPage(1) }}
            warehouseId={selectedWarehouseId} setWarehouseId={() => { }}
            categoryId={categoryFilter} setCategoryId={(v) => { setCategoryFilter(v); setPage(1) }}
            datePreset={datePreset} setDatePreset={(v) => { setDatePreset(v); setPage(1) }}
            customStartDate={customStartDate} setCustomStartDate={(v) => { setCustomStartDate(v); setPage(1) }}
            customEndDate={customEndDate} setCustomEndDate={(v) => { setCustomEndDate(v); setPage(1) }}
            hideWarehouseFilter={true}
          />
        }
        onBulkDelete={canEdit ? (ids) => bulkDeleteEntries.mutate({ ids: ids.filter(i => !i.startsWith('unrecorded-')), groupId: id }) : undefined}
        emptyText={selectedWarehouse ? `Belum ada item yang di-opname di ${selectedWarehouse.name}` : "Belum ada item yang di-opname"}
        actions={
          canEdit ? (
            <Button size="sm" variant="outline" onClick={() => setIsImportDialogOpen(true)} className="border-blue-200 hover:bg-blue-50 text-blue-700 hover:text-blue-800 cursor-pointer">
              <Upload size={14} className="mr-1.5" /> Import CSV
            </Button>
          ) : undefined
        }
      />

      <StockOpnameEntryDialog
        open={isEntryDialogOpen}
        onOpenChange={setIsEntryDialogOpen}
        groupId={id}
        existingEntries={[]} // Note: With pagination, we can't easily pass all existing entries for duplicate check locally
        lockedWarehouseId={selectedWarehouseId}
      />

      <StockOpnameImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        groupId={id}
        groupName={group.name}
        lockedWarehouseId={selectedWarehouseId}
      />

      <StockOpnameEntryDialog
        open={!!editEntryData}
        onOpenChange={(open) => !open && setEditEntryData(null)}
        groupId={id}
        initialData={editEntryData}
        existingEntries={[]}
        lockedWarehouseId={selectedWarehouseId}
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
            <DialogTitle>Detail Barang Stok Opname</DialogTitle>
          </DialogHeader>

          {selectedEntryDetail && (
            <div className="space-y-4 ">
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase">Barang</div>
                <div className="text-sm font-semibold">{selectedEntryDetail.item?.name}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase">Gudang</div>
                <div className="text-sm font-semibold">{selectedEntryDetail.warehouse?.name}</div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
                <div>
                  <div className="text-xs font-medium text-muted-foreground uppercase">Stok Sistem (Tercatat)</div>
                  <div className="text-sm font-bold text-muted-foreground">{selectedEntryDetail.system_stock}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-indigo-900 uppercase">Stok Sistem (Saat Ini)</div>
                  <div className="text-sm font-bold text-indigo-700">{selectedEntryDetail.current_system_stock !== undefined ? selectedEntryDetail.current_system_stock : selectedEntryDetail.system_stock}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground uppercase">Stok Fisik</div>
                  <div className="text-sm font-bold text-blue-600">{selectedEntryDetail.actual_stock}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground uppercase">Selisih</div>
                  <div className={`text-sm font-bold ${selectedEntryDetail.difference > 0 ? 'text-green-600' : selectedEntryDetail.difference < 0 ? 'text-red-600' : ''}`}>
                    {selectedEntryDetail.difference > 0 ? '+' : ''}{selectedEntryDetail.difference}
                  </div>
                </div>
              </div>

              {selectedEntryDetail.diff_category && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground uppercase">Kategori Selisih</div>
                  <div className="text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1 mt-1 inline-block">
                    {selectedEntryDetail.diff_category.name}
                  </div>
                </div>
              )}

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

      <Dialog open={isFinalizeOpen} onOpenChange={setIsFinalizeOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b border-border">
            <DialogTitle className="text-xl font-bold text-foreground">
              Finalisasi Stock Opname
            </DialogTitle>
          </DialogHeader>

          {/* Banner Keterangan Sesi Opname Global */}
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 flex gap-3 text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-sm">Pemberitahuan Penting</span>
              <p className="text-xs leading-relaxed text-amber-700/90 dark:text-amber-300/80">
                Tindakan finalisasi ini berlaku untuk <strong>seluruh gudang</strong> yang terikat pada sesi opname ini. Penyesuaian stok sistem dengan stok fisik yang dicatat akan dilakukan secara permanen dan tindakan ini <strong>tidak dapat dibatalkan</strong>.
              </p>
            </div>
          </div>

          {isLoadingSummary ? (
            <div className="py-8 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="text-sm font-medium text-muted-foreground">Memuat laporan cakupan opname...</span>
            </div>
          ) : summary ? (
            <div className="space-y-5">
              {/* Laporan Ringkasan Cakupan */}
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Laporan Cakupan Opname</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Card className="shadow-none border border-muted-foreground/10 bg-muted/10">
                    <CardContent className="p-4 flex flex-col justify-between h-full">
                      <span className="text-xs font-medium text-muted-foreground">Total Kombinasi Barang & Gudang</span>
                      <span className="text-2xl font-bold text-foreground mt-2">{summary.totalCount}</span>
                      <span className="text-[10px] text-muted-foreground mt-1">Seluruh sistem</span>
                    </CardContent>
                  </Card>

                  <Card className="shadow-none border border-green-200 bg-green-50/20">
                    <CardContent className="p-4 flex flex-col justify-between h-full">
                      <span className="text-xs font-medium text-green-700 dark:text-green-400">Barang Masuk Opname</span>
                      <span className="text-2xl font-bold text-green-600 dark:text-green-500 mt-2">{summary.recordedCount}</span>
                      <span className="text-[10px] text-green-600/70 mt-1">Telah dicatat</span>
                    </CardContent>
                  </Card>

                  <Card className="shadow-none border border-amber-200 bg-amber-50/20">
                    <CardContent className="p-4 flex flex-col justify-between h-full">
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Belum di-Opname</span>
                      <span className="text-2xl font-bold text-amber-600 dark:text-amber-500 mt-2">{summary.unrecordedCount}</span>
                      <span className="text-[10px] text-amber-600/70 mt-1">Butuh pencatatan</span>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Tombol Lihat Barang Belum Di-opname */}
              {summary.unrecordedCount > 0 && (
                <div className="space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full flex items-center justify-between font-semibold border-amber-200/70 hover:bg-amber-50/50 cursor-pointer"
                    onClick={() => setIsUnrecordedListOpen(!isUnrecordedListOpen)}
                  >
                    <span>
                      {isUnrecordedListOpen ? 'Sembunyikan' : 'Lihat'} Barang yang Belum Di-opname ({summary.unrecordedCount})
                    </span>
                    {isUnrecordedListOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </Button>

                  {isUnrecordedListOpen && (
                    <div className="border rounded-xl p-3 bg-muted/20 dark:bg-muted/5 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                      {/* Search Bar for Unrecorded Items */}
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Cari barang belum di-opname..."
                          value={unrecordedSearchTerm}
                          onChange={(e) => setUnrecordedSearchTerm(e.target.value)}
                          className="pl-9 h-9 text-sm"
                        />
                      </div>

                      {/* Scrollable List */}
                      <div className="max-h-48 overflow-y-auto divide-y divide-border border rounded-lg bg-card text-sm">
                        {filteredUnrecordedItems.length > 0 ? (
                          filteredUnrecordedItems.map((item: any, idx: number) => (
                            <div key={idx} className="p-2.5 flex justify-between items-center hover:bg-muted/30">
                              <span className="font-medium text-foreground">{item.item_name}</span>
                              <Badge variant="outline" className="text-xs bg-muted/50 border-muted-foreground/15 text-muted-foreground font-semibold px-2">
                                {item.warehouse_name}
                              </Badge>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-muted-foreground text-xs italic">
                            Tidak ada barang belum di-opname yang cocok dengan pencarian Anda.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="py-6 text-center text-destructive text-sm font-semibold">
              Gagal memuat data ringkasan opname. Silakan tutup dan coba lagi.
            </div>
          )}

          <DialogFooter className="pt-4 border-t border-border flex flex-col-reverse sm:flex-row gap-2 mt-4">
            <Button variant="outline" className="cursor-pointer" onClick={() => setIsFinalizeOpen(false)} disabled={finalizeGroup.isPending}>
              Kembali
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white cursor-pointer"
              onClick={() => finalizeGroup.mutate(id, { onSuccess: () => setIsFinalizeOpen(false) })}
              disabled={finalizeGroup.isPending || isLoadingSummary}
            >
              {finalizeGroup.isPending ? (
                <>
                  <Loader2 size={14} className="mr-1.5 animate-spin" />
                  Memproses Finalisasi...
                </>
              ) : (
                'Finalisasi Sekarang'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
