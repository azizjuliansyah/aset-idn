'use client'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react'
import { useCategories } from '@/hooks/queries/use-categories'
import { useWarehouses } from '@/hooks/queries/use-warehouses'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface StockListFilterProps {
  warehouseId?: string
  setWarehouseId?: (v: string) => void
  fromWarehouseId?: string
  setFromWarehouseId?: (v: string) => void
  toWarehouseId?: string
  setToWarehouseId?: (v: string) => void
  categoryId: string
  setCategoryId: (v: string) => void
  dateRange: { from?: Date; to?: Date }
  setDateRange: (v: { from?: Date; to?: Date }) => void
  datePreset: string
  setDatePreset: (v: string) => void
}

export function StockListFilter({
  warehouseId, setWarehouseId,
  fromWarehouseId, setFromWarehouseId,
  toWarehouseId, setToWarehouseId,
  categoryId, setCategoryId,
  dateRange, setDateRange,
  datePreset, setDatePreset,
}: StockListFilterProps) {
  const { data: categories } = useCategories()
  const { data: warehouses } = useWarehouses()

  const getDateLabel = () => {
    if (datePreset === 'all') return 'Semua Tanggal'
    if (datePreset === 'custom') {
      if (dateRange.from && dateRange.to) {
        return `${format(dateRange.from, 'dd MMM yyyy', { locale: id })} - ${format(dateRange.to, 'dd MMM yyyy', { locale: id })}`
      }
      if (dateRange.from) return `Dari ${format(dateRange.from, 'dd MMM yyyy', { locale: id })}`
      if (dateRange.to) return `Sampai ${format(dateRange.to, 'dd MMM yyyy', { locale: id })}`
      return 'Custom Tanggal'
    }
    return `${datePreset} Hari Terakhir`
  }

  const handlePresetChange = (preset: string) => {
    setDatePreset(preset)
    if (preset === 'all') {
      setDateRange({})
    } else if (preset !== 'custom') {
      const days = parseInt(preset)
      const to = new Date()
      const from = new Date()
      from.setDate(to.getDate() - days)
      from.setHours(0, 0, 0, 0)
      to.setHours(23, 59, 59, 999)
      setDateRange({ from, to })
    }
  }

  const activeFilters = [
    !!setWarehouseId,
    !!setFromWarehouseId,
    !!setToWarehouseId,
    true, // Category is always shown
    true, // Date range is always shown
  ].filter(Boolean).length

  return (
    <div className={cn(
      "grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6",
      activeFilters === 3 && "lg:grid-cols-3",
      activeFilters === 4 && "lg:grid-cols-4",
      activeFilters === 5 && "lg:grid-cols-5"
    )}>
      {setWarehouseId && (
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
      )}

      {setFromWarehouseId && (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dari Gudang</Label>
          <Select value={fromWarehouseId} onValueChange={setFromWarehouseId}>
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
      )}

      {setToWarehouseId && (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ke Gudang</Label>
          <Select value={toWarehouseId} onValueChange={setToWarehouseId}>
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
      )}

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
                <span className="truncate text-sm">{getDateLabel()}</span>
              </div>
              <ChevronDown size={14} className="text-muted-foreground shrink-0" />
            </Button>
          } />
          <PopoverContent className="w-64 p-3" align="start">
            <div className="space-y-3">
              <div className="space-y-2">
                {[
                  { label: 'Semua Tanggal', value: 'all' },
                  { label: 'Hari Ini', value: '0' },
                  { label: '7 Hari Terakhir', value: '7' },
                  { label: '30 Hari Terakhir', value: '30' },
                  { label: 'Custom Tanggal', value: 'custom' },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1.5 rounded transition-colors">
                    <input
                      type="radio"
                      name="datePreset"
                      value={opt.value}
                      checked={datePreset === opt.value}
                      onChange={(e) => handlePresetChange(e.target.value)}
                      className="w-4 h-4 accent-primary"
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
                      value={dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : ''}
                      onChange={(e) => setDateRange({ ...dateRange, from: e.target.value ? new Date(e.target.value) : undefined })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Sampai Tanggal</Label>
                    <Input
                      type="date"
                      value={dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : ''}
                      onChange={(e) => setDateRange({ ...dateRange, to: e.target.value ? new Date(e.target.value) : undefined })}
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
