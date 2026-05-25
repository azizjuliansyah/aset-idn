'use client'

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2, HelpCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { StockOpname } from '@/types/database'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { useStockOpnameMutations } from '@/hooks/stock/use-stock-opname'
import { QRScanner } from '@/components/shared/qr-scanner'
import { useWarehouses } from '@/hooks/queries/use-warehouses'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'

const formSchema = z.object({
  item_id: z.string().min(1, 'Pilih barang'),
  warehouse_id: z.string().min(1, 'Pilih gudang'),
  actual_stock: z.number().min(0, 'Minimal 0'),
  note: z.string().optional(),
  diff_category_id: z.string().optional().nullable(),
})

interface StockOpnameEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: string
  initialData?: any
  existingEntries?: any[]
  onSubmitOverride?: (values: {
    item_id: string
    item_name: string
    warehouse_id: string
    warehouse_name: string
    actual_stock: number
    note?: string
    system_stock?: number
    diff_category_id?: string | null
  }) => void
  titleOverride?: string
  lockedWarehouseId?: string
}

export function StockOpnameEntryDialog({
  open,
  onOpenChange,
  groupId,
  initialData,
  existingEntries,
  onSubmitOverride,
  titleOverride,
  lockedWarehouseId
}: StockOpnameEntryDialogProps) {
  const supabase = createClient()
  const mutations = useStockOpnameMutations()
  const addEntry = mutations?.addEntry
  const updateEntry = mutations?.updateEntry
  const [items, setItems] = useState<any[]>([])
  const [diffCategories, setDiffCategories] = useState<any[]>([])
  const { data: warehouses = [] } = useWarehouses()
  const [systemStock, setSystemStock] = useState<number | null>(null)
  const [currentSystemStock, setCurrentSystemStock] = useState<number | null>(null)
  const [isLoadingStock, setIsLoadingStock] = useState(false)
  const [existingRecord, setExistingRecord] = useState<any | null>(null)

  const isEditing = !!initialData && !initialData.id?.startsWith('unrecorded-')

  const { register, handleSubmit, control, watch, formState: { errors }, reset, setValue, setError } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      item_id: '',
      warehouse_id: '',
      actual_stock: 0,
      note: '',
      diff_category_id: '',
    },
  })

  // Load items and discrepancy categories when dialog opens
  useEffect(() => {
    if (!open) return
    supabase.from('items').select('id, name').order('name')
      .then(({ data }) => setItems(data || []))

    supabase.from('stock_opname_diff_categories').select('id, name').order('name')
      .then(({ data }) => setDiffCategories(data || []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Init form when dialog opens - runs immediately using cached warehouses data
  useEffect(() => {
    if (!open) return

    if (initialData) {
      // Edit mode: populate form with existing data
      setValue('item_id', initialData.item_id)
      setValue('warehouse_id', initialData.warehouse_id)
      setValue('actual_stock', initialData.actual_stock)
      setValue('note', initialData.note || '')
      setValue('diff_category_id', initialData.diff_category_id || '')
      setSystemStock(initialData.system_stock)
      setCurrentSystemStock(initialData.current_system_stock !== undefined ? initialData.current_system_stock : initialData.system_stock)
      setExistingRecord(null)
    } else {
      // Add mode: reset form, auto-select default warehouse if already in cache
      const defaultWh = warehouses.find((w) => w.is_default)
      reset({
        item_id: '',
        warehouse_id: lockedWarehouseId || defaultWh?.id || '',
        actual_stock: 0,
        note: '',
        diff_category_id: '',
      })
      setSystemStock(null)
      setCurrentSystemStock(null)
      setExistingRecord(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialData])

  // Fallback: set default warehouse after warehouses data loads (first-ever load, cache miss)
  useEffect(() => {
    if (!open || initialData) return
    const currentWarehouseId = watch('warehouse_id')
    if (lockedWarehouseId) {
      if (currentWarehouseId !== lockedWarehouseId) {
        setValue('warehouse_id', lockedWarehouseId, { shouldValidate: false })
      }
      return
    }
    if (currentWarehouseId) return // already set

    const defaultWh = warehouses.find((w) => w.is_default)
    if (defaultWh) {
      setValue('warehouse_id', defaultWh.id, { shouldValidate: false })
    }
  }, [warehouses, open, initialData, setValue, watch, lockedWarehouseId])

  const itemId = watch('item_id')
  const warehouseId = watch('warehouse_id')
  const actualStock = watch('actual_stock')

  // Fetch system stock and check for existing entry when item or warehouse changes (fetch live ledger stock for currentSystemStock in both add & edit)
  useEffect(() => {
    const fetchSystemStock = async () => {
      if (itemId && warehouseId) {
        setIsLoadingStock(true)
        try {
          // 1. Fetch system stock
          const { data: stockData } = await supabase
            .from('stock_ledger')
            .select('current_stock')
            .eq('item_id', itemId)
            .eq('warehouse_id', warehouseId)
            .maybeSingle()

          const liveStock = stockData?.current_stock ?? 0
          setCurrentSystemStock(liveStock)

          if (!isEditing || onSubmitOverride) {
            setSystemStock(liveStock)
          }

          // 2. Fetch existing opname entry under current group (only if not normal editing, OR if custom submit like CSV import edit)
          if (!isEditing || onSubmitOverride) {
            const { data: opnameData } = await supabase
              .from('stock_opname_group_items')
              .select(`
                id,
                actual_stock,
                note,
                diff_category:stock_opname_diff_categories(name)
              `)
              .eq('group_id', groupId)
              .eq('item_id', itemId)
              .eq('warehouse_id', warehouseId)
              .maybeSingle()

            if (opnameData) {
              setExistingRecord({
                id: opnameData.id,
                actual_stock: opnameData.actual_stock,
                note: opnameData.note,
                diff_category_name: (opnameData.diff_category as any)?.name || null
              })
            } else {
              setExistingRecord(null)
            }
          } else {
            setExistingRecord(null)
          }
        } catch (e) {
          setCurrentSystemStock(0)
          if (!isEditing || onSubmitOverride) {
            setSystemStock(0)
          }
          setExistingRecord(null)
        } finally {
          setIsLoadingStock(false)
        }
      } else {
        setExistingRecord(null)
      }
    }
    fetchSystemStock()
  }, [itemId, warehouseId, supabase, isEditing, onSubmitOverride, groupId])

  const handleScan = (decodedText: string) => {
    if (isEditing && !onSubmitOverride) return // Disable scan when editing

    const item = items.find(i => i.id === decodedText)
    if (item) {
      setValue('item_id', item.id)
      toast.success(`Barang terdeteksi: ${item.name}`)
    } else {
      toast.error('QR Code tidak valid atau barang tidak ditemukan')
    }
  }

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    // Check for duplicate item + warehouse
    const isDuplicate = !existingRecord && existingEntries?.some(entry =>
      entry.item_id === values.item_id &&
      entry.warehouse_id === values.warehouse_id &&
      (!initialData || entry.id !== initialData.id)
    )

    if (isDuplicate) {
      toast.error('Item ini sudah ada di daftar opname untuk gudang yang sama.')
      return
    }

    // Validate discrepancy category if there is a stock difference
    if (difference !== 0 && !values.diff_category_id) {
      setError('diff_category_id', {
        type: 'manual',
        message: 'Kategori selisih wajib dipilih jika ada perbedaan stok!',
      })
      toast.error('Kategori selisih wajib dipilih!')
      return
    }

    const payload = {
      ...values,
      diff_category_id: difference === 0 ? null : values.diff_category_id || null,
    }

    if (onSubmitOverride) {
      const selectedItem = items.find(i => i.id === values.item_id)
      const selectedWh = warehouses.find(w => w.id === values.warehouse_id)
      onSubmitOverride({
        item_id: payload.item_id,
        item_name: selectedItem?.name || '',
        warehouse_id: payload.warehouse_id,
        warehouse_name: selectedWh?.name || '',
        actual_stock: payload.actual_stock,
        note: payload.note,
        system_stock: systemStock ?? 0,
        diff_category_id: payload.diff_category_id,
      })
      onOpenChange(false)
      return
    }

    if (isEditing || existingRecord) {
      const entryId = isEditing ? initialData.id : existingRecord.id
      updateEntry.mutate({
        id: entryId,
        groupId,
        ...payload,
      }, {
        onSuccess: () => {
          onOpenChange(false)
          setExistingRecord(null)
        }
      })
    } else {
      addEntry.mutate({
        ...payload,
        group_id: groupId,
        system_stock: systemStock ?? 0
      }, {
        onSuccess: () => {
          onOpenChange(false)
          reset()
          setSystemStock(null)
          setExistingRecord(null)
        }
      })
    }
  }

  const onInvalid = (err: any) => {
    console.error('[StockOpname] Validation errors:', err)
    toast.error('Mohon lengkapi data dengan benar')
  }

  const difference = systemStock !== null ? (actualStock || 0) - systemStock : 0
  const isPending = addEntry?.isPending || updateEntry?.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col overflow-hidden p-0 gap-0 rounded-2xl sm:rounded-xl">
        <DialogHeader className="m-0 border-b bg-muted/20 p-6 pb-4 shrink-0">
          <DialogTitle>{titleOverride || (isEditing ? 'Edit Item Opname' : 'Tambah Item Opname')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Barang *</Label>
              <Controller
                name="item_id"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Combobox
                      options={items.map((item) => ({ label: item.name, value: item.id }))}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Pilih barang"
                      searchPlaceholder="Cari barang..."
                      disabled={isEditing && !onSubmitOverride}
                      className="flex-1 inline-flex items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    {!isEditing && !onSubmitOverride && <QRScanner onScan={handleScan} />}
                  </div>
                )}
              />
              {errors.item_id && <p className="text-destructive text-xs">{errors.item_id.message}</p>}
            </div>

            {!lockedWarehouseId && (
              <div className="space-y-1.5">
                <Label>Gudang *</Label>
                <Controller
                  name="warehouse_id"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value} disabled={!!lockedWarehouseId || (isEditing && !onSubmitOverride)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih gudang" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map((wh) => (
                          <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.warehouse_id && <p className="text-destructive text-xs">{errors.warehouse_id.message}</p>}
              </div>
            )}

            {existingRecord && (
              <div className="p-3 bg-amber-50/80 border border-amber-200/65 rounded-lg text-amber-900 text-xs space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-center justify-between gap-1.5 font-bold text-amber-800">
                  <span>Peringatan: Barang sudah terdaftar di gudang ini!</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger type="button" className="cursor-help transition-colors hover:text-amber-700 text-amber-500">
                        <HelpCircle size={14} className="shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[280px] p-3 text-xs leading-relaxed bg-zinc-950 text-white shadow-xl rounded-lg">
                        Barang ini sudah ada dalam sesi opname untuk gudang yang dipilih. Jika Anda menyimpan, data di atas akan memperbarui data eksisting berikut.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="grid grid-cols-2 gap-2 bg-white/70 p-2 rounded-lg border border-amber-100/80 text-amber-900 shadow-sm">
                  <div>
                    <span className="text-[9px] text-amber-600 block uppercase font-semibold tracking-wider">Stok Fisik Tercatat</span>
                    <span className="text-sm font-bold">{existingRecord.actual_stock} unit</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-amber-600 block uppercase font-semibold tracking-wider">Kategori Selisih</span>
                    <span className="text-sm font-bold">{existingRecord.diff_category_name || '-'}</span>
                  </div>
                  <div className="col-span-2 border-t border-amber-100/50 pt-1.5 mt-0.5">
                    <span className="text-[9px] text-amber-600 block uppercase font-semibold tracking-wider">Catatan</span>
                    <span className="text-xs italic leading-tight block">{existingRecord.note || '-'}</span>
                  </div>
                </div>
              </div>
            )}

            

            <div className="space-y-1.5">
              <Label htmlFor="actual-stock">Stok Fisik (Hasil Hitung) *</Label>
              <Input
                id="actual-stock"
                type="number"
                {...register('actual_stock', { valueAsNumber: true })}
              />
              {errors.actual_stock && <p className="text-destructive text-xs">{errors.actual_stock.message}</p>}
            </div>

            <div className="grid grid-cols-3 gap-3 p-4 bg-muted/40 rounded-xl border border-border/50 shadow-inner">
              <div className="flex flex-col justify-center">
                <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Sistem (Tercatat)</span>
                <span className="text-lg font-extrabold text-muted-foreground/80 mt-1">
                  {isLoadingStock ? '...' : systemStock ?? '-'}
                </span>
              </div>
              <div className="flex flex-col justify-center border-x border-border/60 px-3">
                <span className="text-[9px] text-indigo-900 uppercase font-bold tracking-wider">Sistem (Saat Ini)</span>
                <span className="text-lg font-black text-indigo-700 mt-1">
                  {isLoadingStock ? '...' : currentSystemStock ?? '-'}
                </span>
              </div>
              <div className="flex flex-col justify-center pl-1">
                <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Selisih</span>
                <span className={`text-lg font-black mt-1 ${difference > 0 ? 'text-green-600' : difference < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                  {systemStock !== null ? (difference > 0 ? `+${difference}` : difference) : '-'}
                </span>
              </div>
            </div>

            {difference !== 0 && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                <Label>Kategori Selisih *</Label>
                <Controller
                  name="diff_category_id"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <SelectTrigger className={errors.diff_category_id ? 'border-destructive focus:ring-destructive' : ''}>
                        <SelectValue placeholder="Pilih alasan/kategori selisih" />
                      </SelectTrigger>
                      <SelectContent>
                        {diffCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.diff_category_id && (
                  <p className="text-destructive text-xs">{errors.diff_category_id.message}</p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="opname-entry-note">Catatan (Opsional)</Label>
              <Textarea
                id="opname-entry-note"
                placeholder="Contoh: Barang rusak, hilang, dsb."
                className="resize-none"
                {...register('note')}
              />
              {errors.note && <p className="text-destructive text-xs">{errors.note.message}</p>}
            </div>
          </div>

          <DialogFooter className="m-0 border-t bg-muted/50 p-5 shrink-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isPending || isLoadingStock || systemStock === null}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {onSubmitOverride
                ? 'Simpan Perubahan'
                : (isEditing
                  ? 'Update Item'
                  : (existingRecord ? 'Perbarui & Lanjutkan' : 'Simpan Item')
                )
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
