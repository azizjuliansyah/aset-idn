import { Badge } from '@/components/ui/badge'
import type { LoanStatus } from '@/types/database'
import { Clock, CheckCircle2, XCircle, RotateCcw, Ban } from 'lucide-react'

const STATUS_MAP: Record<LoanStatus, {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  icon: React.ComponentType<{ size?: number }>
  className?: string
}> = {
  pending: { label: 'Menunggu', variant: 'outline', icon: Clock, className: 'text-amber-600 border-amber-400' },
  approved: { label: 'Disetujui', variant: 'default', icon: CheckCircle2, className: 'bg-green-600 text-white' },
  rejected: { label: 'Ditolak', variant: 'destructive', icon: XCircle },
  returned: { label: 'Dikembalikan', variant: 'secondary', icon: RotateCcw, className: 'text-blue-600' },
  cancelled: { label: 'Dibatalkan', variant: 'secondary', icon: Ban, className: 'text-muted-foreground' },
}

export function LoanStatusBadge({ status }: { status: LoanStatus }) {
  const config = STATUS_MAP[status]
  const Icon = config.icon
  return (
    <Badge variant={config.variant} className={`gap-1 text-xs ${config.className ?? ''}`}>
      <Icon size={11} />
      {config.label}
    </Badge>
  )
}
