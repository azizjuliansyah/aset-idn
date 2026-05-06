import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserCheck } from 'lucide-react'

interface GaLoansFilterProps {
  isHistory: boolean
  statusFilter: string
  setStatusFilter: (v: string) => void
  actionedByFilter: string
  setActionedByFilter: (v: string) => void
  handlers: { id: string; full_name: string }[] | undefined
}

export function GaLoansFilter({
  isHistory,
  statusFilter,
  setStatusFilter,
  actionedByFilter,
  setActionedByFilter,
  handlers,
}: GaLoansFilterProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</Label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9">
            <SelectValue>
              {statusFilter === 'all' 
                ? `Semua ${isHistory ? 'Riwayat' : 'Kelola'}`
                : statusFilter === 'pending' ? 'Menunggu Persetujuan'
                : statusFilter === 'approved' ? 'Disetujui (Belum Kembali)'
                : statusFilter === 'rejected' ? 'Ditolak'
                : statusFilter === 'returned' ? 'Sudah Kembali'
                : 'Dibatalkan'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua {isHistory ? 'Riwayat' : 'Kelola'}</SelectItem>
            {!isHistory && <SelectItem value="pending">Menunggu Persetujuan</SelectItem>}
            {!isHistory && <SelectItem value="approved">Disetujui (Belum Kembali)</SelectItem>}
            {isHistory && <SelectItem value="rejected">Ditolak</SelectItem>}
            {isHistory && <SelectItem value="returned">Sudah Kembali</SelectItem>}
            {isHistory && <SelectItem value="cancelled">Dibatalkan</SelectItem>}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ditangani Oleh</Label>
        <Select value={actionedByFilter} onValueChange={setActionedByFilter}>
          <SelectTrigger className="h-9">
            <div className="flex items-center gap-2 truncate">
              <UserCheck size={14} className="text-muted-foreground shrink-0" />
              <SelectValue>
                {actionedByFilter === 'all' 
                  ? "Semua Penangan" 
                  : handlers?.find(h => h.id === actionedByFilter)?.full_name || "Memuat..."}
              </SelectValue>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Penangan</SelectItem>
            {handlers?.map((h) => (
              <SelectItem key={h.id} value={h.id}>{h.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
