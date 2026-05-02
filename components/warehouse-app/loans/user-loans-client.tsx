'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, X, Loader2, CheckCircle2, RotateCcw, Eye } from 'lucide-react'
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
import { LoanRequestDialog } from './loan-request-dialog'
import { LoanStatusBadge } from './loan-status-badge'
import { LoanDetailModal } from './loan-detail-modal'
import { formatDate } from '@/lib/utils'

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
  
  const initialStatus = isHistory ? 'rejected,returned,cancelled' : 'pending,approved'
  const [statusFilter, setStatusFilter] = useState('all')
  
  const [detailLoan, setDetailLoan] = useState<LoanWithJoins | null>(null)
  const [requestOpen, setRequestOpen] = useState(false)
  const [cancelLoan, setCancelLoan] = useState<LoanWithJoins | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['loans', page, debouncedSearch, statusFilter, isHistory],
    queryFn: async () => {
      // Map 'all' back to the multi-status string for the API
      let finalStatus = statusFilter
      if (statusFilter === 'all') {
        finalStatus = isHistory ? 'rejected,returned,cancelled' : 'pending,approved'
      }

      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        search: debouncedSearch,
        status: finalStatus,
      })
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Status
        </Label>
        <Select
          value={statusFilter}
          onValueChange={(v) => { if (v) { setStatusFilter(v); setPage(1) } }}
        >
          <SelectTrigger className="h-9">
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
    </div>
  )

  return (
    <>
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
            header: 'Tgl Pinjam',
            render: (v) => formatDate(v as string),
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
              <div className="flex gap-1 justify-end">
                <Button
                  variant="ghost" size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/5"
                  title="Lihat Detail"
                  onClick={() => setDetailLoan(row)}
                >
                  <Eye size={16} />
                </Button>

                {row.status === 'pending' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-red-50"
                    onClick={() => setCancelLoan(row)}
                    title="Batalkan"
                  >
                    <X size={15} />
                  </Button>
                )}
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
        searchPlaceholder="Cari tujuan peminjaman..."
        filters={filterBar}
        actions={
          !isHistory && (
            <Button size="sm" onClick={() => setRequestOpen(true)}>
              <Plus size={14} className="mr-1.5" />
              Pinjam Barang
            </Button>
          )
        }
        emptyText={isHistory ? "Belum ada riwayat peminjaman" : "Belum ada peminjaman aktif"}
      />

      <LoanDetailModal
        loan={detailLoan}
        open={!!detailLoan}
        onOpenChange={(o) => !o && setDetailLoan(null)}
      />

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
    </>
  )
}
