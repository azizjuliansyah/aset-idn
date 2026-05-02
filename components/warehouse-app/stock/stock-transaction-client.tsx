'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, Calendar as CalendarIcon, ChevronDown, Eye, Info } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'
import { format, subDays, startOfDay, endOfDay, parseISO } from 'date-fns'

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
import { Combobox } from '@/components/ui/combobox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatDateTime, cn } from '@/lib/utils'

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
  const [warehouseId, setWarehouseId] = useState<string>('all')
  const [categoryId, setCategoryId] = useState<string>('all')
  const [datePreset, setDatePreset] = useState<string>('all')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<StockInWithJoins | null>(null)
  const [deleteItem, setDeleteItem] = useState<StockInWithJoins | null>(null)
  const [viewItem, setViewItem] = useState<StockInWithJoins | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: [queryKey, page, debouncedSearch, warehouseId, categoryId, datePreset, customStartDate, customEndDate],
    queryFn: async () => {
      let q = supabase
        .from(table)
        .select('*, item:items!inner(id,name,item_category_id,item_category:item_category(name)), warehouse:warehouses(id,name), creator:profiles!created_by(full_name)', { count: 'exact' })
        .order('date', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

      if (warehouseId !== 'all') {
        q = q.eq('warehouse_id', warehouseId)
      }

      if (categoryId !== 'all') {
        q = q.eq('item.item_category_id', categoryId)
      }

      if (datePreset !== 'all') {
        let start: Date | null = null
        let end: Date = endOfDay(new Date())

        if (datePreset === 'custom') {
          if (customStartDate) start = startOfDay(parseISO(customStartDate))
          if (customEndDate) end = endOfDay(parseISO(customEndDate))
        } else {
          start = startOfDay(subDays(new Date(), parseInt(datePreset)))
        }

        if (start) q = q.gte('date', start.toISOString())
        q = q.lte('date', end.toISOString())
      }

      if (debouncedSearch) {
        q = q.or(`item.name.ilike.%${debouncedSearch}%,note.ilike.%${debouncedSearch}%`)
      }

      const { data, count, error } = await q
      if (error) throw error
      return { data: (data ?? []) as StockInWithJoins[], count: count ?? 0 }
    },
  })

  const { data: categories } = useQuery({
    queryKey: ['item_category_all'],
    queryFn: async () => {
      const { data } = await supabase.from('item_category').select('id, name').order('name')
      return (data ?? []) as any[]
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

  // Calculate truly available stock for validation (Current + This item's qty if editing/stock_out)
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
        const res = await fetch(`/api/v1/stock-${type}/${editItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || `Gagal memperbarui ${label.toLowerCase()}`)
        }
      } else {
        const res = await fetch(`/api/v1/stock-${type}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || `Gagal menambahkan ${label.toLowerCase()}`)
        }
      }
    },
    onSuccess: () => {
      toast.success(editItem ? `${label} diperbarui` : `${label} ditambahkan`)
      qc.invalidateQueries({ queryKey: [queryKey] })
      qc.invalidateQueries({ queryKey: ['stock_ledger'] })
      qc.invalidateQueries({ queryKey: ['item_stock'] })
      setDialogOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/stock-${type}/${deleteItem!.id}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || `Gagal menghapus ${label.toLowerCase()}`)
      }
    },
    onSuccess: () => {
      toast.success(`${label} dihapus`)
      qc.invalidateQueries({ queryKey: [queryKey] })
      qc.invalidateQueries({ queryKey: ['stock_ledger'] })
      qc.invalidateQueries({ queryKey: ['item_stock'] })
      setDeleteItem(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => 
        fetch(`/api/v1/stock-${type}/${id}`, { method: 'DELETE' })
      ))
    },
    onSuccess: () => {
      toast.success(`${label} terpilih dihapus`)
      qc.invalidateQueries({ queryKey: [queryKey] })
      qc.invalidateQueries({ queryKey: ['stock_ledger'] })
      qc.invalidateQueries({ queryKey: ['item_stock'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const getDateLabel = () => {
    if (datePreset === 'all') return 'Semua Tanggal'
    if (datePreset === 'custom') {
      if (customStartDate && customEndDate) return `${customStartDate} - ${customEndDate}`
      if (customStartDate) return `Dari ${customStartDate}`
      if (customEndDate) return `Sampai ${customEndDate}`
      return 'Custom Tanggal'
    }
    return `${datePreset} Hari Terakhir`
  }

  const filterBar = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filter Tanggal</Label>
        <Popover>
          <PopoverTrigger render={
            <Button variant="outline" className="h-9 w-full justify-between font-normal px-3">
              <div className="flex items-center gap-2 overflow-hidden">
                <CalendarIcon size={14} className="text-muted-foreground shrink-0" />
                <span className="truncate">{getDateLabel()}</span>
              </div>
              <ChevronDown size={14} className="text-muted-foreground shrink-0" />
            </Button>
          } />
          <PopoverContent className="w-64 p-3" align="start">
            <div className="space-y-3">
              <div className="space-y-2">
                {[
                  { label: 'Semua Tanggal', value: 'all' },
                  { label: '1 Hari Yang Lalu', value: '1' },
                  { label: '7 Hari Yang Lalu', value: '7' },
                  { label: '14 Hari Yang Lalu', value: '14' },
                  { label: '30 Hari Yang Lalu', value: '30' },
                  { label: '60 Hari Yang Lalu', value: '60' },
                  { label: 'Custom Tanggal', value: 'custom' },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded transition-colors">
                    <input
                      type="radio"
                      name="datePreset"
                      value={opt.value}
                      checked={datePreset === opt.value}
                      onChange={(e) => { setDatePreset(e.target.value); setPage(1) }}
                      className="w-3.5 h-3.5 text-primary focus:ring-primary border-gray-300"
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>

              {datePreset === 'custom' && (
                <div className="space-y-2 pt-2 border-t">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Mulai Tanggal</Label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => { setCustomStartDate(e.target.value); setPage(1) }}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Sampai Tanggal</Label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => { setCustomEndDate(e.target.value); setPage(1) }}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )

  return (
    <>
      <DataTable
        columns={[
          { key: 'item', header: 'Barang', render: (_, row) => row.item?.name ?? '—' },
          { key: 'category', header: 'Kategori', render: (_, row) => (row.item as any)?.item_category?.name ?? '—' },
          { key: 'warehouse', header: 'Gudang', render: (_, row) => row.warehouse?.name ?? '—' },
          { key: 'quantity', header: 'Jumlah',
            render: (v) => (
              <span className={`font-semibold ${type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                {type === 'in' ? '+' : '-'}{v as number}
              </span>
            ),
          },
          { key: 'creator', header: 'PIC', render: (_, row) => (row as any).creator?.full_name ?? '—' },
          { key: 'date', header: 'Tanggal', render: (v) => formatDateTime(v as string) },
          {
            key: 'actions', header: '', className: 'w-24 text-right',
            render: (_, row) => (
              <div className="flex gap-1 justify-end">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => setViewItem(row)}><Eye size={13} /></Button>
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
        searchPlaceholder="Cari barang atau catatan..."
        filters={filterBar}
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
                  <Combobox 
                    value={field.value} 
                    onValueChange={field.onChange}
                    options={items?.map((i) => ({ value: i.id, label: i.name })) ?? []}
                    placeholder="Pilih barang"
                    searchPlaceholder="Cari barang..."
                  />
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
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saveMutation.isPending || loadingStock}
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

      <Dialog open={!!viewItem} onOpenChange={(o) => !o && setViewItem(null)}>
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
                  <p className="font-bold text-base">{(viewItem.item as any)?.name ?? '—'}</p>
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
                  <p className="font-medium text-muted-foreground">{(viewItem as any).creator?.full_name ?? '—'}</p>
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
