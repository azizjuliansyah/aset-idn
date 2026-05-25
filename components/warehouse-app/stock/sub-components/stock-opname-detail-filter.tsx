'use client'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar as CalendarIcon, ChevronDown, Filter, ClipboardList, Scale } from 'lucide-react'
import { useCategories } from '@/hooks/queries/use-categories'
import { useWarehouses } from '@/hooks/queries/use-warehouses'

interface StockOpnameDetailFilterProps {
  warehouseId: string
  setWarehouseId: (v: string) => void
  categoryId: string
  setCategoryId: (v: string) => void
  filterType: string
  setFilterType: (v: string) => void
  datePreset: string
  setDatePreset: (v: string) => void
  customStartDate: string
  setCustomStartDate: (v: string) => void
  customEndDate: string
  setCustomEndDate: (v: string) => void
  hideWarehouseFilter?: boolean
}

export function StockOpnameDetailFilter({
  warehouseId, setWarehouseId,
  categoryId, setCategoryId,
  filterType, setFilterType,
  datePreset, setDatePreset,
  customStartDate, setCustomStartDate,
  customEndDate, setCustomEndDate,
  hideWarehouseFilter
}: StockOpnameDetailFilterProps) {
  const { data: categories } = useCategories()
  const { data: warehouses } = useWarehouses()

  // Derive stateless values from filterType
  let recordingStatus = 'all'
  let discrepancyStatus = 'all'

  if (filterType === 'unrecorded') {
    recordingStatus = 'unrecorded'
    discrepancyStatus = 'all'
  } else if (filterType === 'recorded') {
    recordingStatus = 'recorded'
    discrepancyStatus = 'all'
  } else if (['discrepancy', 'discrepancy_plus', 'discrepancy_minus', 'match'].includes(filterType)) {
    recordingStatus = 'recorded'
    discrepancyStatus = filterType
  } else {
    recordingStatus = 'all'
    discrepancyStatus = 'all'
  }

  const handleRecordingStatusChange = (val: string) => {
    if (val === 'all') {
      setFilterType('all')
    } else if (val === 'recorded') {
      setFilterType('recorded')
    } else if (val === 'unrecorded') {
      setFilterType('unrecorded')
    }
  }

  const handleDiscrepancyStatusChange = (val: string) => {
    if (val === 'all') {
      if (recordingStatus === 'unrecorded') {
        setFilterType('unrecorded')
      } else if (recordingStatus === 'recorded') {
        setFilterType('recorded')
      } else {
        setFilterType('all')
      }
    } else {
      setFilterType(val)
    }
  }

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

  const isUnrecorded = recordingStatus === 'unrecorded'

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${hideWarehouseFilter ? 'lg:grid-cols-4' : 'lg:grid-cols-5'} gap-4`}>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status Pencatatan</Label>
        <Select value={recordingStatus} onValueChange={handleRecordingStatusChange}>
          <SelectTrigger className="h-9 bg-white">
            <div className="flex items-center gap-2">
              <ClipboardList size={14} className="text-muted-foreground shrink-0" />
              <SelectValue placeholder="Semua Status Pencatatan" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status Pencatatan</SelectItem>
            <SelectItem value="recorded">Sudah Tercatat</SelectItem>
            <SelectItem value="unrecorded">Belum Dicatat</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className={`text-xs font-semibold uppercase tracking-wider transition-colors duration-200 ${isUnrecorded ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
          Kondisi Selisih
        </Label>
        <Select 
          value={discrepancyStatus} 
          onValueChange={handleDiscrepancyStatusChange}
          disabled={isUnrecorded}
        >
          <SelectTrigger className={`h-9 bg-white transition-opacity duration-200 ${isUnrecorded ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}`}>
            <div className="flex items-center gap-2">
              <Scale size={14} className="text-muted-foreground shrink-0" />
              <SelectValue placeholder="Semua Kondisi Selisih" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kondisi Selisih</SelectItem>
            <SelectItem value="discrepancy">Ada Selisih</SelectItem>
            <SelectItem value="match">Sesuai</SelectItem>
            <SelectItem value="discrepancy_plus">Selisih Lebih (+)</SelectItem>
            <SelectItem value="discrepancy_minus">Selisih Kurang (-)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!hideWarehouseFilter && (
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
                  { label: 'Hari Ini', value: '0' },
                  { label: '7 Hari Terakhir', value: '7' },
                  { label: '30 Hari Terakhir', value: '30' },
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
