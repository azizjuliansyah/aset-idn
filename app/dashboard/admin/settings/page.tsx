import type { Metadata } from 'next'
import { SettingsClient } from '@/components/admin/settings/settings-client'

export const metadata: Metadata = { title: 'Pengaturan — Gudang IDN' }

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pengaturan</h1>
        <p className="text-muted-foreground text-sm mt-1">Konfigurasi umum perusahaan</p>
      </div>
      <SettingsClient />
    </div>
  )
}
