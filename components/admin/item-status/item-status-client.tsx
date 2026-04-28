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
import type { ItemStatus } from '@/types/database'
import { DataTable } from '@/components/shared/data-table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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

export function ItemStatusClient() {
  const supabase = createClient()
  const qc = useQueryClient()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<ItemStatus | null>(null)
  const [deleteItem, setDeleteItem] = useState<ItemStatus | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['item_status', page, debouncedSearch],
    queryFn: async () => {
      let q = supabase
        .from('item_status')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

      if (debouncedSearch) q = q.ilike('name', `%${debouncedSearch}%`)

      const { data, count, error } = await q
      if (error) throw error
      return { data: (data ?? []) as ItemStatus[], count: count ?? 0 }
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

  const openEdit = (item: ItemStatus) => {
    setEditItem(item)
    form.reset({ name: item.name, note: item.note ?? '' })
    setDialogOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (editItem) {
        const { error } = await supabase
          .from('item_status')
          .update({ name: values.name, note: values.note || null })
          .eq('id', editItem.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('item_status')
          .insert({ name: values.name, note: values.note || null })
        if (error) throw error
      }
    },
    onSuccess: () => {
      toast.success(editItem ? 'Status diperbarui' : 'Status ditambahkan')
      qc.invalidateQueries({ queryKey: ['item_status'] })
      setDialogOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deleteItem) return
      const { error } = await supabase.from('item_status').delete().eq('id', deleteItem.id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Status dihapus')
      qc.invalidateQueries({ queryKey: ['item_status'] })
      setDeleteItem(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <>
      <DataTable
        columns={[
          { key: 'name', header: 'Nama' },
          { key: 'note', header: 'Catatan', render: (v) => (v as string) || '—' },
          {
            key: 'actions',
            header: '',
            className: 'w-24 text-right',
            render: (_, row) => (
              <div className="flex gap-1 justify-end">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(row)}>
                  <Pencil size={13} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => setDeleteItem(row)}
                >
                  <Trash2 size={13} />
                </Button>
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
        searchPlaceholder="Cari status..."
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus size={14} className="mr-1.5" /> Tambah
          </Button>
        }
        emptyText="Belum ada status barang"
      />

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit Status Barang' : 'Tambah Status Barang'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="is-name">Nama *</Label>
              <Input id="is-name" placeholder="Contoh: Baru" {...form.register('name')} />
              {form.formState.errors.name && (
                <p className="text-destructive text-xs">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="is-note">Catatan</Label>
              <Textarea id="is-note" placeholder="Opsional..." rows={3} {...form.register('note')} />
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
        description={`Hapus status "${deleteItem?.name}"? Barang yang menggunakan status ini tidak akan terhapus.`}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
      />
    </>
  )
}
