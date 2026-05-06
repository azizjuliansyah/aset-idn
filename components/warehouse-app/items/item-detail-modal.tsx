'use client'

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

      const loanStats: Record<string, number> = {}
      loans.forEach(l => {
        loanStats[l.warehouse_id] = (loanStats[l.warehouse_id] || 0) + l.quantity
      })

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
            ledger={(ledger || []) as any} 
            isLoading={isLedgerLoading} 
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
