'use client'

import { useState, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronLeft, ChevronRight, Search, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'

export interface Column<T> {
  key: keyof T | string
  header: string
  className?: string
  render?: (value: unknown, row: T) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  isLoading?: boolean
  page: number
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  actions?: React.ReactNode
  filters?: React.ReactNode
  emptyText?: string
  onBulkDelete?: (ids: string[]) => void
  bulkActions?: (selectedIds: string[], selectedRows: T[]) => React.ReactNode
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  isLoading,
  page,
  pageSize,
  totalCount,
  onPageChange,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Cari...',
  actions,
  filters,
  emptyText = 'Tidak ada data',
  onBulkDelete,
  bulkActions,
}: DataTableProps<T>) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false)
  const totalPages = Math.ceil(totalCount / pageSize)
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalCount)

  // Reset selection when data changes (search or page change)
  useEffect(() => {
    setSelectedIds([])
  }, [data])

  function getCellValue(row: T, key: string): unknown {
    return key.split('.').reduce((obj: unknown, k) => {
      if (obj && typeof obj === 'object') return (obj as Record<string, unknown>)[k]
      return undefined
    }, row)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      {(onSearchChange || actions || onBulkDelete) && (
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          {onSearchChange ? (
            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          ) : (
            <div />
          )}
            <div className="flex items-center gap-2">
              {selectedIds.length > 0 && (
                <>
                  {bulkActions?.(selectedIds, data.filter(d => selectedIds.includes(d.id)))}
                  {onBulkDelete && (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => setIsBulkDeleteDialogOpen(true)}
                      className="h-9 px-3"
                    >
                      <Trash2 size={14} className="mr-1.5" />
                      Hapus ({selectedIds.length})
                    </Button>
                  )}
                </>
              )}
              {actions}
            </div>
        </div>
      )}

      {/* Filters */}
      {filters && (
        <div className="pt-1">
          {filters}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-12 text-center text-xs font-bold uppercase tracking-wide text-foreground">
                {onBulkDelete && (
                  <input 
                    type="checkbox"
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                    checked={data.length > 0 && selectedIds.length === data.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(data.map(d => d.id))
                      } else {
                        setSelectedIds([])
                      }
                    }}
                  />
                )}
              </TableHead>
              <TableHead className="w-12 text-center text-xs font-bold uppercase tracking-wide text-foreground">
                No
              </TableHead>
              {columns.map((col) => (
                <TableHead key={String(col.key)} className={cn('text-xs font-bold uppercase tracking-wide text-foreground', col.className)}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="text-center"><Skeleton className="h-4 w-4 mx-auto rounded" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-4 w-6 mx-auto rounded" /></TableCell>
                  {columns.map((col) => (
                    <TableCell key={String(col.key)}>
                      <Skeleton className="h-4 w-24 rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 2} className="text-center py-12 text-muted-foreground text-sm">
                  {emptyText}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, idx) => (
                <TableRow key={row.id} className={cn("hover:bg-muted/20 transition-colors", selectedIds.includes(row.id) && "bg-muted/30")}>
                  <TableCell className="text-center">
                    {onBulkDelete && (
                      <input 
                        type="checkbox"
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                        checked={selectedIds.includes(row.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(prev => [...prev, row.id])
                          } else {
                            setSelectedIds(prev => prev.filter(id => id !== row.id))
                          }
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground font-medium">
                    {from + idx}
                  </TableCell>
                  {columns.map((col) => {
                    const value = getCellValue(row, String(col.key))
                    return (
                      <TableCell key={String(col.key)} className={cn('text-sm', col.className)}>
                        {col.render ? col.render(value, row) : String(value ?? '—')}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
          <p>
            Menampilkan <span className="font-medium text-foreground">{from}–{to}</span> dari{' '}
            <span className="font-medium text-foreground">{totalCount}</span> data
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1 || isLoading}
            >
              <ChevronLeft size={14} />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => Math.abs(p - page) <= 2)
              .map((p) => (
                <Button
                  key={p}
                  variant={p === page ? 'default' : 'outline'}
                  size="icon"
                  className="h-8 w-8 text-xs"
                  onClick={() => onPageChange(p)}
                  disabled={isLoading}
                >
                  {p}
                </Button>
              ))}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || isLoading}
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirm Dialog */}
      {onBulkDelete && (
        <ConfirmDialog
          open={isBulkDeleteDialogOpen}
          onOpenChange={setIsBulkDeleteDialogOpen}
          title="Konfirmasi Hapus Massal"
          description={`Apakah Anda yakin ingin menghapus ${selectedIds.length} data terpilih? Tindakan ini tidak dapat dibatalkan.`}
          onConfirm={() => {
            onBulkDelete(selectedIds)
            setSelectedIds([])
            setIsBulkDeleteDialogOpen(false)
          }}
        />
      )}
    </div>
  )
}
