'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, Package } from 'lucide-react'
import { ItemInfoCard } from './sub-components/item-info-card'
import { ItemLedgerList } from './sub-components/item-ledger-list'

interface ItemDetailModalProps {
  itemId: string | null
  onOpenChange: (open: boolean) => void
}

export function ItemDetailModal({ itemId, onOpenChange }: ItemDetailModalProps) {
  const supabase = createClient()
  const [page, setPage] = useState(1)
  const pageSize = 10

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

  const { data: ledgerData, isLoading: isLedgerLoading } = useQuery({
    queryKey: ['item_ledger', itemId, page],
    enabled: !!itemId,
    queryFn: async () => {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      const { data, count, error } = await supabase
        .from('stock_transactions_view')
        .select('*', { count: 'exact' })
        .eq('item_id', itemId)
        .order('date', { ascending: false })
        .range(from, to)

      if (error) throw error
      
      // 1. Map flattened view columns back to the structure expected by the component
      const mappedData = (data || []).map(d => ({
        ...d,
        warehouse: { name: d.warehouse_name },
        creator: { full_name: d.creator_name },
        loan_details: null as any
      }))

      // 2. Fetch loan details for transactions that have a loan ID in the note
      const loanIds = (data || [])
        .map(d => d.note?.match(/#([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/)?.[1])
        .filter(Boolean) as string[]

      if (loanIds.length > 0) {
        const { data: loans } = await supabase
          .from('loan_requests')
          .select('id, loan_date, atas_nama, requested_by:profiles!requested_by(full_name)')
          .in('id', loanIds)
        
        if (loans) {
          mappedData.forEach(item => {
            const loanId = item.note?.match(/#([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/)?.[1]
            if (loanId) {
              const loan = loans.find(l => l.id === loanId)
              if (loan) {
                item.loan_details = {
                  borrower: loan.atas_nama || (loan.requested_by as any)?.full_name,
                  date: loan.loan_date
                }
              }
            }
          })
        }
      }

      return { data: mappedData, count }
    },
  })

  const { data: stockStats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['item_stock_stats', itemId],
    enabled: !!itemId,
    queryFn: async () => {
      const [ledgerRes, loansRes] = await Promise.all([
        supabase
          .from('stock_ledger')
          .select('warehouse_id, total_in, total_out, current_stock, warehouse_name')
          .eq('item_id', itemId)
          .order('warehouse_name'),
        supabase
          .from('loan_items')
          .select('quantity, warehouse_id')
          .eq('item_id', itemId)
          .eq('status', 'approved')
      ])

      if (ledgerRes.error) throw ledgerRes.error
      if (loansRes.error) throw loansRes.error

      const ledger = ledgerRes.data || []
      const loans = loansRes.data || []

      const loanStats: Record<string, number> = {}
      loans.forEach(l => {
        loanStats[l.warehouse_id] = (loanStats[l.warehouse_id] || 0) + l.quantity
      })

      return ledger.map(stat => {
        const borrowed = loanStats[stat.warehouse_id] || 0
        return {
          ...stat,
          borrowed,
          // total_out in the view already includes loans, 
          // so current_stock is the actual available stock in warehouse.
          available_stock: stat.current_stock,
          // we subtract borrowed from total_out for display purposes 
          // to show "regular" exits in the 'KELUAR' column
          display_total_out: Math.max(0, stat.total_out - borrowed)
        }
      })
    }
  })

  return (
    <Dialog open={!!itemId} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[85vh] sm:h-[80vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
        <div className="p-6 pb-4 border-b bg-muted/30 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg font-medium tracking-tight text-foreground/80 uppercase">
            <Package size={18} className="text-primary/70" />
            Detail Inventaris
          </DialogTitle>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
          {/* Left Side: Info */}
          <div className="w-full lg:w-[42%] p-5 sm:p-8 space-y-6 lg:border-r bg-muted/5 lg:overflow-y-auto shrink-0">
            {isItemLoading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <Loader2 className="animate-spin text-primary/30" size={32} />
                <p className="text-sm text-muted-foreground">Memuat data barang...</p>
              </div>
            ) : (
              <ItemInfoCard 
                item={item as any} 
                stockStats={(stockStats || []) as any} 
                isStatsLoading={isStatsLoading} 
              />
            )}
          </div>

          {/* Right Side: Ledger */}
          <ItemLedgerList 
            ledger={(ledgerData?.data || []) as any} 
            isLoading={isLedgerLoading} 
            currentPage={page}
            totalCount={ledgerData?.count || 0}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
