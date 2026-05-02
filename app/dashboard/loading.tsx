import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full gap-4 animate-in fade-in duration-500">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
        <Loader2 className="h-10 w-10 text-primary animate-spin relative z-10" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          Memuat halaman...
        </p>
        <div className="h-1 w-24 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary animate-progress-loading" />
        </div>
      </div>
    </div>
  )
}
