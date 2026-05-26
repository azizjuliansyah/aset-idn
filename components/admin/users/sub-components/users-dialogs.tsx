import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import type { Profile, Role } from '@/types/database'

const baseSchema = z.object({
  full_name: z.string().min(1, 'Nama wajib diisi'),
  email: z.string().email('Email tidak valid'),
  password: z.string().optional().or(z.literal('')),
  phone: z.string().regex(/^8[1-9][0-9]{7,11}$/, 'Format nomor tidak valid (contoh: 81234567890)').optional().or(z.literal('')),
  role: z.enum(['admin', 'user', 'general_affair']),
})

interface UsersDialogsProps {
  editUser: Profile | null
  deleteUser: Profile | null
  dialogOpen: boolean
  setDialogOpen: (open: boolean) => void
  setDeleteUser: (user: Profile | null) => void
  onCreate: (values: any) => void
  onEdit: (values: any) => void
  onDelete: () => void
  onChangePasswordClick?: (user: Profile) => void
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
  onChangePasswordClick,
  isCreating,
  isEditing,
  isDeleting,
}: UsersDialogsProps) {
  // Dynamically build schema: password required only on Create
  const schema = editUser
    ? baseSchema
    : baseSchema.extend({
        password: z.string().min(8, 'Password minimal 8 karakter'),
      })

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { full_name: '', email: '', password: '', phone: '', role: 'user' as Role },
  })

  useEffect(() => {
    if (editUser) {
      form.reset({
        full_name: editUser.full_name,
        email: editUser.email || '',
        password: '',
        phone: editUser.phone || '',
        role: editUser.role,
      })
    } else if (dialogOpen) {
      form.reset({ full_name: '', email: '', password: '', phone: '', role: 'user' })
    }
  }, [editUser, dialogOpen, form])

  const onSubmit = (values: any) => {
    if (editUser) {
      const { password, ...editValues } = values
      onEdit(editValues)
    } else {
      onCreate(values)
    }
  }

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editUser ? 'Edit User' : 'Tambah User Baru'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 min-w-0">
            <div className="space-y-1.5">
              <Label htmlFor="u-name">Nama Lengkap *</Label>
              <Input id="u-name" {...form.register('full_name')} />
              {form.formState.errors.full_name && <p className="text-destructive text-xs">{form.formState.errors.full_name.message as string}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="u-phone">No. Telepon (WA)</Label>
              <div className="flex rounded-md">
                <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                  +62
                </span>
                <Input
                  id="u-phone"
                  placeholder="8123456789"
                  className="rounded-l-none"
                  {...form.register('phone')}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Format angka saja (contoh: 81234567890).
              </p>
              {form.formState.errors.phone && <p className="text-destructive text-xs">{form.formState.errors.phone.message as string}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="u-email">Email *</Label>
              <Input id="u-email" type="email" {...form.register('email')} />
              {form.formState.errors.email && <p className="text-destructive text-xs">{form.formState.errors.email.message as string}</p>}
            </div>

            {!editUser && (
              <div className="space-y-1.5">
                <Label htmlFor="u-password">Password *</Label>
                <Input id="u-password" type="password" {...form.register('password')} />
                {form.formState.errors.password && <p className="text-destructive text-xs">{form.formState.errors.password.message as string}</p>}
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Role *</Label>
              <Select 
                value={form.watch('role')} 
                onValueChange={(v) => form.setValue('role', v as Role)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="general_affair">General Affair</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editUser && (
              <div className="pt-3 border-t flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Keamanan Akun</Label>
                  <p className="text-[10px] text-muted-foreground">Ingin merubah password user ini?</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => onChangePasswordClick?.(editUser)}
                >
                  <KeyRound size={13} /> Ubah Password
                </Button>
              </div>
            )}

            <DialogFooter className="pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={editUser ? isEditing : isCreating}>
                {editUser ? (
                  isEditing ? <><Loader2 size={14} className="mr-1.5 animate-spin" />Menyimpan...</> : 'Simpan'
                ) : (
                  isCreating ? <><Loader2 size={14} className="mr-1.5 animate-spin" />Membuat...</> : 'Buat User'
                )}
              </Button>
            </DialogFooter>
          </form>
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

export { ChangePasswordDialog } from './change-password-dialog'
