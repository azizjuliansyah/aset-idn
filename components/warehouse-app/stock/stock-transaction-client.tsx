'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'

import { createClient } from '@/lib/supabase/client'
import type { StockIn, Item, Warehouse } from '@/types/database'
import { DataTable } from '@/components/shared/data-table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDateTime } from '@/lib/utils'

const PAGE_SIZE = 10

const schema = z.object({
  item_id: z.string().min(1, 'Barang wajib dipilih'),
  warehouse_id: z.string().min(1, 'Gudang wajib dipilih'),
  quantity: z.number().min(1, 'Jumlah minimal 1'),
  date: z.string().min(1, 'Tanggal wajib diisi'),
  note: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

type StockInWithJoins = StockIn & { item?: Item; warehouse?: Warehouse }

interface StockInClientProps {
  type: 'in' | 'out'
}

export function StockTransactionClient({ type }: StockInClientProps) {
  const table = type === 'in' ? 'stock_in' : 'stock_out'
  const queryKey = type === 'in' ? 'stock_in' : 'stock_out'
  const label = type === 'in' ? 'Barang Masuk' : 'Barang Keluar'

  const supabase = createClient()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<StockInWithJoins | null>(null)
  const [deleteItem, setDeleteItem] = useState<StockInWithJoins | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: [queryKey, page, debouncedSearch],
    queryFn: async () => {
      let q = supabase
        .from(table)
        .select('*, item:items(id,name), warehouse:warehouses(id,name)', { count: 'exact' })
        .order('date', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

      const { data, count, error } = await q
      if (error) throw error

      let filtered = (data ?? []) as StockInWithJoins[]
      if (debouncedSearch) {
        filtered = filtered.filter((r) =>
          r.item?.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          r.warehouse?.name?.toLowerCase().includes(debouncedSearch.toLowerCase())
        )
      }
      return { data: filtered, count: count ?? 0 }
    },
  })

  const { data: items } = useQuery({
    queryKey: ['items_all'],
    queryFn: async () => {
      const { data } = await supabase.from('items').select('id, name').eq('status', 'active').order('name')
      return (data ?? []) as Item[]
    },
  })

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses_all'],
    queryFn: async () => {
      const { data } = await supabase.from('warehouses').select('id, name').order('name')
      return (data ?? []) as Warehouse[]
    },
  })

  const now = () => new Date().toISOString().slice(0, 16)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { item_id: '', warehouse_id: '', quantity: 1, date: now(), note: '' },
  })

  const openCreate = () => {
    setEditItem(null)
    form.reset({ item_id: '', warehouse_id: '', quantity: 1, date: now(), note: '' })
    setDialogOpen(true)
  }

  const openEdit = (item: StockInWithJoins) => {
    setEditItem(item)
    form.reset({
      item_id: item.item_id,
      warehouse_id: item.warehouse_id,
      quantity: item.quantity,
      date: new Date(item.date).toISOString().slice(0, 16),
      note: item.note ?? '',
    })
    setDialogOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        item_id: values.item_id,
        warehouse_id: values.warehouse_id,
        quantity: values.quantity,
        date: new Date(values.date).toISOString(),
        note: values.note || null,
      }
      if (editItem) {
        const { error } = await supabase.from(table).update(payload).eq('id', editItem.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from(table).insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      toast.success(editItem ? `${label} diperbarui` : `${label} ditambahkan`)
      qc.invalidateQueries({ queryKey: [queryKey] })
      qc.invalidateQueries({ queryKey: ['stock_ledger'] })
      setDialogOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from(table).delete().eq('id', deleteItem!.id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success(`${label} dihapus`)
      qc.invalidateQueries({ queryKey: [queryKey] })
      qc.invalidateQueries({ queryKey: ['stock_ledger'] })
      setDeleteItem(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <>
      <DataTable
        columns={[
          { key: 'item', header: 'Barang', render: (_, row) => row.item?.name ?? '—' },
          { key: 'warehouse', header: 'Gudang', render: (_, row) => row.warehouse?.name ?? '—' },
          {
            key: 'quantity', header: 'Jumlah',
            render: (v) => (
              <span className={`font-semibold ${type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                {type === 'in' ? '+' : '-'}{v as number}
              </span>
            ),
          },
          { key: 'date', header: 'Tanggal', render: (v) => formatDateTime(v as string) },
          { key: 'note', header: 'Catatan', render: (v) => (v as string) || '—' },
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
        searchPlaceholder="Cari barang atau gudang..."
        actions={
          <Button size="sm" onClick={openCreate} className={type === 'in' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}>
            <Plus size={14} className="mr-1.5" /> Tambah
          </Button>
        }
        emptyText={`Belum ada ${label.toLowerCase()}`}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editItem ? `Edit ${label}` : `Tambah ${label}`}</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Barang *</Label>
              <Controller name="item_id" control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Pilih barang" /></SelectTrigger>
                    <SelectContent>
                      {items?.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.item_id && <p className="text-destructive text-xs">{form.formState.errors.item_id.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Gudang *</Label>
              <Controller name="warehouse_id" control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
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
                <Label htmlFor="st-qty">Jumlah *</Label>
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
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saveMutation.isPending}
                className={type === 'in' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              >
                {saveMutation.isPending ? <><Loader2 size={14} className="mr-1.5 animate-spin" />Menyimpan...</> : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={(o) => !o && setDeleteItem(null)}
        description={`Hapus transaksi ini?`}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
      />
    </>
  )
}
