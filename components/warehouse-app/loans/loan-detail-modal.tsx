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
      <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[85vh] flex flex-col overflow-hidden p-0 gap-0 rounded-2xl sm:rounded-xl">
        <DialogHeader className="bg-muted/20 border-b m-0">
          <div >
            <DialogTitle className="text-base sm:text-xl font-bold tracking-tight">
              Detail Peminjaman
            </DialogTitle>
            <LoanStatusBadge status={loan.status} />
          </div>
        </DialogHeader>

        <div className="p-4 sm:p-8 space-y-6 sm:space-y-10 flex-1 overflow-y-auto">
          {/* Single Column Layout */}
          <div className="space-y-6 sm:space-y-10">
            {/* 1. Header Info: Unified Table Layout */}
            <section className="space-y-2">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                <Info size={12} className="text-primary" /> Informasi Peminjaman
              </h3>
              <div className="rounded-xl border border-muted-foreground/10 overflow-hidden bg-muted/5">
                <div className="grid grid-cols-1 md:grid-cols-2">
                  <div className="p-4 border-b md:border-b-0 md:border-r border-muted-foreground/10 space-y-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Nama Peminjam</p>
                    <p className="text-sm font-bold text-foreground">{loan.atas_nama || loan.requester?.full_name || '—'}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 font-medium">
                      {loan.is_by_ga && loan.atas_nama ? `Dibuat oleh: ${loan.requester?.full_name}` : ''}
                    </p>
                  </div>
                  <div className="p-4 border-b md:border-b-0 border-muted-foreground/10 space-y-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Yang Menyetujui / PIC</p>
                    <p className="text-sm font-bold text-foreground">{loan.actioner?.full_name ?? '—'}</p>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter opacity-50">General Affair</p>
                  </div>
                  <div className="p-4 border-b md:border-r border-muted-foreground/10 space-y-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Tanggal Pinjam</p>
                    <p className="text-sm font-bold text-foreground">{formatDateTime(loan.loan_date)}</p>
                  </div>
                  <div className="p-4 border-b border-muted-foreground/10 space-y-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Batas Waktu Kembali</p>
                    <p className="text-sm font-bold text-amber-600">
                      {loan.return_date ? formatDateTime(loan.return_date) : 'Flexible'}
                    </p>
                  </div>
                  <div className="col-span-1 md:col-span-2 p-4 bg-muted/20 space-y-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Alasan / Tujuan</p>
                    <p className="text-sm font-medium italic text-foreground/80 leading-relaxed">
                      "{loan.purpose}"
                    </p>
                    {loan.note && (
                      <div className="mt-2 pt-2 border-t border-muted-foreground/10">
                        <p className="text-[11px] text-muted-foreground italic">
                          <span className="font-bold text-[9px] uppercase mr-2 opacity-70">Catatan GA:</span>
                          {loan.note}
                        </p>
                      </div>
                    )}
                    {isRejected && loan.rejection_note && (
                      <div className="mt-2 pt-2 border-t border-destructive/20">
                        <p className="text-[11px] text-destructive font-bold italic flex items-start gap-2">
                          <XCircle size={12} className="shrink-0 mt-0.5 opacity-70" />
                          <span>
                            <span className="font-bold text-[9px] uppercase mr-2 opacity-70 text-destructive/70">Alasan Penolakan:</span>
                            "{loan.rejection_note}"
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Items Table */}
            <section className="space-y-2">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                <Package size={12} className="text-primary" /> Rincian Barang
              </h3>
              <div className="rounded-xl border border-muted-foreground/10 overflow-x-auto bg-muted/5 scrollbar-thin">
                <table className="w-full text-left border-collapse min-w-[500px]">
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
                      <tr key={i} className={`text-xs transition-colors hover:bg-muted/20 ${item.status === 'rejected' || item.status === 'no_stock' ? 'bg-destructive/5' : ''}`}>
                        <td className="px-4 py-3 font-bold text-foreground">
                          <div className="flex flex-col gap-0.5">
                            <span className={item.status === 'rejected' || item.status === 'no_stock' ? 'line-through opacity-50' : ''}>
                              {item.item?.name ?? '—'}
                            </span>
                            {item.status === 'rejected' && (
                              <span className="text-[9px] text-destructive font-black uppercase tracking-tighter">Tidak Disetujui</span>
                            )}
                            {item.status === 'no_stock' && (
                              <span className="text-[9px] text-destructive font-black uppercase tracking-tighter">Stok Kosong</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-medium">
                          {item.warehouse?.name ?? '—'}
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
                          {item.status === 'rejected' || item.status === 'no_stock' ? (
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

            {/* 3. Return History Log & Closing Status */}
            {(loan.actual_return_date || loan.items?.some(item => (item.returns?.length ?? 0) > 0)) && (
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                    <RotateCcw size={12} className="text-blue-600" /> Riwayat Pengembalian
                  </h3>
                  {loan.actual_return_date && (
                    <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md border border-emerald-100 shadow-sm">
                      <CheckCircle2 size={10} className="text-emerald-600" />
                      <span className="text-[9px] font-bold whitespace-nowrap">
                        Closed: {formatDateTime(loan.actual_return_date)}
                      </span>
                    </div>
                  )}
                </div>

                {loan.items?.some(item => (item.returns?.length ?? 0) > 0) ? (
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
                ) : (
                  <div className="bg-muted/5 border border-dashed border-muted-foreground/10 p-4 rounded-xl text-center">
                    <p className="text-[10px] text-muted-foreground font-medium italic">Tidak ada detail riwayat pengembalian tercatat</p>
                  </div>
                )}
              </section>
            )}


          </div>
        </div>

        <div className="p-4 sm:p-6 sm:px-8 bg-muted/10 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px] text-muted-foreground font-medium">
            Sistem Manajemen Peminjaman Barang
          </p>
          <Badge variant="outline" className="font-mono text-[9px] opacity-40 uppercase tracking-tighter">
            Created: {formatDateTime(loan.created_at!)}
          </Badge>
        </div>
      </DialogContent>
    </Dialog>
  )
}
