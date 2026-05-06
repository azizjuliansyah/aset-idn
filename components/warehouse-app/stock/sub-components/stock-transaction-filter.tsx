'use client'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react'
import { useCategories } from '@/hooks/queries/use-categories'
import { useWarehouses } from '@/hooks/queries/use-warehouses'

interface StockTransactionFilterProps {
  warehouseId: string
  setWarehouseId: (v: string) => void
  categoryId: string
  setCategoryId: (v: string) => void
  datePreset: string
  setDatePreset: (v: string) => void
  customStartDate: string
  setCustomStartDate: (v: string) => void
  customEndDate: string
  setCustomEndDate: (v: string) => void
}

export function StockTransactionFilter({
  warehouseId, setWarehouseId,
  categoryId, setCategoryId,
  datePreset, setDatePreset,
  customStartDate, setCustomStartDate,
  customEndDate, setCustomEndDate
}: StockTransactionFilterProps) {
  const { data: categories } = useCategories()
  const { data: warehouses } = useWarehouses()

  const getDateLabel = () => {
    if (datePreset === 'all') return 'Semua Tanggal'
    if (datePreset === 'custom') {
      if (customStartDate && customEndDate) return `${customStartDate} - ${customEndDate}`
      if (customStartDate) return `Dari ${customStartDate}`
      if (customEndDate) return `Sampai ${customEndDate}`
      return 'Custom Tanggal'
    }
    return `${datePreset} Hari Terakhir`
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gudang</Label>
        <Select value={warehouseId} onValueChange={setWarehouseId}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Semua Gudang" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Gudang</SelectItem>
            {warehouses?.map((w) => (
              <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kategori</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Semua Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {categories?.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filter Tanggal</Label>
        <Popover>
          <PopoverTrigger render={
            <Button variant="outline" className="h-9 w-full justify-between font-normal px-3">
              <div className="flex items-center gap-2 overflow-hidden">
                <CalendarIcon size={14} className="text-muted-foreground shrink-0" />
                <span className="truncate">{getDateLabel()}</span>
              </div>
              <ChevronDown size={14} className="text-muted-foreground shrink-0" />
            </Button>
          } />
          <PopoverContent className="w-64 p-3" align="start">
            <div className="space-y-3">
              <div className="space-y-2">
                {[
                  { label: 'Semua Tanggal', value: 'all' },
                  { label: '1 Hari Yang Lalu', value: '1' },
                  { label: '7 Hari Yang Lalu', value: '7' },
                  { label: '14 Hari Yang Lalu', value: '14' },
                  { label: '30 Hari Yang Lalu', value: '30' },
                  { label: '60 Hari Yang Lalu', value: '60' },
                  { label: 'Custom Tanggal', value: 'custom' },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded transition-colors">
                    <input
                      type="radio"
                      name="datePreset"
                      value={opt.value}
                      checked={datePreset === opt.value}
                      onChange={(e) => setDatePreset(e.target.value)}
                      className="w-3.5 h-3.5 text-primary focus:ring-primary border-gray-300"
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>

              {datePreset === 'custom' && (
                <div className="space-y-2 pt-2 border-t">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Mulai Tanggal</Label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Sampai Tanggal</Label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
