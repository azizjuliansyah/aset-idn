import { Calendar as CalendarIcon, ChevronDown, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { differenceInDays, parseISO } from 'date-fns'
import { toast } from 'sonner'

interface DashboardDateRangeProps {
  datePreset: string
  setDatePreset: (v: string) => void
  customStartDate: string
  setCustomStartDate: (v: string) => void
  customEndDate: string
  setCustomEndDate: (v: string) => void
}

export function DashboardDateRange({
  datePreset,
  setDatePreset,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
}: DashboardDateRangeProps) {
  const handleDateChange = (start: string, end: string, isStart: boolean) => {
    if (start && end) {
      const days = differenceInDays(parseISO(end), parseISO(start))
      if (days > 60) {
        toast.warning('Rentang tanggal maksimal adalah 60 hari untuk performa terbaik.')
        return
      }
      if (days < 0) {
        toast.error('Tanggal mulai tidak boleh lebih besar dari tanggal selesai.')
        return
      }
    }
    
    if (isStart) setCustomStartDate(start)
    else setCustomEndDate(end)
  }
  const options = [
    { label: 'Semua Tanggal', value: 'all' },
    { label: '1 Hari Yang Lalu', value: '1' },
    { label: '7 Hari Yang Lalu', value: '7' },
    { label: '14 Hari Yang Lalu', value: '14' },
    { label: '30 Hari Yang Lalu', value: '30' },
    { label: '60 Hari Yang Lalu', value: '60' },
    { label: 'Custom Tanggal', value: 'custom' },
  ]

  return (
    <Popover>
      <PopoverTrigger render={
        <Button variant="outline" className="h-9 w-64 justify-between font-normal px-3 bg-background/50 backdrop-blur-sm border-border/50">
          <div className="flex items-center gap-2 overflow-hidden">
            <CalendarIcon size={14} className="text-muted-foreground shrink-0" />
            <span className="truncate text-xs font-medium">
              {datePreset === 'all' ? 'Semua Tanggal' : 
               datePreset === 'custom' ? (customStartDate && customEndDate ? `${customStartDate} - ${customEndDate}` : 'Custom Tanggal') : 
               `${datePreset} Hari Terakhir`}
            </span>
          </div>
          <ChevronDown size={14} className="text-muted-foreground shrink-0" />
        </Button>
      } />
      <PopoverContent className="w-64 p-3" align="end">
        <div className="space-y-3">
          <div className="space-y-2">
            {options.map((opt) => (
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
                  onChange={(e) => handleDateChange(e.target.value, customEndDate, true)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Sampai Tanggal</Label>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => handleDateChange(customStartDate, e.target.value, false)}
                  className="h-8 text-xs"
                />
              </div>
              {customStartDate && customEndDate && (
                <div className="flex items-center gap-1.5 pt-1">
                  <AlertCircle size={10} className="text-amber-600" />
                  <span className="text-[9px] text-muted-foreground italic">
                    Rentang terpilih: {differenceInDays(parseISO(customEndDate), parseISO(customStartDate))} hari
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
