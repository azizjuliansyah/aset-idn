import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Calendar as CalendarIcon, XCircle, RotateCcw, Info, Warehouse as WarehouseIcon, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { LoanDetailModal } from '../loan-detail-modal'
import type { LoanWithJoins } from '@/hooks/loans/use-ga-loans'
import { useWarehouses } from '@/hooks/queries/use-warehouses'
import { formatDateTime } from '@/lib/utils'
import { Separator } from '@base-ui/react'
import { toast } from 'sonner'

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
  remindTarget: LoanWithJoins | null
  setRemindTarget: (loan: LoanWithJoins | null) => void
  overdueConfirm: boolean
  setOverdueConfirm: (open: boolean) => void
  onAction: (id: string, action: string, extra?: any) => void
  onDelete: (id: string) => void
  onRemind: (id: string) => void
  onRemindOverdue: () => void
  isPending: boolean
  isDeleting: boolean
  isReminding: boolean
  isRemindingOverdue: boolean
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
  remindTarget,
  setRemindTarget,
  overdueConfirm,
  setOverdueConfirm,
  onAction,
  onDelete,
  onRemind,
  onRemindOverdue,
  isPending,
  isDeleting,
  isReminding,
  isRemindingOverdue,
}: GaLoansDialogsProps) {
  const [rejectionNote, setRejectionNote] = useState('')
  const [actualReturnDate, setActualReturnDate] = useState(new Date().toISOString().slice(0, 16))
  const [expectedReturnDate, setExpectedReturnDate] = useState('')
  const [itemsExtra, setItemsExtra] = useState<Record<string, { warehouse_id: string, status: 'approved' | 'rejected' }>>({})
  const [partialReturns, setPartialReturns] = useState<Record<string, { quantity: number, note: string }>>({})

  const { data: warehouses } = useWarehouses()
  const supabase = createClient()

  // Set default warehouses, status and return date when approveTarget changes
  useEffect(() => {
    if (approveTarget && warehouses && warehouses.length > 0) {
      const defaultWhId = warehouses.find(w => w.is_default)?.id || warehouses[0].id
      const initial: Record<string, { warehouse_id: string, status: 'approved' | 'rejected' }> = {}
      approveTarget.items?.forEach(item => {
        initial[item.item_id] = {
          warehouse_id: item.warehouse_id || defaultWhId,
          status: 'approved'
        }
      })
      setItemsExtra(initial)

      // Set initial expected return date
      if (approveTarget.return_date) {
        setExpectedReturnDate(new Date(approveTarget.return_date).toISOString().slice(0, 16))
      }
    }
  }, [approveTarget, warehouses])

  // Initialize partial returns state when returnTarget opens
  useEffect(() => {
    if (returnTarget) {
      const initial: Record<string, { quantity: number, note: string }> = {}
      returnTarget.items?.filter(i => i.status === 'approved').forEach(item => {
        const remaining = (item.quantity || 0) - (item.returned_quantity || 0)
        initial[item.id] = {
          quantity: 0,
          note: ''
        }
      })
      setPartialReturns(initial)
    }
  }, [returnTarget])

  // Check stock for all items in approval target with their respective warehouses
  const { data: stockInfo, isFetching: isCheckingStock } = useQuery({
    queryKey: ['check_stock_approval', approveTarget?.id, itemsExtra],
    queryFn: async () => {
      if (!approveTarget?.items || Object.keys(itemsExtra).length === 0) return null

      const results: Record<string, number> = {}

      const checkPromises = approveTarget.items.map(async (item) => {
        const whId = itemsExtra[item.item_id]?.warehouse_id
        if (!whId) return

        const { data } = await supabase
          .from('stock_ledger')
          .select('current_stock')
          .eq('item_id', item.item_id)
          .eq('warehouse_id', whId)
          .single()

        results[`${item.item_id}-${whId}`] = data?.current_stock ?? 0
      })

      await Promise.all(checkPromises)
      return results
    },
    enabled: !!approveTarget && Object.keys(itemsExtra).length > 0,
  })

  const itemsWithInsufficientStock = approveTarget?.items?.filter(item => {
    const extra = itemsExtra[item.item_id]
    if (!extra || extra.status === 'rejected') return false

    const currentStock = stockInfo?.[`${item.item_id}-${extra.warehouse_id}`] ?? 0
    return currentStock < item.quantity
  }) ?? []

  const isAnyStockInsufficient = itemsWithInsufficientStock.length > 0

  return (
    <>
      <LoanDetailModal
        loan={detailLoan}
        open={!!detailLoan}
        onOpenChange={(o) => !o && setDetailLoan(null)}
      />

      <Dialog open={!!approveTarget} onOpenChange={(o) => !o && setApproveTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 size={18} />
              Setujui Peminjaman
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-muted/30 p-3 rounded-lg border border-dashed space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Daftar Barang & Pengaturan:</p>
              <div className="space-y-4">
                {approveTarget?.items?.map((item, i) => {
                  const extra = itemsExtra[item.item_id]
                  const whId = extra?.warehouse_id
                  const status = extra?.status ?? 'approved'
                  const currentStock = stockInfo?.[`${item.item_id}-${whId}`] ?? 0
                  const isLow = currentStock < item.quantity && status === 'approved'
                  const isNoStock = currentStock <= 0 && !isCheckingStock && whId

                  return (
                    <div key={i} className={`space-y-3 pb-4 border-b border-muted last:border-0 last:pb-0 transition-all ${status === 'rejected' ? 'bg-destructive/5 -mx-3 px-3 py-3 rounded-lg border-b-0' : ''}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col min-w-0">
                          <span className={`text-sm font-bold truncate ${status === 'rejected' ? 'line-through opacity-40' : 'text-foreground'}`}>
                            {item.item?.name}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-bold uppercase tracking-tighter">
                              {item.quantity}
                            </Badge>
                            {!isCheckingStock && whId && status === 'approved' && (
                              <span className={`text-[10px] font-bold ${isLow ? 'text-destructive' : 'text-emerald-600'}`}>
                                Stok: {currentStock}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status Toggle - Hidden if stock is <= 0 */}
                        {!isNoStock ? (
                          <div className="flex bg-muted rounded-lg p-1 shrink-0 ml-4 shadow-inner border border-muted-foreground/10">
                            <button
                              type="button"
                              onClick={() => setItemsExtra(prev => ({ ...prev, [item.item_id]: { ...prev[item.item_id], status: 'approved' } }))}
                              className={`px-3 py-1 text-[10px] rounded-md transition-all ${status === 'approved' ? 'bg-emerald-600 text-white shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                              SETUJUI
                            </button>
                            <button
                              type="button"
                              onClick={() => setItemsExtra(prev => ({ ...prev, [item.item_id]: { ...prev[item.item_id], status: 'rejected' } }))}
                              className={`px-3 py-1 text-[10px] rounded-md transition-all ${status === 'rejected' ? 'bg-destructive text-white shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                              TOLAK
                            </button>
                          </div>
                        ) : (
                          <Badge variant="destructive" className="h-6 px-2 text-[9px] uppercase animate-pulse shrink-0 ml-4">
                            STOK KOSONG / MINUS
                          </Badge>
                        )}
                      </div>

                      {status === 'approved' && (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 px-0.5">
                            <WarehouseIcon size={10} className="text-muted-foreground" />
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Gudang Pengambil</span>
                          </div>
                          <Select
                            value={whId}
                            onValueChange={(val) => setItemsExtra(prev => ({ ...prev, [item.item_id]: { ...prev[item.item_id], warehouse_id: val } }))}
                          >
                            <SelectTrigger className="h-9 text-xs bg-background/50 border-muted-foreground/10 focus:ring-primary/20">
                              <SelectValue placeholder="Pilih gudang" />
                            </SelectTrigger>
                            <SelectContent>
                              {warehouses?.map((w) => (
                                <SelectItem key={w.id} value={w.id} className="text-xs">{w.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="p-3 rounded-lg border border-primary/10 space-y-2">
              <Label htmlFor="expected-return-date" className="text-xs font-bold uppercase text-primary tracking-tighter">Batas Waktu Pengembalian</Label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-primary pointer-events-none" />
                <Input
                  id="expected-return-date"
                  type="datetime-local"
                  className="pl-9 border-primary/20 focus:ring-primary/20 h-9 text-xs"
                  value={expectedReturnDate}
                  onChange={(e) => setExpectedReturnDate(e.target.value)}
                />
              </div>
              <p className="text-[10px] text-muted-foreground italic px-1">GA dapat merubah batas waktu jika diperlukan</p>
            </div>

            {isCheckingStock && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Loader2 size={10} className="animate-spin" /> Mengecek stok...
              </p>
            )}

            {isAnyStockInsufficient && (
              <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex gap-2 items-start">
                <AlertTriangle size={16} className="text-destructive shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-destructive">Peringatan: Stok Kurang</p>
                  <p className="text-[11px] text-red-700 leading-relaxed">
                    Beberapa barang di gudang yang dipilih tidak mencukupi stoknya. Pastikan stok fisik tersedia sebelum melanjutkan.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setApproveTarget(null)}>Batal</Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => {
                // Pre-process itemsExtra to mark zero/negative stock items as rejected
                const finalItemsExtra = { ...itemsExtra }
                approveTarget?.items?.forEach(item => {
                  const whId = finalItemsExtra[item.item_id]?.warehouse_id
                  const currentStock = stockInfo?.[`${item.item_id}-${whId}`] ?? 0
                  if (currentStock <= 0 && !isCheckingStock) {
                    finalItemsExtra[item.item_id].status = 'rejected'
                  }
                })
                onAction(approveTarget!.id, 'approve', {
                  items_extra: finalItemsExtra,
                  return_date: expectedReturnDate
                })
              }}
              disabled={isPending || Object.keys(itemsExtra).length === 0 || isCheckingStock}
            >
              {isPending ? <><Loader2 size={14} className="mr-1.5 animate-spin" />Memproses...</> : 'Setujui Peminjaman'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!undoTarget}
        onOpenChange={(o) => !o && setUndoTarget(null)}
        title="Batalkan Status Kembali"
        confirmText="Ya, Batalkan"
        loadingText="Memproses..."
        variant="destructive"
        description="Apakah Anda yakin ingin membatalkan status 'Sudah Kembali' untuk peminjaman ini?"
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
        description={`Apakah Anda yakin ingin menghapus data peminjaman oleh ${deleteTarget?.requester?.full_name || 'User'}? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={() => onDelete(deleteTarget!.id)}
        loading={isDeleting}
      />

      <ConfirmDialog
        open={!!remindTarget}
        onOpenChange={(o) => !o && setRemindTarget(null)}
        title="Kirim Pengingat WhatsApp"
        confirmText="Kirim Pengingat"
        loadingText="Mengirim..."
        variant="default"
        description={`Kirim pesan pengingat pengembalian barang via WhatsApp ke ${remindTarget?.requester?.full_name || 'User'}?`}
        onConfirm={() => onRemind(remindTarget!.id)}
        loading={isReminding}
      />

      <ConfirmDialog
        open={overdueConfirm}
        onOpenChange={setOverdueConfirm}
        title="Kirim Pengingat Keterlambatan"
        confirmText="Kirim Sekarang"
        loadingText="Mengirim..."
        variant="default"
        description="Kirim pengingat WhatsApp ke semua peminjam yang sudah melewati batas waktu pengembalian? Pesan akan dikirim satu per satu sesuai template yang diatur."
        onConfirm={onRemindOverdue}
        loading={isRemindingOverdue}
      />

      <Dialog open={!!returnTarget} onOpenChange={(o) => !o && setReturnTarget(null)}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 py-5 border-b m-0">
            <div className="space-y-1">
              <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
                <RotateCcw size={22} className="text-blue-600" />
                Konfirmasi Pengembalian
              </DialogTitle>
              <div className="flex items-center gap-2 px-0.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Peminjam:</span>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                  {returnTarget?.requester?.full_name || 'User'}
                </span>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Timeline Info & Actual Return Input */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-muted-foreground/10">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Waktu Pinjam</span>
                    <span className="text-xs font-medium">{returnTarget ? formatDateTime(returnTarget.loan_date) : '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Batas Kembali</span>
                    <span className="text-xs font-medium text-amber-600">{returnTarget?.return_date ? formatDateTime(returnTarget.return_date) : 'Flexible'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Waktu Dikembalikan (Sekarang)</Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="datetime-local"
                    className="pl-9 h-10 text-sm font-semibold"
                    value={actualReturnDate}
                    onChange={(e) => setActualReturnDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Separator className="opacity-50" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Daftar Barang</p>
                <Badge variant="outline" className="text-[9px] font-black uppercase opacity-60">Sisa Qty</Badge>
              </div>
              
              <div className="space-y-3">
                {returnTarget?.items?.filter(i => i.status === 'approved').map((item) => {
                  const remaining = (item.quantity || 0) - (item.returned_quantity || 0)
                  if (remaining <= 0) return null

                  return (
                    <div key={item.id} className="p-4 rounded-xl border border-muted-foreground/10 bg-muted/5 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate">{item.item?.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                            <WarehouseIcon size={10} /> {item.warehouse?.name}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="text-lg font-black text-primary leading-none">{remaining}</span>
                          <span className="text-[8px] font-bold text-muted-foreground uppercase block">Unit</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-12 gap-3 pt-3 border-t border-muted-foreground/5">
                        <div className="col-span-4 space-y-1">
                          <Label className="text-[9px] font-bold uppercase opacity-60">Jml Kembali</Label>
                          <Input
                            type="number"
                            min={0}
                            max={remaining}
                            className="h-8 text-xs font-bold"
                            value={partialReturns[item.id]?.quantity || 0}
                            onChange={(e) => {
                              const val = Math.min(remaining, Math.max(0, parseInt(e.target.value) || 0))
                              setPartialReturns(prev => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], quantity: val }
                              }))
                            }}
                          />
                        </div>
                        <div className="col-span-8 space-y-1">
                          <Label className="text-[9px] font-bold uppercase opacity-60">Catatan Kondisi</Label>
                          <Input
                            placeholder="Kondisi barang..."
                            className="h-8 text-xs"
                            value={partialReturns[item.id]?.note || ''}
                            onChange={(e) => {
                              setPartialReturns(prev => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], note: e.target.value }
                              }))
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 bg-muted/5 border-t flex items-center justify-end gap-3 m-0">
            <Button variant="outline" onClick={() => setReturnTarget(null)} className="h-9 px-4">
              Batal
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 px-6"
              onClick={() => {
                const finalReturns: Record<string, any> = {}
                Object.entries(partialReturns).forEach(([id, data]) => {
                  if (data.quantity > 0) {
                    finalReturns[id] = data
                  }
                })
                
                if (Object.keys(finalReturns).length === 0) {
                  toast.error('Pilih minimal 1 barang untuk dikembalikan')
                  return
                }

                onAction(returnTarget!.id, 'partial_return', { 
                  returns: finalReturns,
                  actual_return_date: actualReturnDate 
                })
              }}
              disabled={isPending || Object.values(partialReturns).every(v => v.quantity <= 0)}
            >
              {isPending ? <><Loader2 size={14} className="mr-1.5 animate-spin" />Memproses...</> : 'Simpan Pengembalian'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><XCircle size={18} />Tolak Peminjaman</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Anda akan menolak pengajuan peminjaman oleh <strong>{rejectTarget?.requester?.full_name || 'User'}</strong>.
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
