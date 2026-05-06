'use client'

import { useEffect } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { AlertCircle, RotateCcw, Home, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center animate-in fade-in zoom-in duration-500">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-destructive/10 blur-3xl rounded-full scale-150 animate-pulse" />
        <div className="relative bg-background border-2 border-destructive/20 p-6 rounded-full shadow-2xl">
          <ShieldAlert className="h-16 w-16 text-destructive" strokeWidth={1.5} />
        </div>
      </div>

      <div className="max-w-md space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Terjadi Kesalahan Sistem
        </h1>
        <p className="text-muted-foreground text-balance leading-relaxed">
          Mohon maaf, terjadi gangguan teknis saat memproses permintaan Anda. 
          {error.message && (
            <span className="block mt-2 font-mono text-[10px] uppercase opacity-50">
              Error Digest: {error.digest || 'Internal System Error'}
            </span>
          )}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 mt-10">
        <Button 
          onClick={reset}
          size="lg"
          className="gap-2 px-8 h-12 shadow-lg shadow-primary/20"
        >
          <RotateCcw size={18} />
          Coba Lagi
        </Button>
        <Link 
          href="/dashboard"
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }), 
            "gap-2 px-8 h-12"
          )}
        >
          <Home size={18} />
          Kembali ke Beranda
        </Link>
      </div>

      <div className="mt-12 p-4 rounded-lg bg-muted/30 border border-dashed border-muted-foreground/10 flex items-center gap-3">
        <AlertCircle size={14} className="text-muted-foreground/50" />
        <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/40">
          Tim IT telah menerima laporan error ini secara otomatis
        </p>
      </div>
    </div>
  )
}
