'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, Warehouse } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  rememberMe: z.boolean().optional(),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  })

  const onSubmit = async (values: LoginFormValues) => {
    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    toast.success('Login berhasil!')
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 mb-4">
            <Warehouse className="text-white" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-white">Gudang IDN</h1>
          <p className="text-slate-400 text-sm mt-1">Warehouse Management System</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-1">Selamat Datang</h2>
          <p className="text-slate-400 text-sm mb-6">Masuk ke akun Anda untuk melanjutkan</p>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm" htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@perusahaan.com"
                autoComplete="email"
                className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus-visible:ring-primary"
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="text-red-400 text-xs">{form.formState.errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm" htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus-visible:ring-primary pr-10"
                  {...form.register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-red-400 text-xs">{form.formState.errors.password.message}</p>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2">
              <Switch
                id="rememberMe"
                checked={form.watch('rememberMe')}
                onCheckedChange={(v) => form.setValue('rememberMe', v)}
                className="data-[state=checked]:bg-primary"
              />
              <Label htmlFor="rememberMe" className="text-slate-300 text-sm cursor-pointer">
                Ingat saya
              </Label>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold h-11 shadow-lg shadow-primary/30 transition-all"
            >
              {loading ? (
                <><Loader2 size={16} className="mr-2 animate-spin" /> Masuk...</>
              ) : (
                'Masuk'
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          © {new Date().getFullYear()} Gudang IDN. All rights reserved.
        </p>
      </div>
    </div>
  )
}
