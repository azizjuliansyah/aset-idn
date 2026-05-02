'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'

import { createClient } from '@/lib/supabase/client'
import type { ItemCategory } from '@/types/database'
import { DataTable } from '@/components/shared/data-table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatDate, formatCurrency } from '@/lib/utils'

const PAGE_SIZE = 10
const schema = z.object({ name: z.string().min(1, 'Nama kategori wajib diisi') })
type FormValues = z.infer<typeof schema>

export function ItemCategoryClient() {
  const supabase = createClient()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<ItemCategory | null>(null)
  const [deleteItem, setDeleteItem] = useState<ItemCategory | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['item_category', page, debouncedSearch, 'with_stats'],
    queryFn: async () => {
      let q = supabase.from('item_category').select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
      if (debouncedSearch) q = q.ilike('name', `%${debouncedSearch}%`)
      const { data, count, error } = await q
      if (error) throw error
      
      const categories = (data ?? []) as (ItemCategory & { total_stock?: number; total_value?: number })[]
      
      if (categories.length > 0) {
        const [statsRes, loansRes] = await Promise.all([
          supabase.from('stock_ledger')
            .select('category_name, current_stock, price')
            .in('category_name', categories.map(c => c.name)),
          supabase.from('item_loans')
            .select('quantity, item:items!inner(item_category:item_category!inner(name))')
            .eq('status', 'approved')
            .in('item.item_category.name', categories.map(c => c.name))
        ])

        const stats = statsRes.data || []
        const loans = loansRes.data || []

        categories.forEach(c => {
          const catStats = stats.filter(s => s.category_name === c.name)
          const catLoans = loans.filter((l: any) => l.item?.item_category?.name === c.name)
          
          const borrowed = catLoans.reduce((sum, l) => sum + (l.quantity || 0), 0)
          const rawStock = catStats.reduce((sum, s) => sum + (s.current_stock || 0), 0)
          
          c.total_stock = rawStock - borrowed
          c.total_value = catStats.reduce((sum, s) => sum + ((s.current_stock || 0) * (s.price || 0)), 0)
          // Value still uses physical stock (current_stock) or should it also use available? 
          // Usually value is based on what we own, even if borrowed.
        })
      }
      
      return { data: categories, count: count ?? 0 }
    },
  })

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: '' } })
  const openCreate = () => { setEditItem(null); form.reset({ name: '' }); setDialogOpen(true) }
  const openEdit = (item: ItemCategory) => { setEditItem(item); form.reset({ name: item.name }); setDialogOpen(true) }

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (editItem) {
        const res = await fetch(`/api/v1/item-categories/${editItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: values.name }),
        })
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || 'Gagal memperbarui kategori')
        }
      } else {
        const res = await fetch('/api/v1/item-categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: values.name }),
        })
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || 'Gagal menambahkan kategori')
        }
      }
    },
    onSuccess: () => { toast.success(editItem ? 'Kategori diperbarui' : 'Kategori ditambahkan'); qc.invalidateQueries({ queryKey: ['item_category'] }); setDialogOpen(false) },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/item-categories/${deleteItem!.id}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Gagal menghapus kategori')
      }
    },
    onSuccess: () => { toast.success('Kategori dihapus'); qc.invalidateQueries({ queryKey: ['item_category'] }); setDeleteItem(null) },
    onError: (err: Error) => toast.error(err.message),
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => 
        fetch(`/api/v1/item-categories/${id}`, { method: 'DELETE' })
      ))
    },
    onSuccess: () => { toast.success('Kategori terpilih dihapus'); qc.invalidateQueries({ queryKey: ['item_category'] }) },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <>
      <DataTable
        columns={[
          { key: 'name', header: 'Nama Kategori' },
          { key: 'total_stock', header: 'Total Stok', render: (_, row) => (row as any).total_stock ?? 0 },
          { key: 'total_value', header: 'Total Nilai', render: (_, row) => formatCurrency((row as any).total_value ?? 0) },
          { key: 'created_at', header: 'Dibuat', render: (v) => formatDate(v as string) },
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
        onBulkDelete={(ids) => bulkDeleteMutation.mutate(ids)}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1) }}
        searchPlaceholder="Cari kategori..."
        actions={<Button size="sm" onClick={openCreate}><Plus size={14} className="mr-1.5" /> Tambah Kategori</Button>}
        emptyText="Belum ada kategori"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editItem ? 'Edit Kategori' : 'Tambah Kategori'}</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Nama Kategori *</Label>
              <Input id="cat-name" placeholder="Elektronik" {...form.register('name')} />
              {form.formState.errors.name && <p className="text-destructive text-xs">{form.formState.errors.name.message}</p>}
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
        description={`Hapus kategori "${deleteItem?.name}"?`}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
      />
    </>
  )
}
