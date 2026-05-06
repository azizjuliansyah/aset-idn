import { Package, DollarSign, Layers, Calendar, Tag, Info, AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { Item, StockLedger } from '@/types/database'

interface ItemWithJoins extends Omit<Item, 'item_category' | 'item_status' | 'item_condition'> {
  item_category?: { name: string } | null
  item_status?: { name: string } | null
  item_condition?: { name: string } | null
}

interface ItemInfoCardProps {
  item: ItemWithJoins
  stockStats: (StockLedger & { borrowed: number; available_stock: number })[]
  isStatsLoading: boolean
}

export function ItemInfoCard({ item, stockStats, isStatsLoading }: ItemInfoCardProps) {
  if (!item) return null

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="space-y-2">
          <h3 className="text-2xl font-normal leading-none tracking-tight text-foreground">{item.name}</h3>
          <p className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-widest">ID: {item.id}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="bg-background font-medium text-[10px] uppercase tracking-wider px-2 py-0.5 border-muted-foreground/20 text-muted-foreground">
            {item.item_category?.name ?? 'Tanpa Kategori'}
          </Badge>
          <Badge variant={item.status === 'active' ? 'default' : 'secondary'} className="font-medium text-[10px] uppercase tracking-wider px-2 py-0.5">
            {item.status === 'active' ? 'Aktif' : 'Nonaktif'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 border-t border-dashed border-muted-foreground/10 pt-2">
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-lg bg-muted text-muted-foreground">
            <DollarSign size={15} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-medium text-muted-foreground/60 tracking-widest mb-0.5">Harga Satuan</p>
            <p className="text-lg font-medium tracking-tight">{formatCurrency(item.price)}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="p-2 rounded-lg bg-muted text-muted-foreground">
            <Layers size={15} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-medium text-muted-foreground/60 tracking-widest mb-0.5">Stok Minimum</p>
            <p className="text-lg font-medium tracking-tight">{item.minimum_stock} <span className="text-xs font-normal text-muted-foreground/50 italic">Unit</span></p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="p-2 rounded-lg bg-muted text-muted-foreground">
            <Calendar size={15} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-medium text-muted-foreground/60 tracking-widest mb-0.5">Tanggal Dibuat</p>
            <p className="text-base font-medium tracking-tight">
              {formatDate(item.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="p-2 rounded-lg bg-muted text-muted-foreground">
            <Tag size={15} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-medium text-muted-foreground/60 tracking-widest mb-0.5">Status & Kondisi</p>
            <p className="text-base font-medium tracking-tight">
              {item.item_status?.name ?? '—'} <span className="text-muted-foreground/20 mx-1">/</span> {item.item_condition?.name ?? '—'}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 bg-muted/20 p-5 rounded-lg border border-dashed border-muted-foreground/10">
        <div className="flex items-center gap-2">
          <Info size={13} className="text-muted-foreground/40" />
          <span className="text-[10px] font-medium uppercase text-muted-foreground/50 tracking-widest">Catatan Tambahan</span>
        </div>
        <p className="text-sm font-normal italic text-muted-foreground/70 leading-relaxed">
          {item.note || 'Tidak ada catatan khusus.'}
        </p>
      </div>

      <div className="pt-2">
        <div className="grid grid-cols-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">
          <div>Masuk</div>
          <div>Keluar</div>
          <div>Dipinjam</div>
          <div>Tersedia</div>
        </div>
        {!isStatsLoading && stockStats && stockStats.length > 0 ? (
          <div className="space-y-0 text-sm">
            {stockStats.map((stat: any, i: number) => (
              <div key={i} className="py-2.5 border-b border-muted/50 last:border-0 group">
                <div className="grid grid-cols-4 items-center">
                  <div className="text-green-600 font-semibold">+{stat.total_in}</div>
                  <div className="text-red-600 font-semibold">-{stat.total_out}</div>
                  <div className="text-amber-600 font-semibold">-{stat.borrowed}</div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base">{stat.available_stock}</span>
                    {(() => {
                      if (stat.available_stock === 0) return (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5 bg-red-100 text-red-700 hover:bg-red-100 border-red-200 font-medium tracking-wide">
                          <AlertCircle size={10} className="mr-1" /> Habis
                        </Badge>
                      )
                      if (stat.available_stock < (item.minimum_stock ?? 0)) return (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5 bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200 font-medium tracking-wide">
                          <AlertTriangle size={10} className="mr-1" /> Rendah
                        </Badge>
                      )
                      if (stat.available_stock === (item.minimum_stock ?? 0)) return (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 font-medium tracking-wide">
                          <AlertTriangle size={10} className="mr-1" /> Menipis
                        </Badge>
                      )
                      return (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-green-100 text-green-700 hover:bg-green-100 border-green-200 font-medium tracking-wide">
                          <CheckCircle size={10} className="mr-1" /> Aman
                        </Badge>
                      )
                    })()}
                  </div>
                </div>
                <div className="text-[9px] text-muted-foreground/50 uppercase tracking-widest">
                  {stat.warehouse_name}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground py-3 text-center bg-muted/20 rounded border border-dashed mt-2">Belum ada data stok</div>
        )}
      </div>
    </div>
  )
}
