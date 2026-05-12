import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  className?: string
  size?: number
}

export function LoadingSpinner({ className, size = 24 }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex items-center justify-center w-full h-full p-8", className)}>
      <Loader2 size={size} className="animate-spin text-muted-foreground" />
    </div>
  )
}
