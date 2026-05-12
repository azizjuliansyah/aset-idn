import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Lupa Password — Gudang IDN',
  description: 'Reset kata sandi akun Gudang IDN Anda',
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50 lg:bg-white">
      <ForgotPasswordForm />
    </div>
  )
}
