import type { Metadata } from 'next'
import { UserLoansClient } from '@/components/warehouse-app/loans/user-loans-client'

export const metadata: Metadata = {
  title: 'Peminjaman Barang | Gudang IDN',
  description: 'Kelola request peminjaman barang Anda',
}

export default function LoansPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Peminjaman Barang</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Buat dan pantau request peminjaman barang Anda
        </p>
      </div>
      <UserLoansClient isHistory={false} />
    </div>
  )
}
