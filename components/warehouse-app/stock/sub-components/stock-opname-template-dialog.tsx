'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2, Search, CheckSquare, Square } from 'lucide-react'
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
import { useStockOpnameMutations } from '@/hooks/stock/use-stock-opname'
import { useWarehouses } from '@/hooks/queries/use-warehouses'
import { useActiveItems } from '@/hooks/queries/use-items'
import { Switch } from '@/components/ui/switch'

const formSchema = z.object({
  name: z.string().min(3, 'Nama minimal 3 karakter'),
  description: z.string().optional(),
  warehouse_id: z.string().min(1, 'Pilih gudang'),
})

interface StockOpnameTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: any
}

export function StockOpnameTemplateDialog({
  open,
  onOpenChange,
  initialData
}: StockOpnameTemplateDialogProps) {
  const supabase = createClient()
  const { createTemplate, updateTemplate } = useStockOpnameMutations()
  const { data: warehouses = [] } = useWarehouses()
  const { data: activeItems = [] } = useActiveItems()

  const [ledgerStock, setLedgerStock] = useState<Record<string, number>>({})
  const [isLoadingStock, setIsLoadingStock] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
  const [onlyShowInWarehouse, setOnlyShowInWarehouse] = useState(false)
  const [showItemError, setShowItemError] = useState(false)

  const isEditing = !!initialData

  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      warehouse_id: '',
    },
  })

  const selectedWarehouseId = watch('warehouse_id')

  // Load ledger stocks when warehouse changes
  useEffect(() => {
    if (!selectedWarehouseId) {
      setLedgerStock({})
      return
    }
    setIsLoadingStock(true)
    supabase.from('stock_ledger')
      .select('item_id, current_stock')
      .eq('warehouse_id', selectedWarehouseId)
      .then(({ data, error }) => {
        if (!error && data) {
          const stocks: Record<string, number> = {}
          data.forEach((row) => {
            stocks[row.item_id] = row.current_stock
          })
          setLedgerStock(stocks)
        }
        setIsLoadingStock(false)
      })
  }, [selectedWarehouseId, supabase])

  // Reset form when dialog opens/closes or initialData changes
  useEffect(() => {
    if (open) {
      if (initialData) {
        const itemIds = initialData.items?.map((i: any) => i.item_id) || []
        reset({
          name: initialData.name,
          description: initialData.description || '',
          warehouse_id: initialData.warehouse_id,
        })
        setSelectedItemIds(itemIds)
      } else {
        reset({
          name: '',
          description: '',
          warehouse_id: '',
        })
        setSelectedItemIds([])
      }
      setSearchQuery('')
      setOnlyShowInWarehouse(false)
      setShowItemError(false)
    }
  }, [open, initialData, reset])

  const toggleItem = (itemId: string) => {
    setSelectedItemIds(prev => 
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  const handleSelectAll = (filteredIds: string[]) => {
    setSelectedItemIds(prev => {
      const otherSelected = prev.filter(id => !filteredIds.includes(id))
      return [...otherSelected, ...filteredIds]
    })
  }

  const handleDeselectAll = (filteredIds: string[]) => {
    setSelectedItemIds(prev => prev.filter(id => !filteredIds.includes(id)))
  }

  // Filter items based on search query and warehouse filter toggle
  const getFilteredItems = () => {
    return activeItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
      if (!matchesSearch) return false

      if (onlyShowInWarehouse) {
        // Must exist in ledgerStock (meaning it has stock history in selected warehouse)
        return ledgerStock[item.id] !== undefined
      }

      return true
    })
  }

  const filteredItems = getFilteredItems()
  const filteredItemIds = filteredItems.map(i => i.id)
  const isAllFilteredSelected = filteredItemIds.length > 0 && filteredItemIds.every(id => selectedItemIds.includes(id))

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (selectedItemIds.length === 0) {
      setShowItemError(true)
      toast.error('Pilihlah minimal 1 barang untuk template')
      return
    }
    setShowItemError(false)
    const submitValues = { ...values, item_ids: selectedItemIds }
    if (isEditing && initialData) {
      updateTemplate.mutate(
        { id: initialData.id, ...submitValues },
        {
          onSuccess: () => {
            onOpenChange(false)
          }
        }
      )
    } else {
      createTemplate.mutate(submitValues, {
        onSuccess: () => {
          onOpenChange(false)
          reset()
        }
      })
    }
  }

  const onInvalid = (err: any) => {
    toast.error('Mohon lengkapi data dengan benar')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl sm:rounded-xl">
        <DialogHeader className="m-0 border-b bg-muted/20 p-6 pb-4 shrink-0">
          <DialogTitle>{isEditing ? 'Edit Template Stock Opname' : 'Buat Template Stock Opname'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[60vh]">
            <div className="space-y-1.5">
              <Label htmlFor="template-name">Nama Template *</Label>
              <Input
                id="template-name"
                placeholder="Contoh: Template Opname Mingguan Elektronik"
                {...register('name')}
              />
              {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="template-desc">Deskripsi (Opsional)</Label>
              <Textarea
                id="template-desc"
                placeholder="Catatan tambahan mengenai template ini..."
                className="resize-none h-20"
                {...register('description')}
              />
              {errors.description && <p className="text-destructive text-xs">{errors.description.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="template-warehouse">Gudang Acuan *</Label>
              <Select
                value={selectedWarehouseId}
                onValueChange={(val) => {
                  setValue('warehouse_id', val, { shouldValidate: true })
                  // When warehouse changes, we clear selected items if they are not in the new context,
                  // or keep them. For template safety, let's keep them but alert the user if needed.
                }}
              >
                <SelectTrigger id="template-warehouse">
                  <SelectValue placeholder="Pilih Gudang" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((wh) => (
                    <SelectItem key={wh.id} value={wh.id}>
                      {wh.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.warehouse_id && <p className="text-destructive text-xs">{errors.warehouse_id.message}</p>}
            </div>

            {selectedWarehouseId ? (
              <div className="space-y-3 pt-2 border-t">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <Label className="text-sm font-semibold">Pilih Barang ({selectedItemIds.length} terpilih) *</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="only-in-wh"
                      checked={onlyShowInWarehouse}
                      onCheckedChange={setOnlyShowInWarehouse}
                    />
                    <Label htmlFor="only-in-wh" className="text-xs text-muted-foreground cursor-pointer select-none">
                      Hanya stok aktif di gudang
                    </Label>
                  </div>
                </div>

                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari barang..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="text-xs h-7 px-2"
                    onClick={() => {
                      if (isAllFilteredSelected) {
                        handleDeselectAll(filteredItemIds)
                      } else {
                        handleSelectAll(filteredItemIds)
                      }
                    }}
                  >
                    {isAllFilteredSelected ? 'Batalkan Semua Pilihan' : 'Pilih Semua'}
                  </Button>
                </div>

                <div className="border rounded-md divide-y max-h-[200px] overflow-y-auto">
                  {isLoadingStock ? (
                    <div className="flex items-center justify-center p-8 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Memuat stok barang...
                    </div>
                  ) : filteredItems.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground text-sm">
                      Tidak ada barang ditemukan
                    </div>
                  ) : (
                    filteredItems.map((item) => {
                      const stock = ledgerStock[item.id] ?? 0
                      const isChecked = selectedItemIds.includes(item.id)
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleItem(item.id)}
                          className="flex items-center justify-between p-2.5 hover:bg-muted/50 cursor-pointer select-none text-sm"
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            {isChecked ? (
                              <CheckSquare className="h-4 w-4 text-primary shrink-0" />
                            ) : (
                              <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                            <span className="font-medium truncate">{item.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0 font-mono bg-muted px-1.5 py-0.5 rounded">
                            Stok: {stock} unit
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>
                {showItemError && selectedItemIds.length === 0 && <p className="text-destructive text-xs">Pilih minimal 1 barang</p>}
              </div>
            ) : (
              <div className="text-center p-6 border rounded-md border-dashed text-muted-foreground text-sm">
                Pilih gudang terlebih dahulu untuk memuat daftar barang
              </div>
            )}
          </div>

          <DialogFooter className="m-0 border-t bg-muted/50 p-5 shrink-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={createTemplate.isPending || updateTemplate.isPending}>
              {(createTemplate.isPending || updateTemplate.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan Template
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
