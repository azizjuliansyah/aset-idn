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
    <div className="min-h-screen flex bg-white font-sans">
      {/* Left side - Red Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-red-600 to-red-700 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-white blur-3xl" />
        </div>
        
        <div className="relative z-10 max-w-lg text-center text-white">
          <div className="inline-flex w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-md items-center justify-center mb-8 border border-white/30 shadow-2xl">
            <Warehouse className="text-white" size={40} />
          </div>
          <h1 className="text-5xl font-bold mb-4 tracking-tight">Gudang IDN</h1>
          <p className="text-red-100 text-lg font-light leading-relaxed">
            Sistem Manajemen Gudang terintegrasi untuk efisiensi operasional dan kontrol inventaris yang maksimal.
          </p>
          
          <div className="mt-12 pt-12 border-t border-white/20 grid grid-cols-3 gap-8">
            <div>
              <p className="text-2xl font-bold">100%</p>
              <p className="text-red-200 text-xs uppercase tracking-wider">Akurat</p>
            </div>
            <div>
              <p className="text-2xl font-bold">24/7</p>
              <p className="text-red-200 text-xs uppercase tracking-wider">Monitor</p>
            </div>
            <div>
              <p className="text-2xl font-bold">Fast</p>
              <p className="text-red-200 text-xs uppercase tracking-wider">Delivery</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50 lg:bg-white">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex flex-col items-center mb-10 lg:hidden">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/20 mb-4">
              <Warehouse className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Gudang IDN</h1>
            <p className="text-slate-500 text-sm mt-1">Warehouse Management System</p>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Selamat Datang</h2>
            <p className="text-slate-500 text-base">Silakan masuk untuk mengelola gudang Anda</p>
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-slate-700 font-semibold" htmlFor="password">Password</Label>
                <button type="button" className="text-xs font-semibold text-primary hover:underline">
                  Lupa password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="h-12 border-slate-200 bg-white text-slate-900 focus-visible:ring-primary pr-12 shadow-sm"
                  {...form.register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-red-500 text-xs font-medium mt-1">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Switch
                  id="rememberMe"
                  checked={form.watch('rememberMe')}
                  onCheckedChange={(v) => form.setValue('rememberMe', v)}
                  className="data-[state=checked]:bg-primary"
                />
                <Label htmlFor="rememberMe" className="text-slate-600 text-sm font-medium cursor-pointer">
                  Ingat saya
                </Label>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 shadow-xl shadow-primary/20 transition-all text-base rounded-xl"
            >
              {loading ? (
                <><Loader2 size={20} className="mr-2 animate-spin" /> Masuk...</>
              ) : (
                'Masuk'
              )}
            </Button>
          </form>

          <div className="mt-12 text-center">
            <p className="text-slate-400 text-sm">
              &copy; {new Date().getFullYear()} <span className="font-semibold text-slate-500">IDN Media</span>. Semua hak dilindungi.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
