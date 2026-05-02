'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, RotateCcw, Loader2, Undo2, Calendar as CalendarIcon, Eye, UserCheck } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'

import type { ItemLoan } from '@/types/database'
import { DataTable } from '@/components/shared/data-table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { LoanStatusBadge } from './loan-status-badge'
import { LoanDetailModal } from './loan-detail-modal'
import { formatDate } from '@/lib/utils'

const PAGE_SIZE = 10

type LoanWithJoins = ItemLoan & {
  item?: { id: string; name: string }
  warehouse?: { id: string; name: string }
  requester?: { id: string; full_name: string }
  actioner?: { id: string; full_name: string }
}

interface GaLoansClientProps {
  isHistory?: boolean
}

export function GaLoansClient({ isHistory = false }: GaLoansClientProps) {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  
  // Use 'all' as visual state to avoid the internal string appearing in trigger
  const [statusFilter, setStatusFilter] = useState('all')
  const [actionedByFilter, setActionedByFilter] = useState('all')

  const [detailLoan, setDetailLoan] = useState<LoanWithJoins | null>(null)
  const [approveTarget, setApproveTarget] = useState<LoanWithJoins | null>(null)
  const [rejectTarget, setRejectTarget] = useState<LoanWithJoins | null>(null)
  const [returnTarget, setReturnTarget] = useState<LoanWithJoins | null>(null)
  const [undoTarget, setUndoTarget] = useState<LoanWithJoins | null>(null)
  
  const [rejectionNote, setRejectionNote] = useState('')
  const [actualReturnDate, setActualReturnDate] = useState(new Date().toISOString().split('T')[0])

  // Fetch handlers (admin/GA)
  const { data: handlers } = useQuery({
    queryKey: ['profiles', 'handlers'],
    queryFn: async () => {
      const res = await fetch('/api/v1/profiles?role=admin,general_affair')
      if (!res.ok) throw new Error('Gagal memuat list admin/ga')
      return await res.json() as { id: string; full_name: string }[]
    }
  })

  const { data, isLoading } = useQuery({
    queryKey: ['loans_ga', page, debouncedSearch, statusFilter, actionedByFilter, isHistory],
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
        actioned_by: actionedByFilter,
      })
      const res = await fetch(`/api/v1/loans?${params}`)
      if (!res.ok) throw new Error('Gagal memuat data')
      return await res.json() as { data: LoanWithJoins[]; count: number }
    },
  })

  const doAction = async (id: string, action: string, extra?: Record<string, any>) => {
    const res = await fetch(`/api/v1/loans/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error ?? 'Gagal memproses')
    }
  }

  const approveMutation = useMutation({
    mutationFn: () => doAction(approveTarget!.id, 'approve'),
    onSuccess: () => {
      toast.success('Peminjaman disetujui')
      qc.invalidateQueries({ queryKey: ['loans_ga'] })
      setApproveTarget(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const rejectMutation = useMutation({
    mutationFn: () => doAction(rejectTarget!.id, 'reject', { rejection_note: rejectionNote }),
    onSuccess: () => {
      toast.success('Peminjaman ditolak')
      qc.invalidateQueries({ queryKey: ['loans_ga'] })
      setRejectTarget(null)
      setRejectionNote('')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const returnMutation = useMutation({
    mutationFn: () => doAction(returnTarget!.id, 'return', { actual_return_date: actualReturnDate }),
    onSuccess: () => {
      toast.success('Peminjaman ditandai dikembalikan')
      qc.invalidateQueries({ queryKey: ['loans_ga'] })
      setReturnTarget(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const undoMutation = useMutation({
    mutationFn: () => doAction(undoTarget!.id, 'undo_return'),
    onSuccess: () => {
      toast.success('Status pengembalian dibatalkan')
      qc.invalidateQueries({ queryKey: ['loans_ga'] })
      setUndoTarget(null)
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
          onValueChange={(v) => { if(v) { setStatusFilter(v); setPage(1) } }}
        >
          <SelectTrigger className="h-9">
            <SelectValue>
              {statusFilter === 'all' 
                ? `Semua ${isHistory ? 'Riwayat' : 'Kelola'}`
                : statusFilter === 'pending' ? 'Menunggu Persetujuan'
                : statusFilter === 'approved' ? 'Disetujui (Belum Kembali)'
                : statusFilter === 'rejected' ? 'Ditolak'
                : statusFilter === 'returned' ? 'Sudah Kembali'
                : 'Dibatalkan'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua {isHistory ? 'Riwayat' : 'Kelola'}</SelectItem>
            {!isHistory && <SelectItem value="pending">Menunggu Persetujuan</SelectItem>}
            {!isHistory && <SelectItem value="approved">Disetujui (Belum Kembali)</SelectItem>}
            {isHistory && <SelectItem value="rejected">Ditolak</SelectItem>}
            {isHistory && <SelectItem value="returned">Sudah Kembali</SelectItem>}
            {isHistory && <SelectItem value="cancelled">Dibatalkan</SelectItem>}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Ditangani Oleh
        </Label>
        <Select
          value={actionedByFilter}
          onValueChange={(v) => { if(v) { setActionedByFilter(v); setPage(1) } }}
        >
          <SelectTrigger className="h-9">
            <div className="flex items-center gap-2 truncate">
              <UserCheck size={14} className="text-muted-foreground shrink-0" />
              <SelectValue>
                {actionedByFilter === 'all' 
                  ? "Semua Penangan" 
                  : handlers?.find(h => h.id === actionedByFilter)?.full_name || "Memuat..."}
              </SelectValue>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Penangan</SelectItem>
            {handlers?.map((h) => (
              <SelectItem key={h.id} value={h.id}>{h.full_name}</SelectItem>
            ))}
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
            key: 'requester',
            header: 'Peminjam',
            render: (_, row) => (
              <span className="font-medium">{row.requester?.full_name ?? '—'}</span>
            ),
          },
          {
            key: 'item',
            header: 'Barang',
            render: (_, row) => row.item?.name ?? '—',
          },
          {
            key: 'warehouse',
            header: 'Gudang',
            render: (_, row) => row.warehouse?.name ?? '—',
          },
          {
            key: 'quantity',
            header: 'Jml',
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
            header: 'Aksi',
            className: 'w-44 text-right',
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
                  <>
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                      title="Setujui"
                      onClick={() => setApproveTarget(row)}
                    >
                      <CheckCircle2 size={16} />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-red-50"
                      title="Tolak"
                      onClick={() => { setRejectTarget(row); setRejectionNote('') }}
                    >
                      <XCircle size={16} />
                    </Button>
                  </>
                )}
                {row.status === 'approved' && (
                  <Button
                    variant="ghost" size="sm"
                    className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1.5 px-2"
                    title="Tandai Dikembalikan"
                    onClick={() => {
                      setReturnTarget(row)
                      setActualReturnDate(new Date().toISOString().split('T')[0])
                    }}
                  >
                    <RotateCcw size={14} />
                    <span className="text-xs font-semibold">Kembalikan</span>
                  </Button>
                )}
                {row.status === 'returned' && (
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    title="Batalkan Status Kembali"
                    onClick={() => setUndoTarget(row)}
                  >
                    <Undo2 size={14} />
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
        emptyText={isHistory ? "Belum ada riwayat peminjaman" : "Tidak ada peminjaman yang perlu ditangani"}
      />

      <LoanDetailModal
        loan={detailLoan}
        open={!!detailLoan}
        onOpenChange={(o) => !o && setDetailLoan(null)}
      />

      {/* Approve Confirm */}
      <ConfirmDialog
        open={!!approveTarget}
        onOpenChange={(o) => !o && setApproveTarget(null)}
        title="Setujui Peminjaman"
        confirmText="Setujui"
        loadingText="Menyetujui..."
        variant="success"
        description={`Setujui peminjaman "${approveTarget?.item?.name}" oleh ${approveTarget?.requester?.full_name || 'User'}?`}
        onConfirm={() => approveMutation.mutate()}
        loading={approveMutation.isPending}
      />

      {/* Undo Return Confirm */}
      <ConfirmDialog
        open={!!undoTarget}
        onOpenChange={(o) => !o && setUndoTarget(null)}
        title="Batalkan Status Kembali"
        confirmText="Ya, Batalkan"
        loadingText="Memproses..."
        variant="destructive"
        description={`Apakah Anda yakin ingin membatalkan status "Sudah Kembali" untuk peminjaman ${undoTarget?.item?.name}?`}
        onConfirm={() => undoMutation.mutate()}
        loading={undoMutation.isPending}
      />

      {/* Return Dialog with date picker */}
      <Dialog open={!!returnTarget} onOpenChange={(o) => !o && setReturnTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw size={18} className="text-blue-600" />
              Konfirmasi Pengembalian
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Tandai bahwa <strong>{returnTarget?.item?.name}</strong> telah dikembalikan oleh <strong>{returnTarget?.requester?.full_name || 'User'}</strong>.
            </p>
            <div className="space-y-2">
              <Label htmlFor="return-date" className="text-xs font-bold uppercase text-muted-foreground">
                Tanggal Pengembalian
              </Label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="return-date"
                  type="date"
                  className="pl-9"
                  value={actualReturnDate}
                  onChange={(e) => setActualReturnDate(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReturnTarget(null)}>
              Batal
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => returnMutation.mutate()}
              disabled={returnMutation.isPending}
            >
              {returnMutation.isPending ? (
                <><Loader2 size={14} className="mr-1.5 animate-spin" />Memproses...</>
              ) : (
                'Konfirmasi Kembali'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle size={18} />
              Tolak Peminjaman
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Anda akan menolak peminjaman{' '}
              <strong>{rejectTarget?.item?.name}</strong> oleh{' '}
              <strong>{rejectTarget?.requester?.full_name || 'User'}</strong>.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="reject-note">Alasan Penolakan</Label>
              <Textarea
                id="reject-note"
                rows={3}
                placeholder="Opsional: berikan alasan penolakan..."
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectMutation.mutate()}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending
                ? <><Loader2 size={14} className="mr-1.5 animate-spin" />Menolak...</>
                : 'Tolak'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
