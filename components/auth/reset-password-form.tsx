'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, KeyRound, Warehouse } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Password minimal 6 karakter'),
  confirmPassword: z.string().min(6, 'Password minimal 6 karakter'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Password tidak cocok",
  path: ["confirmPassword"],
})

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>

export function ResetPasswordForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<{ logo_url: string | null; name: string | null }>({
    logo_url: null,
    name: null,
  })

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('company_settings')
      .select('logo_url, name')
      .single()
      .then(({ data }) => {
        if (data) {
          setSettings({
            logo_url: data.logo_url,
            name: data.name,
          })
        }
      })
  }, [])

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const onSubmit = async (values: ResetPasswordValues) => {
    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.auth.updateUser({
      password: values.password,
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    toast.success('Password berhasil diperbarui!')
    router.push('/login')
  }

  return (
    <div className="w-full max-w-md">
      <div className="flex flex-col items-center mb-10">
        <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center shadow-xl shadow-primary/10 mb-4 overflow-hidden border border-slate-100">
          {settings.logo_url ? (
            <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
          ) : (
            <Warehouse className="text-primary" size={32} />
          )}
        </div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight text-center px-4">
          {settings.name ?? 'Atur Ulang Password'}
        </h1>
        <p className="text-slate-500 text-sm mt-1">Silakan masukkan password baru Anda</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <Label className="text-slate-700 font-semibold" htmlFor="password">Password Baru</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            className="h-12 border-slate-200 bg-white text-slate-900 focus-visible:ring-primary shadow-sm"
            {...form.register('password')}
          />
          {form.formState.errors.password && (
            <p className="text-red-500 text-xs font-medium mt-1">{form.formState.errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-slate-700 font-semibold" htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            className="h-12 border-slate-200 bg-white text-slate-900 focus-visible:ring-primary shadow-sm"
            {...form.register('confirmPassword')}
          />
          {form.formState.errors.confirmPassword && (
            <p className="text-red-500 text-xs font-medium mt-1">{form.formState.errors.confirmPassword.message}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 shadow-xl shadow-primary/20 transition-all text-base rounded-xl"
        >
          {loading ? (
            <><Loader2 size={20} className="mr-2 animate-spin" /> Menyimpan...</>
          ) : (
            'Simpan Password Baru'
          )}
        </Button>
      </form>
    </div>
  )
}
