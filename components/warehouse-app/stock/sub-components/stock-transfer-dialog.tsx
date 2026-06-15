'use client'

import { useEffect, useState } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, ArrowRight, Minus, Plus, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { useWarehouses } from '@/hooks/queries/use-warehouses'
import { useActiveItems } from '@/hooks/queries/use-items'
import { QRScanner } from '@/components/shared/qr-scanner'
import type { StockTransferFormValues as FormValues } from '@/lib/validations/stock'

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
  const { data: warehouses } = useWarehouses()
  const { data: allItems } = useActiveItems()

  const form = useForm<FormValues>({
    defaultValues: { from_warehouse_id: '', to_warehouse_id: '', items: [], note: '' },
  })

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' })
  const [itemSearch, setItemSearch] = useState('')

  useEffect(() => {
    if (open) {
      form.reset({ from_warehouse_id: '', to_warehouse_id: '', items: [], note: '' })
      setItemSearch('')
    }
  }, [open, form])

  const selectedFromId = form.watch('from_warehouse_id')
  const selectedToId = form.watch('to_warehouse_id')

  // Reset selected items and search when source warehouse changes
  useEffect(() => {
    form.setValue('items', [])
    setItemSearch('')
  }, [selectedFromId, form])

  // Fetch stock data for the source warehouse (stock_ledger + active loans)
  const { data: warehouseStockMap, isLoading: loadingItems } = useQuery({
    queryKey: ['source_warehouse_stock', selectedFromId],
    queryFn: async () => {
      if (!selectedFromId) return new Map<string, number>()
      const [ledgerRes, loansRes] = await Promise.all([
        supabase
          .from('stock_ledger')
          .select('item_id, current_stock')
          .eq('warehouse_id', selectedFromId),
        supabase
          .from('loan_items')
          .select('item_id, quantity')
          .eq('warehouse_id', selectedFromId)
          .eq('status', 'approved'),
      ])
      const loans = loansRes.data ?? []
      const map = new Map<string, number>()
      for (const row of ledgerRes.data ?? []) {
        const borrowed = loans
          .filter((l) => l.item_id === row.item_id)
          .reduce((s, l) => s + l.quantity, 0)
        map.set(row.item_id, row.current_stock - borrowed)
      }
      return map
    },
    enabled: !!selectedFromId,
  })

  // Merge all active items with their stock at the source warehouse
  const sourceItems = allItems?.map((item) => ({
    id: item.id,
    name: item.name,
    available: warehouseStockMap?.get(item.id) ?? 0,
  })) ?? []

  const filteredItems = itemSearch.trim()
    ? sourceItems.filter((i) => i.name.toLowerCase().includes(itemSearch.toLowerCase()))
    : sourceItems

  const selectedItemIds = new Set(fields.map((f) => f.item_id))

  const handleItemToggle = (itemId: string, checked: boolean) => {
    if (checked) {
      append({ item_id: itemId, quantity: 1 })
    } else {
      const idx = fields.findIndex((f) => f.item_id === itemId)
      if (idx !== -1) remove(idx)
    }
  }

  const handleScan = (decodedText: string) => {
    const item = sourceItems?.find((i) => i.id === decodedText)
    if (!item) {
      toast.error('QR Code tidak valid atau barang tidak tersedia di gudang ini')
      return
    }
    if (selectedItemIds.has(item.id)) {
      toast.info(`${item.name} sudah dipilih`)
      return
    }
    append({ item_id: item.id, quantity: 1 })
    toast.success(`Barang terdeteksi: ${item.name}`)
  }

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // Validate per-item quantity against available stock
      const itemMap = new Map(sourceItems?.map((i) => [i.id, i.available]) ?? [])
      for (const item of values.items) {
        const avail = itemMap.get(item.item_id) ?? 0
        if (item.quantity > avail) {
          const name = sourceItems?.find((i) => i.id === item.item_id)?.name ?? item.item_id
          throw new Error(`Stok tidak mencukupi untuk ${name}. Tersedia: ${avail}`)
        }
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
      qc.invalidateQueries({ queryKey: ['source_warehouse_stock'] })
      onOpenChange(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const warehousesReady = !!selectedFromId && !!selectedToId

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Perpindahan Barang</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit((v) => {
            if (!v.from_warehouse_id) { toast.error('Gudang asal wajib dipilih'); return }
            if (!v.to_warehouse_id) { toast.error('Gudang tujuan wajib dipilih'); return }
            if (v.from_warehouse_id === v.to_warehouse_id) { toast.error('Gudang asal dan tujuan tidak boleh sama'); return }
            if (fields.length === 0) { toast.error('Pilih minimal 1 barang'); return }
            saveMutation.mutate(v)
          })} className="space-y-4">
          {/* Step 1: Select warehouses */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            <div className="flex-1 w-full space-y-1.5">
              <Label>Dari Gudang *</Label>
              <Controller
                name="from_warehouse_id"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih asal" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses?.map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.from_warehouse_id && (
                <p className="text-destructive text-xs">{form.formState.errors.from_warehouse_id.message}</p>
              )}
            </div>

            <div className="hidden sm:flex self-center pt-5 text-muted-foreground">
              <ArrowRight size={18} />
            </div>

            <div className="flex-1 w-full space-y-1.5">
              <Label>Ke Gudang *</Label>
              <Controller
                name="to_warehouse_id"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih tujuan" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses?.filter((w) => w.id !== selectedFromId).map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.to_warehouse_id && (
                <p className="text-destructive text-xs">{form.formState.errors.to_warehouse_id.message}</p>
              )}
            </div>
          </div>

          {/* Step 2: Select items from source warehouse (only shown after both warehouses chosen) */}
          {warehousesReady && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Pilih Barang *</Label>
                <div className="flex items-center gap-1.5">
                  {fields.length > 0 && (
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {fields.length} dipilih
                    </span>
                  )}
                  <QRScanner onScan={handleScan} />
                </div>
              </div>

              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Cari barang..."
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  className="h-8 pl-8 text-sm"
                />
              </div>

              {loadingItems ? (
                <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
                  <Loader2 size={14} className="mr-1.5 animate-spin" />
                  Memuat stok...
                </div>
              ) : (
                <div className="border rounded-md divide-y max-h-52 overflow-y-auto">
                  {filteredItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Tidak ada barang ditemukan</p>
                  ) : filteredItems.map((item) => {
                    const isDisabled = item.available <= 0
                    const isChecked = selectedItemIds.has(item.id)
                    const fieldIndex = fields.findIndex((f) => f.item_id === item.id)

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 text-sm transition-colors',
                          isChecked && 'bg-blue-50 dark:bg-blue-950/20',
                          isDisabled && 'opacity-40',
                        )}
                      >
                        <Checkbox
                          id={`item-${item.id}`}
                          checked={isChecked}
                          disabled={isDisabled}
                          onCheckedChange={(checked) => handleItemToggle(item.id, !!checked)}
                        />
                        <label
                          htmlFor={`item-${item.id}`}
                          className={cn('flex-1 leading-none', isDisabled ? 'cursor-not-allowed' : 'cursor-pointer font-medium')}
                        >
                          {item.name}
                        </label>
                        <span className={cn(
                          'text-xs font-medium px-1.5 py-0.5 rounded whitespace-nowrap',
                          isDisabled
                            ? 'text-muted-foreground bg-muted'
                            : item.available <= 5
                              ? 'text-amber-700 bg-amber-100 dark:bg-amber-900/30'
                              : 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30',
                        )}>
                          Stok: {item.available}
                        </span>

                        {isChecked && fieldIndex !== -1 && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                const current = form.getValues(`items.${fieldIndex}.quantity`)
                                if (current > 1) form.setValue(`items.${fieldIndex}.quantity`, current - 1)
                              }}
                              className="h-6 w-6 rounded border flex items-center justify-center hover:bg-muted"
                            >
                              <Minus size={10} />
                            </button>
                            <Controller
                              name={`items.${fieldIndex}.quantity`}
                              control={form.control}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  min={1}
                                  max={item.available}
                                  value={field.value}
                                  onChange={(e) => field.onChange(Math.max(1, parseInt(e.target.value) || 1))}
                                  className="h-6 w-14 text-center text-xs px-1"
                                />
                              )}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const current = form.getValues(`items.${fieldIndex}.quantity`)
                                if (current < item.available) form.setValue(`items.${fieldIndex}.quantity`, current + 1)
                              }}
                              className="h-6 w-6 rounded border flex items-center justify-center hover:bg-muted"
                            >
                              <Plus size={10} />
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}


              {form.formState.errors.items && !Array.isArray(form.formState.errors.items) && (
                <p className="text-destructive text-xs">{(form.formState.errors.items as any)?.message}</p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="st-note">Catatan Perpindahan</Label>
            <Textarea
              id="st-note"
              rows={2}
              {...form.register('note')}
              placeholder="Contoh: Pemindahan untuk event X"
            />
          </div>

          <DialogFooter className="flex flex-row items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              disabled={saveMutation.isPending || loadingItems || fields.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saveMutation.isPending ? (
                <><Loader2 size={14} className="mr-1.5 animate-spin" />Memproses...</>
              ) : (
                `Konfirmasi Pindah${fields.length > 0 ? ` (${fields.length})` : ''}`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
