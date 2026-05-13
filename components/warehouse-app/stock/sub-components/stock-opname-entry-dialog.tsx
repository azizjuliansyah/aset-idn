'use client'

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

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

const formSchema = z.object({
  item_id: z.string().min(1, 'Pilih barang'),
  warehouse_id: z.string().min(1, 'Pilih gudang'),
  actual_stock: z.number().min(0, 'Minimal 0'),
  note: z.string().optional(),
})

interface StockOpnameEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: string
  initialData?: any // Added for editing
}

export function StockOpnameEntryDialog({ open, onOpenChange, groupId, initialData }: StockOpnameEntryDialogProps) {
  const supabase = createClient()
  const { addEntry, updateEntry } = useStockOpnameMutations()
  const [items, setItems] = useState<any[]>([])
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [systemStock, setSystemStock] = useState<number | null>(null)
  const [isLoadingStock, setIsLoadingStock] = useState(false)

  const isEditing = !!initialData

  const { register, handleSubmit, control, watch, formState: { errors }, reset, setValue } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      item_id: '',
      warehouse_id: '',
      actual_stock: 0,
      note: '',
    },
  })

  // Set initial data when editing
  useEffect(() => {
    if (open && initialData) {
      setValue('item_id', initialData.item_id)
      setValue('warehouse_id', initialData.warehouse_id)
      setValue('actual_stock', initialData.actual_stock)
      setValue('note', initialData.note || '')
      setSystemStock(initialData.system_stock)
    } else if (open && !initialData) {
      reset({
        item_id: '',
        warehouse_id: '',
        actual_stock: 0,
        note: '',
      })
      setSystemStock(null)
    }
  }, [open, initialData, setValue, reset])

  const itemId = watch('item_id')
  const warehouseId = watch('warehouse_id')
  const actualStock = watch('actual_stock')

  // Load items and warehouses
  useEffect(() => {
    if (open) {
      const fetchData = async () => {
        const [itemsRes, whRes] = await Promise.all([
          supabase.from('items').select('id, name').order('name'),
          supabase.from('warehouses').select('id, name').order('name')
        ])
        setItems(itemsRes.data || [])
        setWarehouses(whRes.data || [])
      }
      fetchData()
    }
  }, [open, supabase])

  // Fetch system stock when item or warehouse changes (only if NOT editing, or if manually changed)
  useEffect(() => {
    const fetchSystemStock = async () => {
      if (itemId && warehouseId && !isEditing) {
        setIsLoadingStock(true)
        try {
          const { data } = await supabase
            .from('stock_ledger')
            .select('current_stock')
            .eq('item_id', itemId)
            .eq('warehouse_id', warehouseId)
            .single()

          setSystemStock(data?.current_stock ?? 0)
        } catch (e) {
          setSystemStock(0)
        } finally {
          setIsLoadingStock(false)
        }
      }
    }
    fetchSystemStock()
  }, [itemId, warehouseId, supabase, isEditing])

  const handleScan = (decodedText: string) => {
    if (isEditing) return // Disable scan when editing

    const item = items.find(i => i.id === decodedText)
    if (item) {
      setValue('item_id', item.id)
      toast.success(`Barang terdeteksi: ${item.name}`)
    } else {
      toast.error('QR Code tidak valid atau barang tidak ditemukan')
    }
  }

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (isEditing) {
      updateEntry.mutate({
        id: initialData.id,
        groupId,
        ...values,
      }, {
        onSuccess: () => {
          onOpenChange(false)
        }
      })
    } else {
      addEntry.mutate({
        ...values,
        group_id: groupId,
        system_stock: systemStock ?? 0
      }, {
        onSuccess: () => {
          onOpenChange(false)
          reset()
          setSystemStock(null)
        }
      })
    }
  }

  const onInvalid = (err: any) => {
    console.error('[StockOpname] Validation errors:', err)
    toast.error('Mohon lengkapi data dengan benar')
  }

  const difference = systemStock !== null ? (actualStock || 0) - systemStock : 0
  const isPending = addEntry.isPending || updateEntry.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Item Opname' : 'Tambah Item Opname'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4">
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
                    disabled={isEditing}
                    className="flex-1 inline-flex items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  {!isEditing && <QRScanner onScan={handleScan} />}
                </div>
              )}
            />
            {errors.item_id && <p className="text-destructive text-xs">{errors.item_id.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Gudang *</Label>
            <Controller
              name="warehouse_id"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} disabled={isEditing}>
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

          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg border border-border/50">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Stok Sistem</p>
              <p className="text-xl font-black">{isLoadingStock ? '...' : systemStock ?? '-'}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Selisih</p>
              <p className={`text-xl font-black ${difference > 0 ? 'text-green-600' : difference < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                {systemStock !== null ? (difference > 0 ? `+${difference}` : difference) : '-'}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="actual-stock">Stok Fisik (Hasil Hitung) *</Label>
            <Input
              id="actual-stock"
              type="number"
              {...register('actual_stock', { valueAsNumber: true })}
            />
            {errors.actual_stock && <p className="text-destructive text-xs">{errors.actual_stock.message}</p>}
          </div>

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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isPending || isLoadingStock || systemStock === null}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update Item' : 'Simpan Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
