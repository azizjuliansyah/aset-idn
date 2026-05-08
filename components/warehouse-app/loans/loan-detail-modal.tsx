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
  Warehouse as WarehouseIcon, 
  Info, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ClipboardList,
  FileText,
  UserCheck,
  RotateCcw
 } from 'lucide-react'
import { formatDateTime, formatDate } from '@/lib/utils'
import type { LoanRequest, LoanItem, Item, Warehouse, Profile, LoanWithJoins } from '@/types/database'
import { LoanStatusBadge } from './loan-status-badge'



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
        <DialogHeader className="p-8 pb-6 bg-muted/20 border-b m-0">
          <div className="flex items-center justify-between pr-12">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <ClipboardList size={24} />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold tracking-tight">
                  Detail Peminjaman
                </DialogTitle>

              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <LoanStatusBadge status={loan.status} />
            </div>
          </div>
        </DialogHeader>

        <div className="p-8 space-y-10 max-h-[80vh] overflow-y-auto">
          {/* Single Column Layout */}
          <div className="space-y-10">
            {/* 1. Header Info: Requester & Timeline */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <section className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                  <User size={12} className="text-primary" /> Peminjam
                </h3>
                <div className="bg-muted/30 p-4 rounded-xl border border-muted-foreground/10">
                  <p className="font-bold text-base text-foreground">{loan.atas_nama || loan.requester?.full_name || '—'}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1.5 font-medium">
                    {loan.is_by_ga && loan.atas_nama ? `Dibuat oleh: ${loan.requester?.full_name}` : ''}
                  </p>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                  <Calendar size={12} className="text-primary" /> Timeline
                </h3>
                <div className="bg-muted/30 p-4 rounded-xl border border-muted-foreground/10 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Pinjam</span>
                    <span className="text-xs font-bold mt-0.5">{formatDateTime(loan.loan_date)}</span>
                  </div>
                  <div className="h-8 w-px bg-muted-foreground/10 mx-4" />
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Batas Kembali</span>
                    <span className="text-xs font-bold mt-0.5 text-amber-600">
                      {loan.return_date ? formatDateTime(loan.return_date) : 'Flexible'}
                    </span>
                  </div>
                </div>
              </section>
            </div>

            {/* 2. Items Table */}
            <section className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                <Package size={12} className="text-primary" /> Rincian Barang
              </h3>
              <div className="rounded-xl border border-muted-foreground/10 overflow-hidden bg-muted/5">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b border-muted-foreground/10">
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Nama Barang</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Gudang</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground text-center">Pinjam</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground text-center">Kembali</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-muted-foreground/10">
                    {loan.items?.map((item, i) => (
                      <tr key={i} className={`text-xs transition-colors hover:bg-muted/20 ${item.status === 'rejected' ? 'bg-destructive/5' : ''}`}>
                        <td className="px-4 py-3 font-bold text-foreground">
                          <div className="flex flex-col gap-0.5">
                            <span className={item.status === 'rejected' ? 'line-through opacity-50' : ''}>
                              {item.item?.name ?? '—'}
                            </span>
                            {item.status === 'rejected' && (
                              <span className="text-[9px] text-destructive font-black uppercase tracking-tighter">Tidak Disetujui</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-medium">
                          <div className="flex items-center gap-1.5">
                            <WarehouseIcon size={10} className="opacity-50" />
                            {item.warehouse?.name ?? '—'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-black text-sm text-primary">{item.quantity}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-black text-sm ${item.returned_quantity > 0 ? 'text-blue-600' : 'text-muted-foreground/30'}`}>
                            {item.returned_quantity || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {item.status === 'rejected' ? (
                            <XCircle size={14} className="text-destructive ml-auto" />
                          ) : item.returned_quantity >= item.quantity ? (
                            <CheckCircle2 size={14} className="text-blue-600 ml-auto" />
                          ) : item.status === 'approved' && isApprovedOrReturned ? (
                            <Clock size={14} className="text-amber-500 ml-auto" />
                          ) : (
                            <Clock size={14} className="text-muted-foreground ml-auto opacity-30" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 3. Return History Log */}
            {loan.items?.some(item => (item.returns?.length ?? 0) > 0) && (
              <section className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                  <RotateCcw size={12} className="text-blue-600" /> Riwayat Pengembalian
                </h3>
                <div className="space-y-2">
                  {loan.items.flatMap(item =>
                    (item.returns || []).map(ret => ({ ...ret, itemName: item.item?.name }))
                  )
                  .sort((a, b) => new Date(b.returned_at).getTime() - new Date(a.returned_at).getTime())
                  .map((log, idx) => (
                    <div key={idx} className="bg-blue-50/30 p-3 rounded-xl border border-blue-100/50 flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-blue-900">{log.itemName}</p>
                        {log.note && <p className="text-[10px] text-blue-700 italic">"{log.note}"</p>}
                        <p className="text-[9px] text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock size={8} /> {formatDateTime(log.returned_at)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge className="bg-blue-600 text-white font-black text-[10px]">+{log.quantity}</Badge>
                        <p className="text-[8px] uppercase font-bold text-muted-foreground mt-1">Kembali</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 4. Handled By & Actual Return (If any) */}
            {(loan.actioned_by || loan.actual_return_date) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {loan.actual_return_date && (
                  <section className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                      <CheckCircle2 size={12} className="text-emerald-600" /> Selesai
                    </h3>
                    <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-700">Waktu Closing</span>
                      <Badge variant="outline" className="bg-white text-emerald-700 border-emerald-200 font-black text-[10px]">
                        {formatDateTime(loan.actual_return_date)}
                      </Badge>
                    </div>
                  </section>
                )}

                {loan.actioned_by && (
                  <section className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                      <UserCheck size={12} className="text-primary" /> Verifikasi GA
                    </h3>
                    <div className="bg-muted/30 p-4 rounded-xl border border-muted-foreground/10 flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground">Petugas</span>
                      <span className="text-xs font-black text-foreground">{loan.actioner?.full_name ?? '—'}</span>
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>

          <Separator className="opacity-50" />

          {/* Purpose & Notes */}
          <div className="space-y-6">
            <section className="space-y-3">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <FileText size={14} className="text-primary" /> Tujuan & Keterangan
              </h3>
              <div className="bg-muted/10 p-6 rounded-2xl border border-muted-foreground/10 space-y-4">
                <p className="text-sm leading-relaxed font-medium text-foreground italic">
                  "{loan.purpose}"
                </p>
                
                {loan.items?.some(i => i.status === 'rejected') && (
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex gap-2 items-start">
                    <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                      Beberapa barang dalam pengajuan ini ditolak/tidak disetujui oleh GA. Silakan cek rincian barang di atas.
                    </p>
                  </div>
                )}

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
