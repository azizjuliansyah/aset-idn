'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, AlertTriangle, Eye } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'
import { ItemDetailModal } from './item-detail-modal'

import { createClient } from '@/lib/supabase/client'
import type { Item, ItemCategory, ItemStatus, ItemCondition, Warehouse } from '@/types/database'
import { DataTable } from '@/components/shared/data-table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { formatCurrency, cn } from '@/lib/utils'

const PAGE_SIZE = 10

const schema = z.object({
  name: z.string().min(1, 'Nama barang wajib diisi'),
  item_category_id: z.string().optional(),
  item_status_id: z.string().optional(),
  item_condition_id: z.string().optional(),
  price: z.number().min(0),
  status: z.enum(['active', 'inactive']),
  note: z.string().optional(),
  minimum_stock: z.number().min(0),
})
type FormValues = z.infer<typeof schema>

type ItemWithJoins = Item & {
  item_category?: ItemCategory
  item_status?: ItemStatus
  item_condition?: ItemCondition
  current_stock?: number
  category_name?: string
  condition_name?: string
}

export function ItemsClient() {
  const supabase = createClient()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [warehouseId, setWarehouseId] = useState<string>('all')
  const [categoryId, setCategoryId] = useState<string>('all')
  const [conditionId, setConditionId] = useState<string>('all')
  const [stockStatus, setStockStatus] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<ItemWithJoins | null>(null)
  const [deleteItem, setDeleteItem] = useState<ItemWithJoins | null>(null)
  const [viewItemId, setViewItemId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['items', page, debouncedSearch, warehouseId, categoryId, conditionId, stockStatus],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_items_with_stats', {
        p_search: debouncedSearch,
        p_warehouse_id: warehouseId === 'all' ? null : warehouseId,
        p_category_id: categoryId === 'all' ? null : categoryId,
        p_condition_id: conditionId === 'all' ? null : conditionId,
        p_stock_status: stockStatus,
        p_limit: PAGE_SIZE,
        p_offset: (page - 1) * PAGE_SIZE,
      })
      if (error) throw error
      const count = data?.[0]?.total_count ?? 0
      return { data: (data ?? []) as ItemWithJoins[], count: Number(count) }
    },
  })

  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['item_category_all'],
    queryFn: async () => {
      const { data } = await supabase.from('item_category').select('id, name').order('name')
      return (data ?? []) as ItemCategory[]
    },
  })

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses_all'],
    queryFn: async () => {
      const { data } = await supabase.from('warehouses').select('id, name').order('name')
      return (data ?? []) as Warehouse[]
    },
  })

  const { data: statuses, isLoading: isLoadingStatuses } = useQuery({
    queryKey: ['item_status_all'],
    queryFn: async () => {
      const { data } = await supabase.from('item_status').select('id, name').order('name')
      return (data ?? []) as ItemStatus[]
    },
  })

  const { data: conditions, isLoading: isLoadingConditions } = useQuery({
    queryKey: ['item_condition_all'],
    queryFn: async () => {
      const { data } = await supabase.from('item_condition').select('id, name').order('name')
      return (data ?? []) as ItemCondition[]
    },
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', price: 0, status: 'active', minimum_stock: 0, note: '' },
  })

  const openCreate = () => {
    setEditItem(null)
    form.reset({ name: '', price: 0, status: 'active', minimum_stock: 0, note: '', item_category_id: '', item_status_id: '', item_condition_id: '' })
    setDialogOpen(true)
  }

  const openEdit = async (item: ItemWithJoins) => {
    // Memuat data lengkap barang untuk memastikan ID foreign key tersedia
    const { data: fullItem, error } = await supabase
      .from('items')
      .select('*')
      .eq('id', item.id)
      .single()
    
    if (error) {
      console.error('Error fetching full item:', error)
      toast.error('Gagal memuat data lengkap barang')
    }

    const dataToUse = fullItem || item
    setEditItem(dataToUse as ItemWithJoins)
    form.reset({
      name: dataToUse.name,
      item_category_id: dataToUse.item_category_id ?? '',
      item_status_id: dataToUse.item_status_id ?? '',
      item_condition_id: dataToUse.item_condition_id ?? '',
      price: dataToUse.price,
      status: dataToUse.status,
      note: dataToUse.note ?? '',
      minimum_stock: dataToUse.minimum_stock,
    })
    setDialogOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        name: values.name,
        item_category_id: values.item_category_id || null,
        item_status_id: values.item_status_id || null,
        item_condition_id: values.item_condition_id || null,
        price: values.price,
        status: values.status,
        note: values.note || null,
        minimum_stock: values.minimum_stock,
      }
      if (editItem) {
        const { error } = await supabase.from('items').update(payload).eq('id', editItem.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('items').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => { toast.success(editItem ? 'Barang diperbarui' : 'Barang ditambahkan'); qc.invalidateQueries({ queryKey: ['items'] }); setDialogOpen(false) },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('items').delete().eq('id', deleteItem!.id)
      if (error) throw error
    },
    onSuccess: () => { toast.success('Barang dihapus'); qc.invalidateQueries({ queryKey: ['items'] }); setDeleteItem(null) },
    onError: (err: Error) => toast.error(err.message),
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('items').delete().in('id', ids)
      if (error) throw error
    },
    onSuccess: () => { toast.success('Barang terpilih dihapus'); qc.invalidateQueries({ queryKey: ['items'] }) },
    onError: (err: Error) => toast.error(err.message),
  })

  const filterBar = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gudang</Label>
        <Select 
          value={warehouseId} 
          onValueChange={(v) => { if (v) { setWarehouseId(v); setPage(1) } }}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Semua Gudang" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Gudang</SelectItem>
            {warehouses?.map((w) => (
              <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kategori</Label>
        <Select 
          value={categoryId} 
          onValueChange={(v) => { if (v) { setCategoryId(v); setPage(1) } }}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Semua Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {categories?.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kondisi</Label>
        <Select 
          value={conditionId} 
          onValueChange={(v) => { if (v) { setConditionId(v); setPage(1) } }}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Semua Kondisi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kondisi</SelectItem>
            {conditions?.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status Stok</Label>
        <Select 
          value={stockStatus} 
          onValueChange={(v) => { if (v) { setStockStatus(v); setPage(1) } }}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="above_min">Di Atas Batas Minimum</SelectItem>
            <SelectItem value="below_min">Di Bawah Batas Minimum</SelectItem>
            <SelectItem value="out_of_stock">Tidak Tersedia</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  return (
    <>

      <DataTable
        columns={[
          { 
            key: 'name', 
            header: 'Nama Barang',
            render: (v, row) => (
              <button 
                onClick={() => setViewItemId(row.id)}
                className="font-bold text-primary hover:underline text-left"
              >
                {v as string}
              </button>
            )
          },
          { key: 'category_name', header: 'Kategori', render: (v) => (v as string) ?? '—' },
          { key: 'price', header: 'Harga', render: (v) => formatCurrency(v as number) },
          {
            key: 'current_stock', header: 'Stok',
            render: (v, row) => (
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "font-bold",
                  (v as number) === 0 ? "text-destructive" : 
                  (v as number) <= row.minimum_stock ? "text-amber-600" : "text-green-600"
                )}>
                  {v as number}
                </span>
                {(v as number) <= row.minimum_stock && (v as number) > 0 && <AlertTriangle size={12} className="text-amber-500" />}
              </div>
            ),
          },
          {
            key: 'minimum_stock', header: 'Min. Stok',
            render: (v) => (
              <span className="flex items-center gap-1 text-sm">
                {v as number}
                {(v as number) === 0 && <AlertTriangle size={12} className="text-amber-500" />}
              </span>
            ),
          },
          {
            key: 'actions', header: '', className: 'w-24 text-right',
            render: (_, row) => (
              <div className="flex gap-1 justify-end">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => setViewItemId(row.id)}><Eye size={13} /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(row)}><Pencil size={13} /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteItem(row)}><Trash2 size={13} /></Button>
              </div>
            ),
          },
        ]}
        data={data?.data ?? []}
        isLoading={isLoading}
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={data?.count ?? 0}
        onPageChange={setPage}
        onBulkDelete={(ids) => bulkDeleteMutation.mutate(ids)}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1) }}
        searchPlaceholder="Cari barang..."
        actions={<Button size="sm" onClick={openCreate}><Plus size={14} className="mr-1.5" /> Tambah Barang</Button>}
        filters={filterBar}
        emptyText="Belum ada barang"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? 'Edit Barang' : 'Tambah Barang'}</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
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
                    <Select 
                      value={field.value} 
                      onValueChange={field.onChange}
                    >
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
                    <Select 
                      value={field.value || undefined} 
                      onValueChange={field.onChange}
                      disabled={isLoadingStatuses && !statuses}
                    >
                      <SelectTrigger disabled={isLoadingStatuses && !statuses}>
                        <SelectValue placeholder={(isLoadingStatuses && !statuses) ? "Memuat..." : "Pilih status"} />
                      </SelectTrigger>
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
                    <Select 
                      value={field.value || undefined} 
                      onValueChange={field.onChange}
                      disabled={isLoadingConditions && !conditions}
                    >
                      <SelectTrigger disabled={isLoadingConditions && !conditions}>
                        <SelectValue placeholder={(isLoadingConditions && !conditions) ? "Memuat..." : "Pilih kondisi"} />
                      </SelectTrigger>
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
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <><Loader2 size={14} className="mr-1.5 animate-spin" />Menyimpan...</> : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={(o) => !o && setDeleteItem(null)}
        description={`Hapus barang "${deleteItem?.name}"? Riwayat stok yang terhubung juga akan terhapus.`}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
      />

      <ItemDetailModal 
        itemId={viewItemId} 
        onOpenChange={(open) => !open && setViewItemId(null)} 
      />
    </>
  )
}
