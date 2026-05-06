'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  User, 
  Calendar, 
  Package, 
  Warehouse, 
  Info, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ClipboardList,
  FileText,
  UserCheck
 } from 'lucide-react'
import { formatDateTime, formatDate } from '@/lib/utils'
import type { ItemLoan } from '@/types/database'
import { LoanStatusBadge } from './loan-status-badge'

type LoanWithJoins = ItemLoan & {
  item?: { id: string; name: string; price?: number }
  warehouse?: { id: string; name: string }
  requester?: { id: string; full_name: string }
  actioner?: { id: string; full_name: string }
}

interface LoanDetailModalProps {
  loan: LoanWithJoins | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LoanDetailModal({ loan, open, onOpenChange }: LoanDetailModalProps) {
  if (!loan) return null

  const isApprovedOrReturned = loan.status === 'approved' || loan.status === 'returned'
  const isRejected = loan.status === 'rejected'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl overflow-hidden p-0 gap-0">
        <DialogHeader className="p-8 pb-6 bg-muted/20 border-b">
          <div className="flex items-center justify-between pr-12">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <ClipboardList size={24} />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold tracking-tight">
                  Detail Peminjaman
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  ID Transaksi: {loan.id.split('-')[0].toUpperCase()}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <LoanStatusBadge status={loan.status} />
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                Status Saat Ini
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-8 space-y-10 max-h-[80vh] overflow-y-auto">
          {/* Main Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Left Column: Stakeholders & Items */}
            <div className="space-y-8 min-w-0">
              <section className="space-y-4">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                  <User size={14} className="text-primary" /> Informasi Peminjam
                </h3>
                <div className="bg-muted/30 p-5 rounded-2xl border border-muted-foreground/10">
                  <p className="font-bold text-base text-foreground">{loan.requester?.full_name ?? '—'}</p>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                    ID: {loan.requested_by}
                  </p>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                  <Package size={14} className="text-primary" /> Rincian Barang
                </h3>
                <div className="bg-muted/30 p-5 rounded-2xl border border-muted-foreground/10 flex items-center justify-between">
                  <div className="space-y-1.5">
                    <p className="font-bold text-lg text-foreground leading-none">{loan.item?.name ?? '—'}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Warehouse size={14} className="opacity-70" /> {loan.warehouse?.name ?? '—'}
                    </p>
                  </div>
                  <div className="h-14 w-14 rounded-xl bg-background border shadow-sm flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-primary leading-none">{loan.quantity}</span>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Unit</span>
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column: Timeline & Handled By */}
            <div className="space-y-8 min-w-0">
              <section className="space-y-4">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                  <Calendar size={14} className="text-primary" /> Timeline Peminjaman
                </h3>
                <div className="space-y-4 bg-muted/10 p-5 rounded-2xl border border-dashed border-muted-foreground/20">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-xs">Waktu Pinjam</span>
                      <span className="font-bold mt-0.5">{formatDateTime(loan.loan_date)}</span>
                    </div>
                    <div className="h-px flex-1 mx-4 bg-muted-foreground/10" />
                    <div className="flex flex-col text-right">
                      <span className="text-muted-foreground text-xs">Batas Waktu Kembali</span>
                      <span className="font-bold mt-0.5 text-amber-600">
                        {loan.return_date ? formatDateTime(loan.return_date) : 'Flexible'}
                      </span>
                    </div>
                  </div>
                  
                  {loan.actual_return_date && (
                    <div className="pt-4 border-t border-muted-foreground/10 flex items-center justify-between">
                      <span className="text-sm font-bold text-green-600 flex items-center gap-2">
                        <CheckCircle2 size={16} /> Waktu Dikembalikan
                      </span>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-bold">
                        {formatDateTime(loan.actual_return_date)}
                      </Badge>
                    </div>
                  )}
                </div>
              </section>

              {/* Actioner Info */}
              {(loan.actioned_by || isRejected) && (
                <section className="space-y-4">
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                    <UserCheck size={14} className="text-primary" /> Penanganan Request
                  </h3>
                  <div className="bg-muted/30 p-5 rounded-2xl border border-muted-foreground/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">Oleh</span>
                      <Badge variant="secondary" className="font-bold px-3 py-1">
                        {loan.actioner?.full_name ?? 'Sistem / Admin'}
                      </Badge>
                    </div>
                    {isRejected && loan.rejection_note && (
                      <div className="space-y-2 p-3 bg-destructive/5 rounded-xl border border-destructive/10">
                        <span className="text-[10px] font-black uppercase text-destructive tracking-wider">Alasan Penolakan</span>
                        <p className="text-sm italic text-muted-foreground leading-relaxed">
                          "{loan.rejection_note}"
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>
          </div>

          <Separator className="opacity-50" />

          {/* Purpose & Notes */}
          <div className="space-y-6">
            <section className="space-y-3">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <FileText size={14} className="text-primary" /> Tujuan & Keterangan
              </h3>
              <div className="bg-muted/10 p-6 rounded-2xl border border-muted-foreground/10">
                <p className="text-sm leading-relaxed font-medium text-foreground italic">
                  "{loan.purpose}"
                </p>
                {loan.note && (
                  <div className="mt-4 pt-4 border-t border-muted-foreground/10">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      <span className="font-bold text-[10px] uppercase mr-2 opacity-70">Catatan:</span>
                      {loan.note}
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        <div className="p-6 px-8 bg-muted/10 border-t flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground font-medium">
            Sistem Manajemen Peminjaman Gudang IDN
          </p>
          <Badge variant="outline" className="font-mono text-[9px] opacity-40 uppercase tracking-tighter">
            Created: {formatDateTime(loan.created_at!)}
          </Badge>
        </div>
      </DialogContent>
    </Dialog>
  )
}
