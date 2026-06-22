'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, Eye, Info, MoreHorizontal, Check } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'
import { Switch } from '@/components/ui/switch'

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

const schema = z.object({
  name: z.string().min(1, 'Nama gudang wajib diisi'),
  note: z.string().optional(),
  is_default: z.boolean().optional(),
})
type FormValues = z.infer<typeof schema>

export function WarehouseClient() {
  const supabase = createClient()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<Warehouse | null>(null)
  const [deleteItem, setDeleteItem] = useState<Warehouse | null>(null)
  const [viewItem, setViewItem] = useState<Warehouse | null>(null)

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setPage(1)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['warehouses', page, pageSize, debouncedSearch],
    queryFn: async () => {
      let q = supabase.from('warehouses').select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)
      if (debouncedSearch) q = q.ilike('name', `%${debouncedSearch}%`)
      const { data, count, error } = await q
      if (error) throw error
      return { data: (data ?? []) as Warehouse[], count: count ?? 0 }
    },
  })

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: '', note: '', is_default: false } })
  const openCreate = () => { setEditItem(null); form.reset({ name: '', note: '', is_default: false }); setDialogOpen(true) }
  const openEdit = (item: Warehouse) => { setEditItem(item); form.reset({ name: item.name, note: item.note ?? '', is_default: item.is_default }); setDialogOpen(true) }

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (editItem) {
        const res = await fetch(`/api/v1/warehouses/${editItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: values.name, note: values.note || null, is_default: values.is_default }),
        })
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || 'Gagal memperbarui gudang')
        }
      } else {
        const res = await fetch('/api/v1/warehouses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: values.name, note: values.note || null, is_default: values.is_default }),
        })
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || 'Gagal menambahkan gudang')
        }
      }
    },
    onSuccess: () => { 
      toast.success(editItem ? 'Gudang diperbarui' : 'Gudang ditambahkan')
      qc.invalidateQueries({ queryKey: ['warehouses'] })
      qc.invalidateQueries({ queryKey: ['warehouses_all'] })
      qc.invalidateQueries({ queryKey: ['warehouses_for_loan'] })
      setDialogOpen(false) 
    },
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
    onSuccess: () => { 
      toast.success('Gudang dihapus')
      qc.invalidateQueries({ queryKey: ['warehouses'] })
      qc.invalidateQueries({ queryKey: ['warehouses_all'] })
      qc.invalidateQueries({ queryKey: ['warehouses_for_loan'] })
      setDeleteItem(null) 
    },
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
    onSuccess: () => { 
      toast.success('Gudang terpilih dihapus')
      qc.invalidateQueries({ queryKey: ['warehouses'] })
      qc.invalidateQueries({ queryKey: ['warehouses_all'] })
      qc.invalidateQueries({ queryKey: ['warehouses_for_loan'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('warehouses').update({ is_default: true }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { 
      toast.success('Gudang default diperbarui')
      qc.invalidateQueries({ queryKey: ['warehouses'] })
      qc.invalidateQueries({ queryKey: ['warehouses_all'] })
      qc.invalidateQueries({ queryKey: ['warehouses_for_loan'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <>
      <DataTable
        columns={[
          { 
            key: 'name', 
            header: 'Nama Gudang',
            render: (v, row) => (
              <div className="flex items-center gap-2">
                <span className="font-medium">{v as string}</span>
                {row.is_default && (
                  <div className="flex items-center gap-1 bg-yellow-400/10 text-yellow-600 dark:text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-400/20 text-[9px] font-bold uppercase tracking-tight">
                    Default
                  </div>
                )}
              </div>
            )
          },
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
                    {!row.is_default && (
                      <DropdownMenuItem onClick={() => setDefaultMutation.mutate(row.id)} disabled={setDefaultMutation.isPending}>
                        <Check size={14} className="mr-2 text-muted-foreground" /> Jadikan Default
                      </DropdownMenuItem>
                    )}
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
        pageSize={pageSize}
        totalCount={data?.count ?? 0}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
        onBulkDelete={(ids) => bulkDeleteMutation.mutate(ids)}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1) }}
        searchPlaceholder="Cari gudang..."
        actions={<Button size="sm" onClick={openCreate}><Plus size={14} className="mr-1.5" /> Tambah Gudang</Button>}
        emptyText="Belum ada gudang"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editItem ? 'Edit Gudang' : 'Tambah Gudang'}</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4 min-w-0">
            <div className="space-y-1.5">
              <Label htmlFor="w-name">Nama Gudang *</Label>
              <Input id="w-name" placeholder="Gudang Utama" {...form.register('name')} />
              {form.formState.errors.name && <p className="text-destructive text-xs">{form.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-note">Catatan</Label>
              <Textarea id="w-note" rows={3} {...form.register('note')} />
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-dashed border-yellow-500/30">
              <Switch 
                id="w-default" 
                checked={form.watch('is_default')} 
                onCheckedChange={(v) => form.setValue('is_default', v)} 
              />
              <div className="space-y-0.5">
                <Label htmlFor="w-default" className="text-xs font-semibold cursor-pointer flex items-center gap-1">
                  Gudang Utama (Default)
                </Label>
                <p className="text-[10px] text-muted-foreground">Pilih gudang ini secara otomatis di semua formulir.</p>
              </div>
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
        <DialogContent className="sm:max-w-md">
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
