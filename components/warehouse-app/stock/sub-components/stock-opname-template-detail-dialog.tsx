'use client'

import { formatDateTime } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import type { StockOpnameTemplate } from '@/types/database'

interface StockOpnameTemplateDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: StockOpnameTemplate | null
}

export function StockOpnameTemplateDetailDialog({
  open,
  onOpenChange,
  template,
}: StockOpnameTemplateDetailDialogProps) {
  if (!template) return null

  const items = template.items ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl sm:rounded-xl">
        <DialogHeader className="m-0 border-b bg-muted/20 p-6 pb-4 shrink-0">
          <DialogTitle className="text-base leading-snug">{template.name}</DialogTitle>
          <p className="text-sm text-muted-foreground mt-0.5">Detail Template Stock Opname</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gudang Acuan</p>
                <p className="font-medium">{template.warehouse?.name ?? '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dibuat Oleh</p>
                <p className="font-medium">{template.creator?.full_name ?? '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tanggal Dibuat</p>
                <p className="font-medium">{formatDateTime(template.created_at)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Terakhir Diperbarui</p>
                <p className="font-medium">{formatDateTime(template.updated_at)}</p>
              </div>
            </div>

            {template.description && (
              <>
                <Separator />
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Deskripsi</p>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{template.description}</p>
                </div>
              </>
            )}

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Daftar Barang</p>
                <Badge variant="secondary">{items.length} barang</Badge>
              </div>

              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Tidak ada barang dalam template ini</p>
              ) : (
                <div className="border rounded-md divide-y">
                  {items.map((ti, idx) => (
                    <div key={ti.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                      <span className="text-xs text-muted-foreground font-mono w-6 shrink-0">{idx + 1}.</span>
                      <span className="font-medium truncate">{ti.item?.name ?? ti.item_id}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
