import { ResetPasswordForm } from '@/components/auth/reset-password-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Atur Ulang Password — Gudang IDN',
  description: 'Atur ulang kata sandi akun Gudang IDN Anda',
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50 lg:bg-white">
      <ResetPasswordForm />
    </div>
  )
}
