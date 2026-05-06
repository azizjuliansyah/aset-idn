import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import type { Profile, Role } from '@/types/database'

const createSchema = z.object({
  full_name: z.string().min(1, 'Nama wajib diisi'),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  role: z.enum(['admin', 'user', 'general_affair']),
})

const editSchema = z.object({
  full_name: z.string().min(1, 'Nama wajib diisi'),
  role: z.enum(['admin', 'user', 'general_affair']),
})

type CreateValues = z.infer<typeof createSchema>
type EditValues = z.infer<typeof editSchema>

interface UsersDialogsProps {
  editUser: Profile | null
  deleteUser: Profile | null
  dialogOpen: boolean
  setDialogOpen: (open: boolean) => void
  setDeleteUser: (user: Profile | null) => void
  onCreate: (values: CreateValues) => void
  onEdit: (values: EditValues) => void
  onDelete: () => void
  isCreating: boolean
  isEditing: boolean
  isDeleting: boolean
}

export function UsersDialogs({
  editUser,
  deleteUser,
  dialogOpen,
  setDialogOpen,
  setDeleteUser,
  onCreate,
  onEdit,
  onDelete,
  isCreating,
  isEditing,
  isDeleting,
}: UsersDialogsProps) {
  const createForm = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { full_name: '', email: '', password: '', role: 'user' },
  })

  const editForm = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { full_name: '', role: 'user' },
  })

  useEffect(() => {
    if (editUser) {
      editForm.reset({ full_name: editUser.full_name, role: editUser.role })
    } else if (dialogOpen) {
      createForm.reset({ full_name: '', email: '', password: '', role: 'user' })
    }
  }, [editUser, dialogOpen, editForm, createForm])

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editUser ? 'Edit User' : 'Tambah User Baru'}</DialogTitle>
          </DialogHeader>

          {editUser ? (
            <form onSubmit={editForm.handleSubmit(onEdit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="u-name">Nama Lengkap *</Label>
                <Input id="u-name" {...editForm.register('full_name')} />
                {editForm.formState.errors.full_name && <p className="text-destructive text-xs">{editForm.formState.errors.full_name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Role *</Label>
                <Select 
                  value={editForm.watch('role')} 
                  onValueChange={(v) => editForm.setValue('role', v as Role)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="general_affair">General Affair</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
                <Button type="submit" disabled={isEditing}>
                  {isEditing ? <><Loader2 size={14} className="mr-1.5 animate-spin" />Menyimpan...</> : 'Simpan'}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <form onSubmit={createForm.handleSubmit(onCreate)} className="space-y-4">
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
                <Select 
                  value={createForm.watch('role')} 
                  onValueChange={(v) => createForm.setValue('role', v as Role)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="general_affair">General Affair</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? <><Loader2 size={14} className="mr-1.5 animate-spin" />Membuat...</> : 'Buat User'}
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
        onConfirm={onDelete}
        loading={isDeleting}
      />
    </>
  )
}
