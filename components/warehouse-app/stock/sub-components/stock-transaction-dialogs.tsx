'use client'

import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Calendar as CalendarIcon, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { apiService } from '@/lib/api-service'
import { formatDateTime, cn, getJakartaTimestamp } from '@/lib/utils'
import { useActiveItems } from '@/hooks/queries/use-items'
import { useWarehouses } from '@/hooks/queries/use-warehouses'
import type { StockInWithJoins } from '@/hooks/stock/use-stock-transactions'
import { QRScanner } from '@/components/shared/qr-scanner'
import { stockTransactionSchema, type StockTransactionFormValues as FormValues } from '@/lib/validations/stock'

interface StockTransactionDialogsProps {
  type: 'in' | 'out'
  editItem: StockInWithJoins | null
  viewItem: StockInWithJoins | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onCloseView: () => void
}

export function StockTransactionDialogs({
  type,
  editItem,
  viewItem,
  open,
  onOpenChange,
  onCloseView
}: StockTransactionDialogsProps) {
  const label = type === 'in' ? 'Barang Masuk' : 'Barang Keluar'
  const supabase = createClient()
  const qc = useQueryClient()
  const { data: items } = useActiveItems()
  const { data: warehouses } = useWarehouses()

  const now = () => getJakartaTimestamp()

  const form = useForm<FormValues>({
    resolver: zodResolver(stockTransactionSchema),
    defaultValues: { item_id: '', warehouse_id: '', quantity: 1, date: now(), note: '' },
  })

  useEffect(() => {
    if (editItem) {
      form.reset({
        item_id: editItem.item_id,
        warehouse_id: editItem.warehouse_id,
        quantity: editItem.quantity,
        date: getJakartaTimestamp(new Date(editItem.date)),
        note: editItem.note ?? '',
      })
    } else if (open) {
      form.reset({ item_id: '', warehouse_id: '', quantity: 1, date: now(), note: '' })
    }
  }, [editItem, open, form])

  const handleScan = (decodedText: string) => {
    const item = items?.find(i => i.id === decodedText)
    if (item) {
      form.setValue('item_id', item.id)
      toast.success(`Barang terdeteksi: ${item.name}`)
    } else {
      toast.error('QR Code tidak valid atau barang tidak ditemukan')
    }
  }

  const selectedItemId = form.watch('item_id')
  const selectedWarehouseId = form.watch('warehouse_id')

  const { data: currentStock, isFetching: loadingStock } = useQuery({
    queryKey: ['item_stock', selectedItemId, selectedWarehouseId],
    queryFn: async () => {
      if (!selectedItemId || !selectedWarehouseId) return 0
      
      const [ledgerRes, loansRes] = await Promise.all([
        supabase
          .from('stock_ledger')
          .select('current_stock')
          .eq('item_id', selectedItemId)
          .eq('warehouse_id', selectedWarehouseId)
          .maybeSingle(),
        supabase
          .from('item_loans')
          .select('quantity')
          .eq('item_id', selectedItemId)
          .eq('warehouse_id', selectedWarehouseId)
          .eq('status', 'approved')
      ])

      const current = ledgerRes.data?.current_stock ?? 0
      const borrowed = loansRes.data?.reduce((sum, l) => sum + l.quantity, 0) ?? 0
      
      return current - borrowed
    },
    enabled: !!selectedItemId && !!selectedWarehouseId,
  })

  const availableStock = editItem && type === 'out' 
    ? (currentStock ?? 0) + editItem.quantity 
    : (currentStock ?? 0)

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (type === 'out' && values.quantity > availableStock) {
        throw new Error(`Jumlah keluar (${values.quantity}) melebihi stok tersedia (${availableStock})`)
      }

      const payload = {
        item_id: values.item_id,
        warehouse_id: values.warehouse_id,
        quantity: values.quantity,
        date: new Date(values.date).toISOString(),
        note: values.note || null,
      }

      if (editItem) {
        return apiService.patch(`/api/v1/stock-${type}/${editItem.id}`, payload)
      } else {
        return apiService.post(`/api/v1/stock-${type}`, payload)
      }
    },
    onSuccess: () => {
      toast.success(editItem ? `${label} diperbarui` : `${label} ditambahkan`)
      qc.invalidateQueries({ queryKey: [type === 'in' ? 'stock_in' : 'stock_out'] })
      qc.invalidateQueries({ queryKey: ['stock_ledger'] })
      qc.invalidateQueries({ queryKey: ['item_stock'] })
      onOpenChange(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editItem ? `Edit ${label}` : `Tambah ${label}`}</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Barang *</Label>
              <Controller name="item_id" control={form.control}
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Combobox 
                      value={field.value} 
                      onValueChange={field.onChange}
                      options={items?.map((i) => ({ value: i.id, label: i.name })) ?? []}
                      placeholder="Pilih barang"
                      searchPlaceholder="Cari barang..."
                      className="flex-1"
                    />
                    <QRScanner onScan={handleScan} />
                  </div>
                )}
              />
              {form.formState.errors.item_id && <p className="text-destructive text-xs">{form.formState.errors.item_id.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Gudang *</Label>
              <Controller name="warehouse_id" control={form.control}
                render={({ field }) => (
                  <Select 
                    value={field.value} 
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger><SelectValue placeholder="Pilih gudang" /></SelectTrigger>
                    <SelectContent>
                      {warehouses?.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.warehouse_id && <p className="text-destructive text-xs">{form.formState.errors.warehouse_id.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="st-qty">Jumlah *</Label>
                  <span className="text-[10px] text-muted-foreground font-medium bg-muted/50 px-1.5 py-0.5 rounded">
                    Tersedia: <span className={cn("font-bold", (currentStock ?? 0) <= 0 ? "text-destructive" : "text-foreground")}>
                      {loadingStock ? '...' : currentStock ?? 0}
                    </span>
                  </span>
                </div>
                <Input id="st-qty" type="number" min={1} {...form.register('quantity', { valueAsNumber: true })} />
                {form.formState.errors.quantity && <p className="text-destructive text-xs">{form.formState.errors.quantity.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="st-date">Tanggal *</Label>
                <Input id="st-date" type="datetime-local" {...form.register('date')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="st-note">Catatan</Label>
              <Textarea id="st-note" rows={2} {...form.register('note')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
              <Button type="submit" disabled={saveMutation.isPending || loadingStock}
                className={type === 'in' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              >
                {saveMutation.isPending ? <><Loader2 size={14} className="mr-1.5 animate-spin" />Menyimpan...</> : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewItem} onOpenChange={(o) => !o && onCloseView()}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2">
            <Info size={18} className="text-primary" />
            Detail Transaksi
          </DialogTitle></DialogHeader>
          {viewItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Barang</p>
                  <p className="font-bold text-base">{viewItem.item?.name ?? '—'}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Jumlah</p>
                  <p className={cn("font-bold text-lg", type === 'in' ? "text-green-600" : "text-red-600")}>
                    {type === 'in' ? '+' : '-'}{viewItem.quantity}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Gudang</p>
                  <p className="font-medium text-muted-foreground">{viewItem.warehouse?.name ?? '—'}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">PIC</p>
                  <p className="font-medium text-muted-foreground">{viewItem.creator?.full_name ?? '—'}</p>
                </div>
                <div className="space-y-1 col-span-2 border-t border-dashed pt-3 mt-1">
                  <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                    <CalendarIcon size={10} /> Waktu Transaksi
                  </p>
                  <p className="font-medium text-sm">{formatDateTime(viewItem.date)}</p>
                </div>
              </div>
              <div className="space-y-2 border-t border-dashed pt-3">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
                  <Info size={10} /> Catatan
                </p>
                <div className="text-sm italic p-4 bg-muted/50 rounded-lg border border-dashed min-h-[80px] text-muted-foreground leading-relaxed">
                  {viewItem.note || 'Tidak ada catatan untuk transaksi ini.'}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
