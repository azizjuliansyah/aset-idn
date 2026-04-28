import type { Metadata } from 'next'
import { UsersClient } from '@/components/admin/users/users-client'

export const metadata: Metadata = { title: 'Manajemen User — Gudang IDN' }

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Manajemen User</h1>
        <p className="text-muted-foreground text-sm mt-1">Kelola akun pengguna sistem</p>
      </div>
      <UsersClient />
    </div>
  )
}
