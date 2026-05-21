'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, Eye, Info, MoreHorizontal } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'

import { createClient } from '@/lib/supabase/client'
import type { StockOpnameDiffCategory } from '@/types/database'
import { DataTable } from '@/components/shared/data-table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

const PAGE_SIZE = 10

const schema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  note: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export function StockOpnameDiffCategoryClient() {
  const supabase = createClient()
  const qc = useQueryClient()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<StockOpnameDiffCategory | null>(null)
  const [deleteItem, setDeleteItem] = useState<StockOpnameDiffCategory | null>(null)
  const [viewItem, setViewItem] = useState<StockOpnameDiffCategory | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['stock_opname_diff_categories', page, debouncedSearch],
    queryFn: async () => {
      let q = supabase
        .from('stock_opname_diff_categories')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

      if (debouncedSearch) q = q.ilike('name', `%${debouncedSearch}%`)

      const { data, count, error } = await q
      if (error) throw error
      return { data: (data ?? []) as StockOpnameDiffCategory[], count: count ?? 0 }
    },
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', note: '' },
  })

  const openCreate = () => {
    setEditItem(null)
    form.reset({ name: '', note: '' })
    setDialogOpen(true)
  }

  const openEdit = (item: StockOpnameDiffCategory) => {
    setEditItem(item)
    form.reset({ name: item.name, note: item.note ?? '' })
    setDialogOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (editItem) {
        const res = await fetch(`/api/v1/stock-opname-diff-categories/${editItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: values.name, note: values.note || null }),
        })
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || 'Gagal memperbarui kategori selisih')
        }
      } else {
        const res = await fetch('/api/v1/stock-opname-diff-categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: values.name, note: values.note || null }),
        })
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || 'Gagal menambahkan kategori selisih')
        }
      }
    },
    onSuccess: () => {
      toast.success(editItem ? 'Kategori selisih diperbarui' : 'Kategori selisih ditambahkan')
      qc.invalidateQueries({ queryKey: ['stock_opname_diff_categories'] })
      qc.invalidateQueries({ queryKey: ['stock_opname_diff_categories_all'] })
      setDialogOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deleteItem) return
      const res = await fetch(`/api/v1/stock-opname-diff-categories/${deleteItem.id}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Gagal menghapus kategori selisih')
      }
    },
    onSuccess: () => {
      toast.success('Kategori selisih dihapus')
      qc.invalidateQueries({ queryKey: ['stock_opname_diff_categories'] })
      qc.invalidateQueries({ queryKey: ['stock_opname_diff_categories_all'] })
      setDeleteItem(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => 
        fetch(`/api/v1/stock-opname-diff-categories/${id}`, { method: 'DELETE' })
      ))
    },
    onSuccess: () => {
      toast.success('Kategori selisih terpilih dihapus')
      qc.invalidateQueries({ queryKey: ['stock_opname_diff_categories'] })
      qc.invalidateQueries({ queryKey: ['stock_opname_diff_categories_all'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <>
      <DataTable
        columns={[
          { key: 'name', header: 'Nama Kategori Selisih' },
          { key: 'note', header: 'Catatan / Alasan' },
          {
            key: 'actions',
            header: '',
            className: 'w-16 text-right',
            render: (_, row) => (
              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger 
                    render={<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" />}
                  >
                    <MoreHorizontal size={16} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setViewItem(row)}>
                      <Eye size={14} className="mr-2 text-muted-foreground" /> Detail
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openEdit(row)}>
                      <Pencil size={14} className="mr-2 text-muted-foreground" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setDeleteItem(row)} className="text-destructive focus:text-destructive focus:bg-red-50">
                      <Trash2 size={14} className="mr-2" /> Hapus
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
        searchPlaceholder="Cari kategori selisih..."
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus size={14} className="mr-1.5" /> Tambah
          </Button>
        }
        emptyText="Belum ada kategori selisih stock opname"
      />

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit Kategori Selisih' : 'Tambah Kategori Selisih'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4 min-w-0">
            <div className="space-y-1.5">
              <Label htmlFor="dc-name">Nama Kategori *</Label>
              <Input id="dc-name" placeholder="Contoh: Barang Hilang" {...form.register('name')} />
              {form.formState.errors.name && (
                <p className="text-destructive text-xs">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dc-note">Keterangan / Deskripsi</Label>
              <Textarea id="dc-note" placeholder="Tulis deskripsi atau catatan alasan selisih..." rows={3} {...form.register('note')} />
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

      {/* Confirm Delete */}
      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={(o) => !o && setDeleteItem(null)}
        description={`Hapus kategori selisih "${deleteItem?.name}"? Data stock opname yang terkait tidak akan terhapus.`}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
      />

      {/* Detail Dialog */}
      <Dialog open={!!viewItem} onOpenChange={(o) => !o && setViewItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2">
            <Info size={18} className="text-primary" />
            Detail Kategori Selisih
          </DialogTitle></DialogHeader>
          {viewItem && (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Nama Kategori</p>
                <p className="font-semibold text-lg">{viewItem.name}</p>
              </div>
              <div className="space-y-2 border-t border-dashed pt-3">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Catatan / Keterangan</p>
                <div className="text-sm italic p-4 bg-muted/50 rounded-lg border border-dashed min-h-[100px] text-muted-foreground leading-relaxed">
                  {viewItem.note || 'Tidak ada deskripsi untuk kategori ini.'}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
