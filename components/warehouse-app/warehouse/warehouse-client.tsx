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
import type { Warehouse } from '@/types/database'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatDate } from '@/lib/utils'

const PAGE_SIZE = 10
const schema = z.object({
  name: z.string().min(1, 'Nama gudang wajib diisi'),
  note: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export function WarehouseClient() {
  const supabase = createClient()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<Warehouse | null>(null)
  const [deleteItem, setDeleteItem] = useState<Warehouse | null>(null)
  const [viewItem, setViewItem] = useState<Warehouse | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['warehouses', page, debouncedSearch],
    queryFn: async () => {
      let q = supabase.from('warehouses').select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
      if (debouncedSearch) q = q.ilike('name', `%${debouncedSearch}%`)
      const { data, count, error } = await q
      if (error) throw error
      return { data: (data ?? []) as Warehouse[], count: count ?? 0 }
    },
  })

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: '', note: '' } })
  const openCreate = () => { setEditItem(null); form.reset({ name: '', note: '' }); setDialogOpen(true) }
  const openEdit = (item: Warehouse) => { setEditItem(item); form.reset({ name: item.name, note: item.note ?? '' }); setDialogOpen(true) }

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (editItem) {
        const res = await fetch(`/api/v1/warehouses/${editItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: values.name, note: values.note || null }),
        })
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || 'Gagal memperbarui gudang')
        }
      } else {
        const res = await fetch('/api/v1/warehouses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: values.name, note: values.note || null }),
        })
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || 'Gagal menambahkan gudang')
        }
      }
    },
    onSuccess: () => { toast.success(editItem ? 'Gudang diperbarui' : 'Gudang ditambahkan'); qc.invalidateQueries({ queryKey: ['warehouses'] }); setDialogOpen(false) },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/warehouses/${deleteItem!.id}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Gagal menghapus gudang')
      }
    },
    onSuccess: () => { toast.success('Gudang dihapus'); qc.invalidateQueries({ queryKey: ['warehouses'] }); setDeleteItem(null) },
    onError: (err: Error) => toast.error(err.message),
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      // For bulk delete, we can still use Supabase or create a bulk delete route
      // Let's use individual deletes for now or a bulk endpoint if needed.
      // Individual deletes are safer for body preservation.
      await Promise.all(ids.map(id => 
        fetch(`/api/v1/warehouses/${id}`, { method: 'DELETE' })
      ))
    },
    onSuccess: () => { toast.success('Gudang terpilih dihapus'); qc.invalidateQueries({ queryKey: ['warehouses'] }) },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <>
      <DataTable
        columns={[
          { key: 'name', header: 'Nama Gudang' },
          { key: 'created_at', header: 'Dibuat', render: (v) => formatDate(v as string) },
          {
            key: 'actions', header: '', className: 'w-16 text-right',
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
                      <Eye size={14} className="mr-2 text-muted-foreground" /> Detail Gudang
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openEdit(row)}>
                      <Pencil size={14} className="mr-2 text-muted-foreground" /> Edit Gudang
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setDeleteItem(row)} className="text-destructive focus:text-destructive focus:bg-red-50">
                      <Trash2 size={14} className="mr-2" /> Hapus Gudang
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
        searchPlaceholder="Cari gudang..."
        actions={<Button size="sm" onClick={openCreate}><Plus size={14} className="mr-1.5" /> Tambah Gudang</Button>}
        emptyText="Belum ada gudang"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editItem ? 'Edit Gudang' : 'Tambah Gudang'}</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="w-name">Nama Gudang *</Label>
              <Input id="w-name" placeholder="Gudang Utama" {...form.register('name')} />
              {form.formState.errors.name && <p className="text-destructive text-xs">{form.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-note">Catatan</Label>
              <Textarea id="w-note" rows={3} {...form.register('note')} />
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
        description={`Hapus gudang "${deleteItem?.name}"? Data stok yang terhubung juga akan terhapus.`}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
      />

      <Dialog open={!!viewItem} onOpenChange={(o) => !o && setViewItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2">
            <Info size={18} className="text-primary" />
            Detail Gudang
          </DialogTitle></DialogHeader>
          {viewItem && (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Nama Gudang</p>
                <p className="font-bold text-lg">{viewItem.name}</p>
              </div>
              <div className="space-y-2 border-t border-dashed pt-3">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Catatan / Alamat</p>
                <div className="text-sm italic p-4 bg-muted/50 rounded-lg border border-dashed min-h-[100px] text-muted-foreground leading-relaxed">
                  {viewItem.note || 'Tidak ada catatan untuk gudang ini.'}
                </div>
              </div>
              <div className="pt-2 flex justify-between items-center text-[10px] text-muted-foreground uppercase font-medium">
                <span>Dibuat: {formatDate(viewItem.created_at)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
