'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Eye, Plus, RotateCcw, CheckCircle2, X, MoreHorizontal, Calendar as CalendarIcon, ChevronDown, AlarmClock, AlertCircle } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'

import type { ItemLoan } from '@/types/database'
import { DataTable } from '@/components/shared/data-table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useWarehouses } from '@/hooks/queries/use-warehouses'
import { LoanRequestDialog } from './loan-request-dialog'
import { LoanStatusBadge } from './loan-status-badge'
import { LoanDetailModal } from './loan-detail-modal'
import { formatDateTime } from '@/lib/utils'

const PAGE_SIZE = 10

type LoanWithJoins = ItemLoan & {
  item?: { id: string; name: string }
  warehouse?: { id: string; name: string }
  actioner?: { id: string; full_name: string }
  requester?: { id: string; full_name: string }
}

interface UserLoansClientProps {
  isHistory?: boolean
}

export function UserLoansClient({ isHistory = false }: UserLoansClientProps) {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  
  const [statusFilter, setStatusFilter] = useState('all')
  const [warehouseId, setWarehouseId] = useState('all')
  const [datePreset, setDatePreset] = useState('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  
  const [returnDatePreset, setReturnDatePreset] = useState('all')
  const [returnCustomStartDate, setReturnCustomStartDate] = useState('')
  const [returnCustomEndDate, setReturnCustomEndDate] = useState('')
  const [dueFilter, setDueFilter] = useState('all')

  const [detailLoan, setDetailLoan] = useState<LoanWithJoins | null>(null)
  const [requestOpen, setRequestOpen] = useState(false)
  const [cancelLoan, setCancelLoan] = useState<LoanWithJoins | null>(null)

  const { data: warehouses } = useWarehouses()

  const { data, isLoading } = useQuery({
    queryKey: ['loans', page, debouncedSearch, statusFilter, isHistory, warehouseId, datePreset, customStartDate, customEndDate, returnDatePreset, returnCustomStartDate, returnCustomEndDate, dueFilter],
    queryFn: async () => {
      let finalStatus = statusFilter
      if (statusFilter === 'all') {
        finalStatus = isHistory ? 'rejected,returned,cancelled' : 'pending,approved'
      }

      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        search: debouncedSearch,
        status: finalStatus,
        warehouse_id: warehouseId,
        due_filter: dueFilter,
      })

      if (datePreset !== 'all' || returnDatePreset !== 'all') {
        const { endOfDay, startOfDay, subDays, parseISO } = await import('date-fns')
        
        if (datePreset !== 'all') {
          let start: Date | null = null
          let end: Date = endOfDay(new Date())

          if (datePreset === 'custom') {
            if (customStartDate) start = startOfDay(parseISO(customStartDate))
            if (customEndDate) end = endOfDay(parseISO(customEndDate))
          } else {
            start = startOfDay(subDays(new Date(), parseInt(datePreset)))
          }

          if (start) params.append('date_from', start.toISOString())
          params.append('date_to', end.toISOString())
        }

        if (returnDatePreset !== 'all') {
          let rStart: Date | null = null
          let rEnd: Date = endOfDay(new Date())

          if (returnDatePreset === 'custom') {
            if (returnCustomStartDate) rStart = startOfDay(parseISO(returnCustomStartDate))
            if (returnCustomEndDate) rEnd = endOfDay(parseISO(returnCustomEndDate))
          } else {
            rStart = startOfDay(subDays(new Date(), parseInt(returnDatePreset)))
          }

          if (rStart) params.append('return_date_from', rStart.toISOString())
          params.append('return_date_to', rEnd.toISOString())
        }
      }

      const res = await fetch(`/api/v1/loans?${params}`)
      if (!res.ok) throw new Error('Gagal memuat data')
      return res.json() as Promise<{ data: LoanWithJoins[]; count: number }>
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/loans/${cancelLoan?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Gagal membatalkan')
      }
    },
    onSuccess: () => {
      toast.success('Peminjaman dibatalkan')
      qc.invalidateQueries({ queryKey: ['loans'] })
      setCancelLoan(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const filterBar = (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${isHistory ? 'lg:grid-cols-4' : 'lg:grid-cols-5'} gap-4`}>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Status
        </Label>
        <Select
          value={statusFilter}
          onValueChange={(v) => { if (v) { setStatusFilter(v); setPage(1) } }}
        >
          <SelectTrigger className="h-9 text-xs">
            <SelectValue>
              {statusFilter === 'all' 
                ? `Semua ${isHistory ? 'Riwayat' : 'Pinjaman'}`
                : statusFilter === 'pending' ? 'Menunggu'
                : statusFilter === 'approved' ? 'Disetujui (Belum Kembali)'
                : statusFilter === 'rejected' ? 'Ditolak'
                : statusFilter === 'returned' ? 'Sudah Kembali'
                : 'Dibatalkan'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua {isHistory ? 'Riwayat' : 'Pinjaman'}</SelectItem>
            {!isHistory && <SelectItem value="pending">Menunggu</SelectItem>}
            {!isHistory && <SelectItem value="approved">Disetujui (Belum Kembali)</SelectItem>}
            {isHistory && <SelectItem value="rejected">Ditolak</SelectItem>}
            {isHistory && <SelectItem value="returned">Sudah Kembali</SelectItem>}
            {isHistory && <SelectItem value="cancelled">Dibatalkan</SelectItem>}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gudang</Label>
        <Select value={warehouseId} onValueChange={(v) => { setWarehouseId(v); setPage(1) }}>
          <SelectTrigger className="h-9 text-xs">
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
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Waktu Peminjaman</Label>
        <Popover>
          <PopoverTrigger render={
            <Button variant="outline" className="h-9 w-full justify-between font-normal px-3 text-xs">
              <div className="flex items-center gap-2 overflow-hidden">
                <CalendarIcon size={14} className="text-muted-foreground shrink-0" />
                <span className="truncate">
                  {datePreset === 'all' ? 'Semua Waktu' : 
                   datePreset === 'custom' ? (
                     customStartDate && customEndDate ? `${customStartDate} - ${customEndDate}` :
                     customStartDate ? `Dari ${customStartDate}` :
                     customEndDate ? `Sampai ${customEndDate}` : 'Custom Waktu'
                   ) : `${datePreset} Hari Terakhir`}
                </span>
              </div>
              <ChevronDown size={14} className="text-muted-foreground shrink-0" />
            </Button>
          } />
          <PopoverContent className="w-64 p-3" align="start">
            <div className="space-y-3">
              <div className="space-y-2">
                {[
                  { label: 'Semua Waktu', value: 'all' },
                  { label: '1 Hari Yang Lalu', value: '1' },
                  { label: '7 Hari Yang Lalu', value: '7' },
                  { label: '14 Hari Yang Lalu', value: '14' },
                  { label: '30 Hari Yang Lalu', value: '30' },
                  { label: '60 Hari Yang Lalu', value: '60' },
                  { label: 'Custom Waktu', value: 'custom' },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded transition-colors">
                    <input
                      type="radio"
                      name="datePresetUser"
                      value={opt.value}
                      checked={datePreset === opt.value}
                      onChange={(e) => { setDatePreset(e.target.value); setPage(1) }}
                      className="w-3.5 h-3.5 text-primary focus:ring-primary border-gray-300"
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>

              {datePreset === 'custom' && (
                <div className="space-y-2 pt-2 border-t">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Mulai Tanggal</Label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => { setCustomStartDate(e.target.value); setPage(1) }}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Sampai Tanggal</Label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => { setCustomEndDate(e.target.value); setPage(1) }}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {isHistory && (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Waktu Pengembalian</Label>
          <Popover>
            <PopoverTrigger render={
              <Button variant="outline" className="h-9 w-full justify-between font-normal px-3 text-xs">
                <div className="flex items-center gap-2 overflow-hidden">
                  <CalendarIcon size={14} className="text-muted-foreground shrink-0" />
                  <span className="truncate">
                    {returnDatePreset === 'all' ? 'Semua Waktu' : 
                     returnDatePreset === 'custom' ? (
                       returnCustomStartDate && returnCustomEndDate ? `${returnCustomStartDate} - ${returnCustomEndDate}` :
                       returnCustomStartDate ? `Dari ${returnCustomStartDate}` :
                       returnCustomEndDate ? `Sampai ${returnCustomEndDate}` : 'Custom Waktu'
                     ) : `${returnDatePreset} Hari Terakhir`}
                  </span>
                </div>
                <ChevronDown size={14} className="text-muted-foreground shrink-0" />
              </Button>
            } />
            <PopoverContent className="w-64 p-3" align="start">
              <div className="space-y-3">
                <div className="space-y-2">
                  {[
                    { label: 'Semua Waktu', value: 'all' },
                    { label: '1 Hari Yang Lalu', value: '1' },
                    { label: '7 Hari Yang Lalu', value: '7' },
                    { label: '14 Hari Yang Lalu', value: '14' },
                    { label: '30 Hari Yang Lalu', value: '30' },
                    { label: '60 Hari Yang Lalu', value: '60' },
                    { label: 'Custom Waktu', value: 'custom' },
                  ].map((opt) => (
                    <label key={`return-${opt.value}`} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded transition-colors">
                      <input
                        type="radio"
                        name="returnDatePresetUser"
                        value={opt.value}
                        checked={returnDatePreset === opt.value}
                        onChange={(e) => { setReturnDatePreset(e.target.value); setPage(1) }}
                        className="w-3.5 h-3.5 text-primary focus:ring-primary border-gray-300"
                      />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  ))}
                </div>

                {returnDatePreset === 'custom' && (
                  <div className="space-y-2 pt-2 border-t">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Mulai Tanggal</Label>
                      <Input
                        type="date"
                        value={returnCustomStartDate}
                        onChange={(e) => { setReturnCustomStartDate(e.target.value); setPage(1) }}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Sampai Tanggal</Label>
                      <Input
                        type="date"
                        value={returnCustomEndDate}
                        onChange={(e) => { setReturnCustomEndDate(e.target.value); setPage(1) }}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {!isHistory && (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Batas Pengembalian</Label>
          <Select value={dueFilter} onValueChange={(v) => { setDueFilter(v); setPage(1) }}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Semua Batas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Batas</SelectItem>
              <SelectItem value="approaching">
                <div className="flex items-center gap-2 text-amber-600">
                  <AlarmClock size={14} />
                  <span>Mendekati Batas</span>
                </div>
              </SelectItem>
              <SelectItem value="overdue">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle size={14} />
                  <span>Melewati Batas</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <DataTable
        columns={[
          {
            key: 'item',
            header: 'Barang',
            render: (_, row) => (
              <span className="font-medium">{row.item?.name ?? '—'}</span>
            ),
          },
          {
            key: 'warehouse',
            header: 'Gudang',
            render: (_, row) => row.warehouse?.name ?? '—',
          },
          {
            key: 'quantity',
            header: 'Jumlah',
            render: (v) => <span className="font-semibold">{v as number}</span>,
          },
          {
            key: 'loan_date',
            header: 'Waktu Pinjam',
            render: (v) => formatDateTime(v as string),
          },
          {
            key: 'return_date',
            header: isHistory ? 'Waktu Dikembalikan' : 'Batas Kembali',
            render: (_, item: LoanWithJoins) => {
              if (isHistory) {
                return item.actual_return_date ? formatDateTime(item.actual_return_date) : '-'
              }
              
              const returnDate = item.return_date ? new Date(item.return_date) : null
              const now = new Date()
              const threeDaysLater = new Date()
              threeDaysLater.setDate(now.getDate() + 3)

              let dotColor = 'bg-emerald-500' 
              if (returnDate) {
                if (returnDate < now) {
                  dotColor = 'bg-destructive animate-pulse'
                } else if (returnDate <= threeDaysLater) {
                  dotColor = 'bg-amber-500'
                }
              }

              return (
                <div className="flex items-center gap-2">
                  {item.status === 'approved' && (
                    <div className={`size-2 rounded-full ${dotColor}`} />
                  )}
                  <span>{item.return_date ? formatDateTime(item.return_date) : '-'}</span>
                </div>
              )
            }
          },
          {
            key: 'status',
            header: 'Status',
            render: (_, row) => {
              const isApprovedOrReturned = row.status === 'approved' || row.status === 'returned'
              return (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <LoanStatusBadge status={isApprovedOrReturned ? 'approved' : row.status} />
                  </div>
                  {isApprovedOrReturned && (
                    <div className="flex items-center gap-2">
                      {row.status === 'returned' ? (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 gap-1 border-blue-200 text-[10px]">
                          <RotateCcw size={10} /> Sudah Kembali
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-700 border-amber-300 gap-1 text-[10px]">
                          <CheckCircle2 size={10} className="opacity-50" /> Belum Kembali
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              )
            },
          },
          {
            key: 'actions',
            header: '',
            className: 'w-24 text-right',
            render: (_, row) => (
              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger 
                    render={<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" />}
                  >
                    <MoreHorizontal size={16} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setDetailLoan(row)}>
                      <Eye size={14} className="mr-2 text-muted-foreground" /> Detail Peminjaman
                    </DropdownMenuItem>
                    
                    {row.status === 'pending' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setCancelLoan(row)} className="text-destructive focus:text-destructive focus:bg-red-50">
                          <X size={14} className="mr-2" /> Batalkan Pengajuan
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ),
          },
        ]}
        data={data?.data ?? []}
        isLoading={isLoading}
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={data?.count ?? 0}
        onPageChange={setPage}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1) }}
        searchPlaceholder="Cari peminjaman..."
        actions={!isHistory && (
          <Button onClick={() => setRequestOpen(true)} className="h-9 gap-1.5" size="sm">
            <Plus size={16} /> Pinjam Barang
          </Button>
        )}
        filters={filterBar}
        emptyText={isHistory ? "Belum ada riwayat peminjaman" : "Tidak ada peminjaman aktif"}
      />

      <LoanDetailModal loan={detailLoan} open={!!detailLoan} onOpenChange={(o) => !o && setDetailLoan(null)} />

      <LoanRequestDialog open={requestOpen} onOpenChange={setRequestOpen} />

      <ConfirmDialog
        open={!!cancelLoan}
        onOpenChange={(o) => !o && setCancelLoan(null)}
        title="Batalkan Peminjaman"
        confirmText="Batalkan"
        loadingText="Membatalkan..."
        description={`Batalkan peminjaman "${cancelLoan?.item?.name}"? Tindakan ini tidak dapat diurungkan.`}
        onConfirm={() => cancelMutation.mutate()}
        loading={cancelMutation.isPending}
      />
    </div>
  )
}
