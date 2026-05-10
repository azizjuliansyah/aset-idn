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
  phone: z.string().regex(/^8[1-9][0-9]{7,11}$/, 'Format nomor tidak valid (contoh: 81234567890)').optional().or(z.literal('')),
  role: z.enum(['admin', 'user', 'general_affair']),
})

const editSchema = z.object({
  full_name: z.string().min(1, 'Nama wajib diisi'),
  phone: z.string().regex(/^8[1-9][0-9]{7,11}$/, 'Format nomor tidak valid (contoh: 81234567890)').optional().or(z.literal('')),
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
    defaultValues: { full_name: '', email: '', password: '', phone: '', role: 'user' },
  })

  const editForm = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { full_name: '', phone: '', role: 'user' },
  })

  useEffect(() => {
    if (editUser) {
      editForm.reset({ full_name: editUser.full_name, phone: editUser.phone || '', role: editUser.role })
    } else if (dialogOpen) {
      createForm.reset({ full_name: '', email: '', password: '', phone: '', role: 'user' })
    }
  }, [editUser, dialogOpen, editForm, createForm])

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editUser ? 'Edit User' : 'Tambah User Baru'}</DialogTitle>
          </DialogHeader>

          {editUser ? (
            <form onSubmit={editForm.handleSubmit(onEdit)} className="space-y-4 min-w-0">
              <div className="space-y-1.5">
                <Label htmlFor="u-name">Nama Lengkap *</Label>
                <Input id="u-name" {...editForm.register('full_name')} />
                {editForm.formState.errors.full_name && <p className="text-destructive text-xs">{editForm.formState.errors.full_name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u-phone">No. Telepon (WA)</Label>
                <div className="flex rounded-md shadow-sm">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                    +62
                  </span>
                  <Input 
                    id="u-phone" 
                    placeholder="8123456789" 
                    className="rounded-l-none"
                    {...editForm.register('phone')} 
                  />
                </div>
                <p className="text-[10px] text-red-600">
                  Format angka saja (contoh: 81234567890).
                </p>
                {editForm.formState.errors.phone && <p className="text-destructive text-xs">{editForm.formState.errors.phone.message}</p>}
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
            <form onSubmit={createForm.handleSubmit(onCreate)} className="space-y-4 min-w-0">
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
                <Label htmlFor="cu-phone">No. Telepon (WA)</Label>
                <div className="flex rounded-md shadow-sm">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                    +62
                  </span>
                  <Input 
                    id="cu-phone" 
                    placeholder="8123456789" 
                    className="rounded-l-none"
                    {...createForm.register('phone')} 
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Format angka saja (contoh: 81234567890).
                </p>
                {createForm.formState.errors.phone && <p className="text-destructive text-xs">{createForm.formState.errors.phone.message}</p>}
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
