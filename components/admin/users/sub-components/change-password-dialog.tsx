import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import type { Profile } from '@/types/database'

export function ChangePasswordDialog({
  user,
  open,
  onOpenChange,
  onConfirm,
  loading,
}: {
  user: Profile | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (password: string) => void
  loading: boolean
}) {
  const schema = z.object({
    password: z.string().min(8, 'Password minimal 8 karakter'),
    confirmPassword: z.string().min(8, 'Konfirmasi password minimal 8 karakter'),
  }).refine((data) => data.password === data.confirmPassword, {
    message: 'Konfirmasi password tidak cocok',
    path: ['confirmPassword'],
  })

  type Values = z.infer<typeof schema>

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  useEffect(() => {
    if (open) {
      form.reset({ password: '', confirmPassword: '' })
    }
  }, [open, form])

  const handleSubmit = (values: Values) => {
    onConfirm(values.password)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            <span>Ubah Password</span>
          </DialogTitle>
          <div className="text-xs text-muted-foreground">
            Mengubah password untuk user <span className="font-semibold text-foreground">{user?.full_name}</span>.
          </div>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="p-new">Password Baru *</Label>
            <Input id="p-new" type="password" placeholder="Minimal 8 karakter" {...form.register('password')} />
            {form.formState.errors.password && <p className="text-destructive text-xs">{form.formState.errors.password.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-confirm">Konfirmasi Password Baru *</Label>
            <Input id="p-confirm" type="password" placeholder="Ulangi password baru" {...form.register('confirmPassword')} />
            {form.formState.errors.confirmPassword && <p className="text-destructive text-xs">{form.formState.errors.confirmPassword.message}</p>}
          </div>

          <DialogFooter className="pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={loading} className="bg-amber-600 hover:bg-amber-700 text-white">
              {loading ? <><Loader2 size={14} className="mr-1.5 animate-spin" />Memproses...</> : 'Ubah Password'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
