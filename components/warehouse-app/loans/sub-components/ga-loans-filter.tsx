import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserCheck, Calendar as CalendarIcon, ChevronDown, AlarmClock, AlertCircle } from 'lucide-react'
import { useWarehouses } from '@/hooks/queries/use-warehouses'

interface GaLoansFilterProps {
  isHistory: boolean
  statusFilter: string
  setStatusFilter: (v: string) => void
  actionedByFilter: string
  setActionedByFilter: (v: string) => void
  handlers: { id: string; full_name: string }[] | undefined
  warehouseId: string
  setWarehouseId: (v: string) => void
  datePreset: string
  setDatePreset: (v: string) => void
  customStartDate: string
  setCustomStartDate: (v: string) => void
  customEndDate: string
  setCustomEndDate: (v: string) => void
  returnDatePreset?: string
  setReturnDatePreset?: (v: string) => void
  returnCustomStartDate?: string
  setReturnCustomStartDate?: (v: string) => void
  returnCustomEndDate?: string
  setReturnCustomEndDate?: (v: string) => void
  dueFilter?: string
  setDueFilter?: (v: string) => void
}

export function GaLoansFilter({
  isHistory,
  statusFilter,
  setStatusFilter,
  actionedByFilter,
  setActionedByFilter,
  handlers,
  warehouseId,
  setWarehouseId,
  datePreset,
  setDatePreset,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  returnDatePreset,
  setReturnDatePreset,
  returnCustomStartDate,
  setReturnCustomStartDate,
  returnCustomEndDate,
  setReturnCustomEndDate,
  dueFilter,
  setDueFilter,
}: GaLoansFilterProps) {
  const { data: warehouses } = useWarehouses()

  const getDateLabel = () => {
    if (datePreset === 'all') return 'Semua Waktu'
    if (datePreset === 'custom') {
      if (customStartDate && customEndDate) return `${customStartDate} - ${customEndDate}`
      if (customStartDate) return `Dari ${customStartDate}`
      if (customEndDate) return `Sampai ${customEndDate}`
      return 'Custom Waktu'
    }
    return `${datePreset} Hari Terakhir`
  }

  const getReturnDateLabel = () => {
    if (returnDatePreset === 'all') return 'Semua Waktu'
    if (returnDatePreset === 'custom') {
      if (returnCustomStartDate && returnCustomEndDate) return `${returnCustomStartDate} - ${returnCustomEndDate}`
      if (returnCustomStartDate) return `Dari ${returnCustomStartDate}`
      if (returnCustomEndDate) return `Sampai ${returnCustomEndDate}`
      return 'Custom Waktu'
    }
    return `${returnDatePreset} Hari Terakhir`
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 ${isHistory ? 'lg:grid-cols-5' : 'lg:grid-cols-5'} gap-4`}>
      {!isHistory && (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status Peminjaman</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Pilih status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="pending">Menunggu Persetujuan</SelectItem>
              <SelectItem value="approved">Sedang Dipinjam</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {isHistory && (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status Peminjaman</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Pilih status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="returned">Sudah Dikembalikan</SelectItem>
              <SelectItem value="rejected">Ditolak</SelectItem>
              <SelectItem value="cancelled">Dibatalkan</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">PIC</Label>
        <Select value={actionedByFilter} onValueChange={setActionedByFilter}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Pilih PIC" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            {handlers?.map((h) => (
              <SelectItem key={h.id} value={h.id}>{h.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gudang</Label>
        <Select value={warehouseId} onValueChange={setWarehouseId}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Pilih gudang" />
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
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Waktu Peminjaman</Label>
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
                  { label: 'Semua Waktu', value: 'all' },
                  { label: '1 Hari Yang Lalu', value: '1' },
                  { label: '7 Hari Yang Lalu', value: '7' },
                  { label: '14 Hari Yang Lalu', value: '14' },
                  { label: '30 Hari Yang Lalu', value: '30' },
                  { label: '60 Hari Yang Lalu', value: '60' },
                  { label: 'Custom Waktu', value: 'custom' },
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

      {isHistory && (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Waktu Pengembalian</Label>
          <Popover>
            <PopoverTrigger render={
              <Button variant="outline" className="h-9 w-full justify-between font-normal px-3">
                <div className="flex items-center gap-2 overflow-hidden">
                  <CalendarIcon size={14} className="text-muted-foreground shrink-0" />
                  <span className="truncate">{getReturnDateLabel()}</span>
                </div>
                <ChevronDown size={14} className="text-muted-foreground shrink-0" />
              </Button>
            } />
            <PopoverContent className="w-64 p-3" align="start">
              <div className="space-y-3">
                <div className="space-y-2">
                  {[
                    { label: 'Semua Waktu', value: 'all' },
                    { label: '1 Hari Yang Lalu', value: '1' },
                    { label: '7 Hari Yang Lalu', value: '7' },
                    { label: '14 Hari Yang Lalu', value: '14' },
                    { label: '30 Hari Yang Lalu', value: '30' },
                    { label: '60 Hari Yang Lalu', value: '60' },
                    { label: 'Custom Waktu', value: 'custom' },
                  ].map((opt) => (
                    <label key={`return-${opt.value}`} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded transition-colors">
                      <input
                        type="radio"
                        name="returnDatePreset"
                        value={opt.value}
                        checked={returnDatePreset === opt.value}
                        onChange={(e) => setReturnDatePreset?.(e.target.value)}
                        className="w-3.5 h-3.5 text-primary focus:ring-primary border-gray-300"
                      />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  ))}
                </div>

                {returnDatePreset === 'custom' && (
                  <div className="space-y-2 pt-2 border-t">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Mulai Tanggal</Label>
                      <Input
                        type="date"
                        value={returnCustomStartDate}
                        onChange={(e) => setReturnCustomStartDate?.(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Sampai Tanggal</Label>
                      <Input
                        type="date"
                        value={returnCustomEndDate}
                        onChange={(e) => setReturnCustomEndDate?.(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {!isHistory && (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Batas Pengembalian</Label>
          <Select value={dueFilter} onValueChange={setDueFilter}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Semua Batas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Batas</SelectItem>
              <SelectItem value="approaching">
                <div className="flex items-center gap-2 text-amber-600">
                  <AlarmClock size={14} />
                  <span>Mendekati Batas</span>
                </div>
              </SelectItem>
              <SelectItem value="overdue">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle size={14} />
                  <span>Melewati Batas</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}
