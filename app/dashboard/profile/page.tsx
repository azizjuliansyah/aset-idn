import type { Metadata } from 'next'
import { ProfileClient } from '@/components/profile/profile-client'

export const metadata: Metadata = { title: 'Profil Saya — Gudang IDN' }

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profil Saya</h1>
        <p className="text-muted-foreground text-sm mt-1">Kelola informasi akun Anda</p>
      </div>
      <ProfileClient />
    </div>
  )
}
