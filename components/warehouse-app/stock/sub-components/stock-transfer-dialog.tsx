'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { cn } from '@/lib/utils'
import { useActiveItems } from '@/hooks/queries/use-items'
import { useWarehouses } from '@/hooks/queries/use-warehouses'
import { QRScanner } from '@/components/shared/qr-scanner'
import { stockTransferSchema, type StockTransferFormValues as FormValues } from '@/lib/validations/stock'

interface StockTransferDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StockTransferDialog({
  open,
  onOpenChange,
}: StockTransferDialogProps) {
  const supabase = createClient()
  const qc = useQueryClient()
  const { data: items } = useActiveItems()
  const { data: warehouses } = useWarehouses()

  const form = useForm<FormValues>({
    resolver: zodResolver(stockTransferSchema),
    defaultValues: { item_id: '', from_warehouse_id: '', to_warehouse_id: '', quantity: 1, note: '' },
  })

  useEffect(() => {
    if (open) {
      form.reset({ 
        item_id: '', 
        from_warehouse_id: '', 
        to_warehouse_id: '', 
        quantity: 1, 
        note: '' 
      })
    }
  }, [open, form])

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
  const selectedFromId = form.watch('from_warehouse_id')

  // Fetch stock level for the selected item in the selected source warehouse
  const { data: currentStock, isFetching: loadingStock } = useQuery({
    queryKey: ['item_stock', selectedItemId, selectedFromId],
    queryFn: async () => {
      if (!selectedItemId || !selectedFromId) return 0
      
      const [ledgerRes, loansRes] = await Promise.all([
        supabase
          .from('stock_ledger')
          .select('current_stock')
          .eq('item_id', selectedItemId)
          .eq('warehouse_id', selectedFromId)
          .maybeSingle(),
        supabase
          .from('loan_items')
          .select('quantity')
          .eq('item_id', selectedItemId)
          .eq('warehouse_id', selectedFromId)
          .eq('status', 'approved')
      ])

      const current = ledgerRes.data?.current_stock ?? 0
      const borrowed = loansRes.data?.reduce((sum, l) => sum + l.quantity, 0) ?? 0
      
      return current - borrowed
    },
    enabled: !!selectedItemId && !!selectedFromId,
  })

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (values.quantity > (currentStock ?? 0)) {
        throw new Error(`Stok tidak mencukupi di gudang asal. Tersedia: ${currentStock ?? 0}`)
      }

      const res = await fetch('/api/v1/stock-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Gagal melakukan perpindahan barang')
      }
      
      return res.json()
    },
    onSuccess: () => {
      toast.success('Perpindahan barang berhasil')
      qc.invalidateQueries({ queryKey: ['stock_transfer'] })
      qc.invalidateQueries({ queryKey: ['stock_ledger'] })
      qc.invalidateQueries({ queryKey: ['item_stock'] })
      onOpenChange(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Perpindahan Barang</DialogTitle></DialogHeader>
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

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            <div className="flex-1 w-full space-y-1.5">
              <Label>Dari Gudang *</Label>
              <Controller name="from_warehouse_id" control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Pilih asal" /></SelectTrigger>
                    <SelectContent>
                      {warehouses?.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            
            <div className="hidden sm:flex self-center pb-2 text-muted-foreground">
              <ArrowRight size={18} />
            </div>
            
            <div className="flex-1 w-full space-y-1.5">
              <Label>Ke Gudang *</Label>
              <Controller name="to_warehouse_id" control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Pilih tujuan" /></SelectTrigger>
                    <SelectContent>
                      {warehouses?.filter(w => w.id !== selectedFromId).map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
          {(form.formState.errors.from_warehouse_id || form.formState.errors.to_warehouse_id) && (
            <p className="text-destructive text-xs">
              {form.formState.errors.from_warehouse_id?.message || form.formState.errors.to_warehouse_id?.message}
            </p>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="st-qty">Jumlah yang Dipindahkan *</Label>
              {selectedFromId && (
                <span className="text-[10px] text-muted-foreground font-medium bg-muted/50 px-1.5 py-0.5 rounded">
                  Tersedia: <span className={cn("font-bold", (currentStock ?? 0) <= 0 ? "text-destructive" : "text-foreground")}>
                    {loadingStock ? '...' : currentStock ?? 0}
                  </span>
                </span>
              )}
            </div>
            <Input id="st-qty" type="number" min={1} {...form.register('quantity', { valueAsNumber: true })} />
            {form.formState.errors.quantity && <p className="text-destructive text-xs">{form.formState.errors.quantity.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="st-note">Catatan Perpindahan</Label>
            <Textarea id="st-note" rows={2} {...form.register('note')} placeholder="Contoh: Pemindahan untuk event X" />
          </div>

          <DialogFooter className="flex flex-row items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={saveMutation.isPending || loadingStock || (!!selectedFromId && (currentStock ?? 0) <= 0)} className="bg-blue-600 hover:bg-blue-700">
              {saveMutation.isPending ? <><Loader2 size={14} className="mr-1.5 animate-spin" />Memproses...</> : 'Konfirmasi Pindah'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
