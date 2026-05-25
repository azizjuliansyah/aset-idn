'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Building, Building2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useStockOpnameGroup } from '@/hooks/stock/use-stock-opname'
import { useWarehouses } from '@/hooks/queries/use-warehouses'
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

  const { data: warehouses = [], isLoading: isLoadingWarehouses } = useWarehouses()

  // Auto-redirect if warehouseId is already set in searchParams (and is valid)
  useEffect(() => {
    if (urlWarehouseId && warehouses.length > 0) {
      if (warehouses.some(w => w.id === urlWarehouseId)) {
        router.replace(`/dashboard/stock-opname/${id}/items?warehouseId=${urlWarehouseId}`)
      }
    }
  }, [urlWarehouseId, warehouses, id, router])

  if (isLoading || isLoadingWarehouses) {
    return <StockOpnameDetailSkeleton />
  }

  if (!group) return <div className="p-8 text-center text-red-600 font-semibold">Group tidak ditemukan</div>

  const handleSelectWarehouse = (warehouseId: string) => {
    router.push(`/dashboard/stock-opname/${id}/items?warehouseId=${warehouseId}`)
  }

  return (
    <div className="px-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground cursor-pointer" onClick={() => router.push('/dashboard/stock-opname')}>
          <ArrowLeft size={16} />
          <span>Kembali ke Daftar</span>
        </Button>
      </div>

      <div className="">
        <div className="col-span-1">
          <div className="text-start space-y-3 mb-10">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Pilih Gudang Opname
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Sebelum memulai pencatatan stok opname untuk kelompok <strong className="text-slate-800">{group.name}</strong>, silakan tentukan gudang kerja Anda.
            </p>
          </div>
        </div>
        <div className="col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {warehouses.map((w) => (
              <Card
                key={w.id}
                className="overflow-hidden border border-slate-100 hover:border-slate-200 transition-all duration-200 shadow-sm hover:shadow bg-white group cursor-pointer"
                onClick={() => handleSelectWarehouse(w.id)}
              >
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors duration-200">
                      <Building2 size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold text-slate-800 group-hover:text-blue-600 transition-colors duration-200">
                        {w.name}
                      </h3>
                    </div>
                  </div>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-medium shrink-0 cursor-pointer">
                    Pilih
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
