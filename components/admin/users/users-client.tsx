'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, ShieldCheck, User } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'

import type { Profile, Role } from '@/types/database'
import { DataTable } from '@/components/shared/data-table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatDate } from '@/lib/utils'

const PAGE_SIZE = 10

const createSchema = z.object({
  full_name: z.string().min(1, 'Nama wajib diisi'),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  role: z.enum(['admin', 'user']),
})

const editSchema = z.object({
  full_name: z.string().min(1, 'Nama wajib diisi'),
  role: z.enum(['admin', 'user']),
})

type CreateValues = z.infer<typeof createSchema>
type EditValues = z.infer<typeof editSchema>

export function UsersClient() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editUser, setEditUser] = useState<Profile | null>(null)
  const [deleteUser, setDeleteUser] = useState<Profile | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        search: debouncedSearch,
      })
      const res = await fetch(`/api/admin/users?${params}`)
      if (!res.ok) throw new Error('Gagal memuat data')
      return res.json() as Promise<{ data: Profile[]; count: number }>
    },
  })

  const createForm = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { full_name: '', email: '', password: '', role: 'user' },
  })

  const editForm = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { full_name: '', role: 'user' },
  })

  const openCreate = () => {
    setEditUser(null)
    createForm.reset()
    setDialogOpen(true)
  }

  const openEdit = (user: Profile) => {
    setEditUser(user)
    editForm.reset({ full_name: user.full_name, role: user.role })
    setDialogOpen(true)
  }

  const createMutation = useMutation({
    mutationFn: async (values: CreateValues) => {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Gagal membuat user')
      }
    },
    onSuccess: () => {
      toast.success('User berhasil ditambahkan')
      qc.invalidateQueries({ queryKey: ['users'] })
      setDialogOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const editMutation = useMutation({
    mutationFn: async (values: EditValues) => {
      const res = await fetch(`/api/admin/users/${editUser?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Gagal memperbarui user')
      }
    },
    onSuccess: () => {
      toast.success('User diperbarui')
      qc.invalidateQueries({ queryKey: ['users'] })
      setDialogOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/users/${deleteUser?.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Gagal menghapus user')
      }
    },
    onSuccess: () => {
      toast.success('User dihapus')
      qc.invalidateQueries({ queryKey: ['users'] })
      setDeleteUser(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <>
      <DataTable
        columns={[
          { key: 'full_name', header: 'Nama' },
          {
            key: 'role', header: 'Role',
            render: (v) => (
              <Badge variant={v === 'admin' ? 'default' : 'secondary'} className="gap-1 text-xs">
                {v === 'admin' ? <ShieldCheck size={11} /> : <User size={11} />}
                {(v as string).charAt(0).toUpperCase() + (v as string).slice(1)}
              </Badge>
            ),
          },
          { key: 'created_at', header: 'Bergabung', render: (v) => formatDate(v as string) },
          {
            key: 'actions', header: '', className: 'w-24 text-right',
            render: (_, row) => (
              <div className="flex gap-1 justify-end">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(row)}><Pencil size={13} /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteUser(row)}><Trash2 size={13} /></Button>
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
        searchPlaceholder="Cari user..."
        actions={<Button size="sm" onClick={openCreate}><Plus size={14} className="mr-1.5" /> Tambah User</Button>}
        emptyText="Belum ada user"
      />

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editUser ? 'Edit User' : 'Tambah User Baru'}</DialogTitle>
          </DialogHeader>

          {editUser ? (
            <form onSubmit={editForm.handleSubmit((v) => editMutation.mutate(v))} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="u-name">Nama Lengkap *</Label>
                <Input id="u-name" {...editForm.register('full_name')} />
                {editForm.formState.errors.full_name && <p className="text-destructive text-xs">{editForm.formState.errors.full_name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Role *</Label>
                <Select value={editForm.watch('role')} onValueChange={(v) => editForm.setValue('role', v as Role)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
                <Button type="submit" disabled={editMutation.isPending}>
                  {editMutation.isPending ? <><Loader2 size={14} className="mr-1.5 animate-spin" />Menyimpan...</> : 'Simpan'}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <form onSubmit={createForm.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="cu-name">Nama Lengkap *</Label>
                <Input id="cu-name" {...createForm.register('full_name')} />
                {createForm.formState.errors.full_name && <p className="text-destructive text-xs">{createForm.formState.errors.full_name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cu-email">Email *</Label>
                <Input id="cu-email" type="email" {...createForm.register('email')} />
                {createForm.formState.errors.email && <p className="text-destructive text-xs">{createForm.formState.errors.email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cu-password">Password *</Label>
                <Input id="cu-password" type="password" {...createForm.register('password')} />
                {createForm.formState.errors.password && <p className="text-destructive text-xs">{createForm.formState.errors.password.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Role *</Label>
                <Select value={createForm.watch('role')} onValueChange={(v) => createForm.setValue('role', v as Role)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? <><Loader2 size={14} className="mr-1.5 animate-spin" />Membuat...</> : 'Buat User'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteUser}
        onOpenChange={(o) => !o && setDeleteUser(null)}
        description={`Hapus user "${deleteUser?.full_name}"? Data user akan dihapus permanen.`}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
      />
    </>
  )
}
