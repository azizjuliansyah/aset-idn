import { LoginForm } from '@/components/auth/login-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Login — Gudang IDN',
  description: 'Masuk ke sistem manajemen gudang',
}

export default function LoginPage() {
  return <LoginForm />
}
