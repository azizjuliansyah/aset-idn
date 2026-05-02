'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatCurrency, formatDateTime, formatDate, cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowUpRight, ArrowDownLeft, Info, History, Package, Tag, DollarSign, Layers, Calendar, User, AlertTriangle, ShieldCheck, AlertCircle, CheckCircle } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

interface ItemDetailModalProps {
  itemId: string | null
  onOpenChange: (open: boolean) => void
}

export function ItemDetailModal({ itemId, onOpenChange }: ItemDetailModalProps) {
  const supabase = createClient()

  const { data: item, isLoading: isItemLoading } = useQuery({
    queryKey: ['item_detail', itemId],
    enabled: !!itemId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select(`
          *,
          item_category:item_category_id(name),
          item_status:item_status_id(name),
          item_condition:item_condition_id(name)
        `)
        .eq('id', itemId)
        .single()
      if (error) throw error
      return data
    },
  })

  const { data: ledger, isLoading: isLedgerLoading } = useQuery({
    queryKey: ['item_ledger', itemId],
    enabled: !!itemId,
    queryFn: async () => {
      const [inRes, outRes] = await Promise.all([
        supabase
          .from('stock_in')
          .select('id, quantity, date, note, warehouse:warehouses(name), creator:profiles!created_by(full_name)')
          .eq('item_id', itemId)
          .order('date', { ascending: false })
          .limit(20),
        supabase
          .from('stock_out')
          .select('id, quantity, date, note, warehouse:warehouses(name), creator:profiles!created_by(full_name)')
          .eq('item_id', itemId)
          .order('date', { ascending: false })
          .limit(20)
      ])

      if (inRes.error) throw inRes.error
      if (outRes.error) throw outRes.error

      const inData = (inRes.data || []).map(d => ({ ...d, type: 'in' as const }))
      const outData = (outRes.data || []).map(d => ({ ...d, type: 'out' as const }))

      return [...inData, ...outData]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 20)
    },
  })

  const { data: stockStats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['item_stock_stats', itemId],
    enabled: !!itemId,
    queryFn: async () => {
      // Fetch both ledger and active loans
      const [ledgerRes, loansRes] = await Promise.all([
        supabase
          .from('stock_ledger')
          .select('warehouse_id, total_in, total_out, current_stock, warehouse_name')
          .eq('item_id', itemId)
          .order('warehouse_name'),
        supabase
          .from('item_loans')
          .select('quantity, warehouse_id')
          .eq('item_id', itemId)
          .eq('status', 'approved')
      ])

      if (ledgerRes.error) throw ledgerRes.error
      if (loansRes.error) throw loansRes.error

      const ledger = ledgerRes.data || []
      const loans = loansRes.data || []

      // Map loans to warehouse
      const loanStats: Record<string, number> = {}
      loans.forEach(l => {
        loanStats[l.warehouse_id] = (loanStats[l.warehouse_id] || 0) + l.quantity
      })

      // Combine stats
      return ledger.map(stat => {
        const borrowed = loanStats[stat.warehouse_id] || 0
        return {
          ...stat,
          borrowed,
          available_stock: stat.current_stock - borrowed
        }
      })
    }
  })

  const totalBorrowed = stockStats?.reduce((sum, s) => sum + (s.borrowed || 0), 0) ?? 0

  return (
    <Dialog open={!!itemId} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-w-[95vw] w-full max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
        <div className="p-6 pb-4 border-b bg-muted/30 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg font-medium tracking-tight text-foreground/80 uppercase">
            <Package size={18} className="text-primary/70" />
            Detail Informasi Inventaris
          </DialogTitle>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Left Side: Info */}
          <div className="w-full lg:w-[42%] p-8 space-y-6 border-r bg-muted/5 overflow-y-auto">
            {isItemLoading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <Loader2 className="animate-spin text-primary/30" size={32} />
                <p className="text-sm text-muted-foreground">Memuat data barang...</p>
              </div>
            ) : item ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-normal leading-none tracking-tight text-foreground">{item.name}</h3>
                    <p className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-widest">ID: {item.id}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-background font-medium text-[10px] uppercase tracking-wider px-2 py-0.5 border-muted-foreground/20 text-muted-foreground">
                      {item.item_category?.name ?? 'Tanpa Kategori'}
                    </Badge>
                    <Badge variant={item.status === 'active' ? 'default' : 'secondary'} className="font-medium text-[10px] uppercase tracking-wider px-2 py-0.5">
                      {item.status === 'active' ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </div>
                </div>

                  <div className="grid grid-cols-1 gap-6 border-t border-dashed border-muted-foreground/10 pt-2">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                      <DollarSign size={15} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-medium text-muted-foreground/60 tracking-widest mb-0.5">Harga Satuan</p>
                      <p className="text-lg font-medium tracking-tight">{formatCurrency(item.price)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                      <Layers size={15} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-medium text-muted-foreground/60 tracking-widest mb-0.5">Stok Minimum</p>
                      <p className="text-lg font-medium tracking-tight">{item.minimum_stock} <span className="text-xs font-normal text-muted-foreground/50 italic">Unit</span></p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                      <Calendar size={15} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-medium text-muted-foreground/60 tracking-widest mb-0.5">Tanggal Dibuat</p>
                      <p className="text-base font-medium tracking-tight">
                        {formatDate(item.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                      <Tag size={15} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-medium text-muted-foreground/60 tracking-widest mb-0.5">Status & Kondisi</p>
                      <p className="text-base font-medium tracking-tight">
                        {item.item_status?.name ?? '—'} <span className="text-muted-foreground/20 mx-1">/</span> {item.item_condition?.name ?? '—'}
                      </p>
                    </div>
                  </div>
                </div>

                  <div className="space-y-3 bg-muted/20 p-5 rounded-lg border border-dashed border-muted-foreground/10">
                    <div className="flex items-center gap-2">
                      <Info size={13} className="text-muted-foreground/40" />
                      <span className="text-[10px] font-medium uppercase text-muted-foreground/50 tracking-widest">Catatan Tambahan</span>
                    </div>
                    <p className="text-sm font-normal italic text-muted-foreground/70 leading-relaxed">
                      {item.note || 'Tidak ada catatan khusus.'}
                    </p>
                  </div>

                <div className="pt-2">
                  <div className="grid grid-cols-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">
                    <div>Masuk</div>
                    <div>Keluar</div>
                    <div>Dipinjam</div>
                    <div>Tersedia</div>
                  </div>
                  {isStatsLoading ? (
                    <div className="flex justify-center p-4"><Loader2 className="animate-spin text-primary/30" size={16} /></div>
                  ) : stockStats && stockStats.length > 0 ? (
                    <div className="space-y-0 text-sm">
                      {stockStats.map((stat: any, i: number) => (
                        <div key={i} className="py-2.5 border-b border-muted/50 last:border-0 group">
                          <div className="grid grid-cols-4 items-center">
                            <div className="text-green-600 font-semibold">+{stat.total_in}</div>
                            <div className="text-red-600 font-semibold">-{stat.total_out}</div>
                            <div className="text-amber-600 font-semibold">-{stat.borrowed}</div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-base">{stat.available_stock}</span>
                              {(() => {
                                if (stat.available_stock === 0) return (
                                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5 bg-red-100 text-red-700 hover:bg-red-100 border-red-200 font-medium tracking-wide">
                                    <AlertCircle size={10} className="mr-1" /> Habis
                                  </Badge>
                                )
                                if (stat.available_stock < (item.minimum_stock ?? 0)) return (
                                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5 bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200 font-medium tracking-wide border-orange-200/50">
                                    <AlertTriangle size={10} className="mr-1" /> Rendah
                                  </Badge>
                                )
                                if (stat.available_stock === (item.minimum_stock ?? 0)) return (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 font-medium tracking-wide">
                                    <AlertTriangle size={10} className="mr-1" /> Menipis
                                  </Badge>
                                )
                                return (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-green-100 text-green-700 hover:bg-green-100 border-green-200 font-medium tracking-wide">
                                    <CheckCircle size={10} className="mr-1" /> Aman
                                  </Badge>
                                )
                              })()}
                            </div>
                          </div>
                          {/* Warehouse name tooltip/subtext */}
                          <div className="text-[9px] text-muted-foreground/50 uppercase tracking-widest">
                            {stat.warehouse_name}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground py-3 text-center bg-muted/20 rounded border border-dashed">Belum ada data stok</div>
                  )}
                </div>

                
              </div>
            ) : null}
          </div>

          {/* Right Side: Ledger */}
          <div className="flex-1 flex flex-col p-5 bg-background">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                  <History size={16} />
                </div>
                <h4 className="font-medium uppercase tracking-widest text-xs text-foreground/60">Log Pergerakan Stok <span className="text-[9px] text-muted-foreground/50 font-normal italic ml-2">(20 Entri Terakhir)</span></h4>
              </div>
            </div>

            <ScrollArea className="flex-1 pr-4">
              {isLedgerLoading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                  <Loader2 className="animate-spin text-primary/10" size={32} />
                </div>
              ) : ledger && ledger.length > 0 ? (
                <div className="">
                  {ledger.map((tx: any) => (
                    <div key={tx.id} className="relative flex gap-2 group">
                      <div className="absolute left-[19px] top-[40px] bottom-[-24px] w-px bg-muted group-last:hidden" />
                      <div className={cn(
                        "relative z-10 w-10 h-10 shrink-0 rounded-full flex items-center justify-center border bg-background shadow-sm",
                        tx.type === 'in' ? "text-green-500 border-green-100" : "text-red-500 border-red-100"
                      )}>
                        {tx.type === 'in' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                      <div className="flex-1 pb-8 group-last:pb-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1">
                          <div>
                            <div className="flex items-center gap-3">
                              <p className="text-sm font-medium tracking-tight text-foreground/80">
                                {tx.type === 'in' ? 'Pemasukan Stok' : 'Pengeluaran Stok'}
                              </p>
                              <span className={cn(
                                "text-base font-semibold tracking-tight",
                                tx.type === 'in' ? "text-green-600" : "text-red-600"
                              )}>
                                {tx.type === 'in' ? '+' : '-'}{tx.quantity}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4">
                              <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">
                                <Package size={11} className="opacity-40" /> {tx.warehouse?.name ?? 'Gudang'}
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">
                                <User size={11} className="opacity-40" /> {tx.creator?.full_name ?? 'System'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground/50 whitespace-nowrap bg-muted/30 px-2.5 py-1 rounded border border-muted-foreground/5">
                            <Calendar size={11} /> {formatDateTime(tx.date)}
                          </div>
                        </div>
                        {tx.note && (
                          <div className="text-xs font-normal text-muted-foreground/70 bg-muted/5 p-2 rounded border border-dashed border-muted-foreground/10 leading-relaxed">
                            {tx.note}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-80 text-muted-foreground/20 text-center">
                  <div className="p-8 rounded-full bg-muted/10 mb-6">
                    <History size={48} className="opacity-10" />
                  </div>
                  <p className="text-xs uppercase tracking-[0.2em] font-medium">Data riwayat tidak ditemukan</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
