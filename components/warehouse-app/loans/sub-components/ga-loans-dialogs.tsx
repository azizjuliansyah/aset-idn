import { useState } from 'react'
import { Loader2, Calendar as CalendarIcon, XCircle, RotateCcw, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { LoanDetailModal } from '../loan-detail-modal'
import type { LoanWithJoins } from '@/hooks/loans/use-ga-loans'

interface GaLoansDialogsProps {
  detailLoan: LoanWithJoins | null
  setDetailLoan: (loan: LoanWithJoins | null) => void
  approveTarget: LoanWithJoins | null
  setApproveTarget: (loan: LoanWithJoins | null) => void
  rejectTarget: LoanWithJoins | null
  setRejectTarget: (loan: LoanWithJoins | null) => void
  returnTarget: LoanWithJoins | null
  setReturnTarget: (loan: LoanWithJoins | null) => void
  undoTarget: LoanWithJoins | null
  setUndoTarget: (loan: LoanWithJoins | null) => void
  deleteTarget: LoanWithJoins | null
  setDeleteTarget: (loan: LoanWithJoins | null) => void
  onAction: (id: string, action: string, extra?: any) => void
  onDelete: (id: string) => void
  isPending: boolean
  isDeleting: boolean
}

export function GaLoansDialogs({
  detailLoan,
  setDetailLoan,
  approveTarget,
  setApproveTarget,
  rejectTarget,
  setRejectTarget,
  returnTarget,
  setReturnTarget,
  undoTarget,
  setUndoTarget,
  deleteTarget,
  setDeleteTarget,
  onAction,
  onDelete,
  isPending,
  isDeleting,
}: GaLoansDialogsProps) {
  const [rejectionNote, setRejectionNote] = useState('')
  const [actualReturnDate, setActualReturnDate] = useState(new Date().toISOString().split('T')[0])

  return (
    <>
      <LoanDetailModal
        loan={detailLoan}
        open={!!detailLoan}
        onOpenChange={(o) => !o && setDetailLoan(null)}
      />

      <ConfirmDialog
        open={!!approveTarget}
        onOpenChange={(o) => !o && setApproveTarget(null)}
        title="Setujui Peminjaman"
        confirmText="Setujui"
        loadingText="Menyetujui..."
        variant="success"
        description={`Setujui peminjaman "${approveTarget?.item?.name}" oleh ${approveTarget?.requester?.full_name || 'User'}?`}
        onConfirm={() => onAction(approveTarget!.id, 'approve')}
        loading={isPending}
      />

      <ConfirmDialog
        open={!!undoTarget}
        onOpenChange={(o) => !o && setUndoTarget(null)}
        title="Batalkan Status Kembali"
        confirmText="Ya, Batalkan"
        loadingText="Memproses..."
        variant="destructive"
        description={`Apakah Anda yakin ingin membatalkan status "Sudah Kembali" untuk peminjaman ${undoTarget?.item?.name}?`}
        onConfirm={() => onAction(undoTarget!.id, 'undo_return')}
        loading={isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Hapus Peminjaman"
        confirmText="Ya, Hapus"
        loadingText="Menghapus..."
        variant="destructive"
        description={`Apakah Anda yakin ingin menghapus data peminjaman "${deleteTarget?.item?.name}" oleh ${deleteTarget?.requester?.full_name || 'User'}? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={() => onDelete(deleteTarget!.id)}
        loading={isDeleting}
      />

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
              <Label htmlFor="return-date" className="text-xs font-bold uppercase text-muted-foreground">Tanggal Pengembalian</Label>
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
            <Button variant="outline" onClick={() => setReturnTarget(null)}>Batal</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => onAction(returnTarget!.id, 'return', { actual_return_date: actualReturnDate })}
              disabled={isPending}
            >
              {isPending ? <><Loader2 size={14} className="mr-1.5 animate-spin" />Memproses...</> : 'Konfirmasi Kembali'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><XCircle size={18} />Tolak Peminjaman</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Anda akan menolak peminjaman <strong>{rejectTarget?.item?.name}</strong> oleh <strong>{rejectTarget?.requester?.full_name || 'User'}</strong>.
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
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Batal</Button>
            <Button
              variant="destructive"
              onClick={() => onAction(rejectTarget!.id, 'reject', { rejection_note: rejectionNote })}
              disabled={isPending}
            >
              {isPending ? <><Loader2 size={14} className="mr-1.5 animate-spin" />Menolak...</> : 'Tolak'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
