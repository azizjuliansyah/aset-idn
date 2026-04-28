'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'

import { createClient } from '@/lib/supabase/client'
import type { Item, ItemCategory, ItemStatus, ItemCondition } from '@/types/database'
import { DataTable } from '@/components/shared/data-table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'

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
}

export function ItemsClient() {
  const supabase = createClient()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<ItemWithJoins | null>(null)
  const [deleteItem, setDeleteItem] = useState<ItemWithJoins | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['items', page, debouncedSearch],
    queryFn: async () => {
      let q = supabase
        .from('items')
        .select('*, item_category(name), item_status(name), item_condition(name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
      if (debouncedSearch) q = q.ilike('name', `%${debouncedSearch}%`)
      const { data, count, error } = await q
      if (error) throw error
      return { data: (data ?? []) as ItemWithJoins[], count: count ?? 0 }
    },
  })

  const { data: categories } = useQuery({
    queryKey: ['item_category_all'],
    queryFn: async () => {
      const { data } = await supabase.from('item_category').select('id, name').order('name')
      return (data ?? []) as ItemCategory[]
    },
  })

  const { data: statuses } = useQuery({
    queryKey: ['item_status_all'],
    queryFn: async () => {
      const { data } = await supabase.from('item_status').select('id, name').order('name')
      return (data ?? []) as ItemStatus[]
    },
  })

  const { data: conditions } = useQuery({
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

  const openEdit = (item: ItemWithJoins) => {
    setEditItem(item)
    form.reset({
      name: item.name,
      item_category_id: item.item_category_id ?? '',
      item_status_id: item.item_status_id ?? '',
      item_condition_id: item.item_condition_id ?? '',
      price: item.price,
      status: item.status,
      note: item.note ?? '',
      minimum_stock: item.minimum_stock,
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

  return (
    <>
      <DataTable
        columns={[
          { key: 'name', header: 'Nama Barang' },
          { key: 'item_category', header: 'Kategori', render: (_, row) => row.item_category?.name ?? '—' },
          { key: 'price', header: 'Harga', render: (v) => formatCurrency(v as number) },
          {
            key: 'status', header: 'Status',
            render: (v) => (
              <Badge variant={v === 'active' ? 'default' : 'secondary'} className="text-xs">
                {v === 'active' ? 'Aktif' : 'Nonaktif'}
              </Badge>
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
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1) }}
        searchPlaceholder="Cari barang..."
        actions={<Button size="sm" onClick={openCreate}><Plus size={14} className="mr-1.5" /> Tambah Barang</Button>}
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
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                      <SelectContent>
                        {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
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
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Pilih status" /></SelectTrigger>
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
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Pilih kondisi" /></SelectTrigger>
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
    </>
  )
}
