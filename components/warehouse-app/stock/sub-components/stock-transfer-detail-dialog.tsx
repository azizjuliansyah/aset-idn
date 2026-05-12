'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatDateTime } from '@/lib/utils'
import { Package, MapPin, User, Calendar, FileText, ArrowRight } from 'lucide-react'
import type { StockTransfer, Item, Warehouse } from '@/types/database'

interface StockTransferDetailDialogProps {
  transfer: (StockTransfer & { 
    item?: Item; 
    from?: Warehouse; 
    to?: Warehouse; 
    creator?: { full_name: string } 
  }) | null
  onOpenChange: (open: boolean) => void
}

export function StockTransferDetailDialog({ transfer, onOpenChange }: StockTransferDetailDialogProps) {
  if (!transfer) return null

  return (
    <Dialog open={!!transfer} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-xl font-semibold tracking-tight">
            Detail Pindahan Barang
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Item Info */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Package size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{transfer.item?.name || 'Barang'}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{transfer.quantity} PCS</p>
            </div>
          </div>

          <Separator className="opacity-50" />

          {/* Transfer Path */}
          <div className="flex items-center justify-between gap-2 py-2 px-2">
            <div className="flex-1 flex flex-col items-center text-center">
              <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground mb-2">
                <MapPin size={16} />
              </div>
              <p className="text-md font-semibold line-clamp-1">{transfer.from?.name || '—'}</p>
            </div>
            
            <div className="flex flex-col items-center justify-center px-2">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm border border-blue-100">
                <ArrowRight size={16} />
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center text-center">
              <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground mb-2">
                <MapPin size={16} />
              </div>
              <p className="text-md font-semibold line-clamp-1">{transfer.to?.name || '—'}</p>
            </div>
          </div>

          <Separator className="opacity-50" />

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded bg-muted text-muted-foreground">
                <User size={14} />
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">PIC</p>
                <p className="text-[11px] font-medium">{transfer.creator?.full_name || 'System'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded bg-muted text-muted-foreground">
                <Calendar size={14} />
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Tanggal</p>
                <p className="text-[11px] font-medium">{formatDateTime(transfer.date)}</p>
              </div>
            </div>
          </div>

          {/* Note */}
          {transfer.note && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText size={14} />
                <p className="text-[10px] font-bold uppercase tracking-wider">Catatan</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-dashed border-muted-foreground/20 text-xs text-muted-foreground leading-relaxed">
                {transfer.note}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
