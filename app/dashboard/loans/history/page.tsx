import type { Metadata } from 'next'
import { UserLoansClient } from '@/components/warehouse-app/loans/user-loans-client'

export const metadata: Metadata = {
  title: 'Riwayat Pinjam | Gudang IDN',
  description: 'Lihat riwayat peminjaman barang Anda',
}

export default function LoanHistoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Riwayat Peminjaman</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Daftar seluruh riwayat peminjaman barang yang pernah Anda lakukan
        </p>
      </div>
      <UserLoansClient isHistory={true} />
    </div>
  )
}
