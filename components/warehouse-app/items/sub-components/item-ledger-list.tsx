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
  currentPage: number
  totalCount: number
  pageSize: number
  onPageChange: (page: number) => void
}

export function ItemLedgerList({ 
  ledger, 
  isLoading,
  currentPage,
  totalCount,
  pageSize,
  onPageChange
}: ItemLedgerListProps) {
  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="lg:flex-1 lg:flex lg:flex-col p-5 bg-background lg:h-full border-t lg:border-t-0">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted text-muted-foreground">
            <History size={16} />
          </div>
          <h4 className="font-medium uppercase tracking-widest text-xs text-foreground/60">Log Pergerakan Stok</h4>
        </div>
        <div className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-widest bg-muted/30 px-2 py-0.5 rounded border border-muted-foreground/5">
          {totalCount} Total
        </div>
      </div>

      <div className="lg:flex-1 pr-4 lg:overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/30 mb-4 lg:mb-0">
        {!isLoading && ledger && ledger.length > 0 ? (
          <div className="mb-8">
            {ledger.map((tx: any) => {
              const isLoan = tx.note?.toLowerCase().includes('peminjaman') && !tx.note?.toLowerCase().includes('pengembalian')
              const isReturn = tx.note?.toLowerCase().includes('pengembalian')
              const isLoanRelated = isLoan || isReturn

              return (
                <div key={tx.id} className="relative flex gap-2 group">
                  <div className="absolute left-[19px] top-[40px] bottom-[-24px] w-px bg-muted group-last:hidden" />
                  <div className={cn(
                    "relative z-10 w-10 h-10 shrink-0 rounded-full flex items-center justify-center border bg-background shadow-sm",
                    tx.type === 'in' ? (isReturn ? "text-blue-500 border-blue-100" : "text-green-500 border-green-100") : (isLoan ? "text-amber-500 border-amber-100" : "text-red-500 border-red-100")
                  )}>
                    {isReturn ? <ArrowDownLeft size={16} /> : isLoan ? <ArrowUpRight size={16} /> : tx.type === 'in' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                  </div>
                  <div className="flex-1 pb-8 group-last:pb-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1">
                      <div>
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-medium tracking-tight text-foreground/80">
                            {isReturn ? 'Pengembalian Pinjaman' : isLoan ? 'Peminjaman Barang' : tx.type === 'in' ? 'Pemasukan Stok' : 'Pengeluaran Stok'}
                          </p>
                          <span className={cn(
                            "text-base font-semibold tracking-tight",
                            tx.type === 'in' ? (isReturn ? "text-blue-600" : "text-green-600") : (isLoan ? "text-amber-600" : "text-red-600")
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
                      <div className="text-xs font-normal p-2 rounded border border-dashed leading-relaxed mt-1 bg-muted/5 text-muted-foreground/70 border-muted-foreground/10">
                        {tx.loan_details ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-foreground/60">Peminjam: {tx.loan_details.borrower}</span>
                            <span className="text-[10px] opacity-60">Tgl Pinjam: {new Date(tx.loan_details.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                          </div>
                        ) : (
                          tx.note.replace(/#?[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, '').replace(/\s+/g, ' ').trim()
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : !isLoading ? (
          <div className="flex flex-col items-center justify-center h-80 text-muted-foreground/20 text-center">
            <div className="p-8 rounded-full bg-muted/10 mb-6">
              <History size={48} className="opacity-10" />
            </div>
            <p className="text-xs uppercase tracking-[0.2em] font-medium">Data riwayat tidak ditemukan</p>
          </div>
        ) : null}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 lg:mt-auto border-t bg-background">
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
            Halaman {currentPage} dari {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1 || isLoading}
              className="p-1.5 rounded border bg-background hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowDownLeft size={14} className="rotate-90" />
            </button>
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages || isLoading}
              className="p-1.5 rounded border bg-background hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowUpRight size={14} className="rotate-90" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
