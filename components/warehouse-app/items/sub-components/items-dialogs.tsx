import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { itemSchema, type ItemFormValues } from '@/lib/validations/item'
import { useCategories } from '@/hooks/queries/use-categories'
import { useItemStatuses } from '@/hooks/queries/use-statuses'
import { useItemConditions } from '@/hooks/queries/use-conditions'
import type { ItemWithJoins } from '@/hooks/items/use-items-manager'

interface ItemsDialogsProps {
  editItem: ItemWithJoins | null
  deleteItem: ItemWithJoins | null
  dialogOpen: boolean
  setDialogOpen: (open: boolean) => void
  setDeleteItem: (item: ItemWithJoins | null) => void
  onSave: (values: ItemFormValues) => void
  onDelete: () => void
  isSaving: boolean
  isDeleting: boolean
}

export function ItemsDialogs({
  editItem,
  deleteItem,
  dialogOpen,
  setDialogOpen,
  setDeleteItem,
  onSave,
  onDelete,
  isSaving,
  isDeleting,
}: ItemsDialogsProps) {
  const { data: categories, isLoading: isLoadingCategories } = useCategories()
  const { data: statuses, isLoading: isLoadingStatuses } = useItemStatuses()
  const { data: conditions, isLoading: isLoadingConditions } = useItemConditions()

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: { name: '', price: 0, status: 'active', minimum_stock: 0, note: '' },
  })

  useEffect(() => {
    if (editItem) {
      form.reset({
        name: editItem.name,
        item_category_id: editItem.item_category_id ?? '',
        item_status_id: editItem.item_status_id ?? '',
        item_condition_id: editItem.item_condition_id ?? '',
        price: editItem.price,
        status: editItem.status,
        note: editItem.note ?? '',
        minimum_stock: editItem.minimum_stock,
      })
    } else if (dialogOpen) {
      form.reset({ name: '', price: 0, status: 'active', minimum_stock: 0, note: '', item_category_id: '', item_status_id: '', item_condition_id: '' })
    }
  }, [editItem, dialogOpen, form])

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? 'Edit Barang' : 'Tambah Barang'}</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="i-name">Nama Barang *</Label>
              <Input id="i-name" {...form.register('name')} />
              {form.formState.errors.name && <p className="text-destructive text-xs">{form.formState.errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Kategori</Label>
                <Controller name="item_category_id" control={form.control}
                  render={({ field }) => (
                    <Combobox 
                      value={field.value} 
                      onValueChange={field.onChange}
                      options={categories?.map((c) => ({ value: c.id, label: c.name })) ?? []}
                      placeholder="Pilih kategori"
                      searchPlaceholder="Cari kategori..."
                      disabled={isLoadingCategories && !categories}
                    />
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status Aktif</Label>
                <Controller name="status" control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Aktif</SelectItem>
                        <SelectItem value="inactive">Nonaktif</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Status Barang</Label>
                <Controller name="item_status_id" control={form.control}
                  render={({ field }) => (
                    <Select value={field.value || undefined} onValueChange={field.onChange} disabled={isLoadingStatuses && !statuses}>
                      <SelectTrigger><SelectValue placeholder={(isLoadingStatuses && !statuses) ? "Memuat..." : "Pilih status"} /></SelectTrigger>
                      <SelectContent>
                        {statuses?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Kondisi Barang</Label>
                <Controller name="item_condition_id" control={form.control}
                  render={({ field }) => (
                    <Select value={field.value || undefined} onValueChange={field.onChange} disabled={isLoadingConditions && !conditions}>
                      <SelectTrigger><SelectValue placeholder={(isLoadingConditions && !conditions) ? "Memuat..." : "Pilih kondisi"} /></SelectTrigger>
                      <SelectContent>
                        {conditions?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="i-price">Harga (Rp)</Label>
                <Input id="i-price" type="number" min={0} {...form.register('price', { valueAsNumber: true })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="i-minstock">Stok Minimum</Label>
                <Input id="i-minstock" type="number" min={0} {...form.register('minimum_stock', { valueAsNumber: true })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="i-note">Catatan</Label>
              <Textarea id="i-note" rows={2} {...form.register('note')} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <><Loader2 size={14} className="mr-1.5 animate-spin" />Menyimpan...</> : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={(o) => !o && setDeleteItem(null)}
        description={`Hapus barang "${deleteItem?.name}"? Riwayat stok yang terhubung juga akan terhapus.`}
        onConfirm={onDelete}
        loading={isDeleting}
      />
    </>
  )
}
