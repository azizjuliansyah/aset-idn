'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Mail, ArrowLeft, Warehouse } from 'lucide-react'
import Link from 'next/link'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const forgotPasswordSchema = z.object({
  email: z.string().email('Email tidak valid'),
})

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
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

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (values: ForgotPasswordValues) => {
    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/api/auth/callback?next=/reset-password`,
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    setSubmitted(true)
    toast.success('Link reset password telah dikirim ke email Anda')
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="w-full max-w-md text-center space-y-6">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <Mail className="text-green-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Cek Email Anda</h2>
          <p className="text-slate-500 text-base">
            Kami telah mengirimkan instruksi pemulihan kata sandi ke email Anda.
          </p>
        </div>
        
        <Link href="/login" className="inline-flex items-center text-primary font-semibold hover:underline">
          <ArrowLeft size={16} className="mr-2" /> Kembali ke Login
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      {/* Mobile Logo Branding */}
      <div className="flex flex-col items-center mb-10">
        <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center shadow-xl shadow-primary/10 mb-4 overflow-hidden border border-slate-100">
          {settings.logo_url ? (
            <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
          ) : (
            <Warehouse className="text-primary" size={32} />
          )}
        </div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight text-center px-4">
          {settings.name ?? 'Lupa Password'}
        </h1>
        <p className="text-slate-500 text-sm mt-1">Masukkan email Anda untuk mereset password</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <Label className="text-slate-700 font-semibold" htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="admin@idn.id"
            autoComplete="email"
            className="h-12 border-slate-200 bg-white text-slate-900 focus-visible:ring-primary shadow-sm"
            {...form.register('email')}
          />
          {form.formState.errors.email && (
            <p className="text-red-500 text-xs font-medium mt-1">{form.formState.errors.email.message}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 shadow-xl shadow-primary/20 transition-all text-base rounded-xl"
        >
          {loading ? (
            <><Loader2 size={20} className="mr-2 animate-spin" /> Mengirim...</>
          ) : (
            'Kirim Link Reset'
          )}
        </Button>
      </form>

      <div className="mt-8 text-center">
        <Link href="/login" className="inline-flex items-center text-slate-500 font-medium hover:text-primary transition-colors text-sm">
          <ArrowLeft size={14} className="mr-2" /> Kembali ke Login
        </Link>
      </div>
    </div>
  )
}
