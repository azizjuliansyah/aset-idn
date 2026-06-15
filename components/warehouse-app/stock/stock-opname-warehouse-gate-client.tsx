'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStockOpnameGroup } from '@/hooks/stock/use-stock-opname'
import { StockOpnameDetailSkeleton } from './stock-opname-detail-client'

interface StockOpnameWarehouseGateClientProps {
  id: string
}

export function StockOpnameWarehouseGateClient({ id }: StockOpnameWarehouseGateClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlWarehouseId = searchParams.get('warehouseId') || searchParams.get('warehouse_id')

  const { data: res, isLoading } = useStockOpnameGroup(id)
  const group = res?.data

  const warehouseId = urlWarehouseId || group?.warehouse_id

  useEffect(() => {
    if (warehouseId) {
      router.replace(`/dashboard/stock-opname/${id}/items?warehouseId=${warehouseId}`)
    }
  }, [warehouseId, id, router])

  if (isLoading || warehouseId) {
    return <StockOpnameDetailSkeleton />
  }

  if (!group) {
    return <div className="p-8 text-center text-red-600 font-semibold">Group tidak ditemukan</div>
  }

  return (
    <div className="p-8 space-y-4 text-center">
      <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => router.push('/dashboard/stock-opname')}>
        <ArrowLeft size={16} /> Kembali ke Daftar
      </Button>
      <p className="text-muted-foreground text-sm">
        Group opname ini tidak memiliki barang. Pastikan template yang digunakan sudah memiliki daftar barang.
      </p>
    </div>
  )
}
