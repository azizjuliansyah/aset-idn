import { History, ArrowDownLeft, ArrowUpRight, Package, User, Calendar } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDateTime, cn } from '@/lib/utils'
import type { StockIn, Item, Warehouse } from '@/types/database'

type LedgerEntry = (StockIn | { type: 'out'; id: string; quantity: number; date: string; note: string | null; warehouse: Warehouse; creator: { full_name: string } }) & {
  type: 'in' | 'out'
  item?: Item
  warehouse?: Warehouse
  creator?: { full_name: string }
}

interface ItemLedgerListProps {
  ledger: LedgerEntry[]
  isLoading: boolean
}

export function ItemLedgerList({ ledger, isLoading }: ItemLedgerListProps) {
  return (
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
        {!isLoading && ledger && ledger.length > 0 ? (
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
        ) : !isLoading ? (
          <div className="flex flex-col items-center justify-center h-80 text-muted-foreground/20 text-center">
            <div className="p-8 rounded-full bg-muted/10 mb-6">
              <History size={48} className="opacity-10" />
            </div>
            <p className="text-xs uppercase tracking-[0.2em] font-medium">Data riwayat tidak ditemukan</p>
          </div>
        ) : null}
      </ScrollArea>
    </div>
  )
}
