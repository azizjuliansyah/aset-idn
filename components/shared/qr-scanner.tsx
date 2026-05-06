'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

interface QRScannerProps {
  onScan: (decodedText: string) => void
}

export function QRScanner({ onScan }: QRScannerProps) {
  const [open, setOpen] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null)

  const startScanning = async () => {
    try {
      // Ensure the div exists before starting
      const container = document.getElementById('qr-reader')
      if (!container) {
        setTimeout(startScanning, 100)
        return
      }

      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-reader')
      }
      
      setIsScanning(true)
      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
        },
        (decodedText) => {
          onScan(decodedText)
          stopScanning()
          setOpen(false)
        },
        () => {}
      )
    } catch (err) {
      console.error('Error starting scanner:', err)
      setIsScanning(false)
    }
  }

  const stopScanning = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop()
      } catch (err) {
        console.error('Error stopping scanner:', err)
      }
    }
    setIsScanning(false)
  }

  useEffect(() => {
    if (open) {
      // Small delay to allow the dialog to animate and render the div
      const timer = setTimeout(startScanning, 300)
      return () => clearTimeout(timer)
    } else {
      stopScanning()
    }
  }, [open])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(console.error)
      }
    }
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger 
        render={
          <Button 
            type="button"
            variant="outline" 
            size="icon" 
            className="h-10 w-10 shrink-0 border-primary/20 hover:border-primary/50 hover:bg-primary/5 active:scale-95 transition-all"
          >
            <Camera size={18} className="text-primary" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera size={18} className="text-primary" />
            Scan QR Code Barang
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-black border-2 border-primary/10 group">
            <div id="qr-reader" className="w-full h-full [&_video]:object-cover" />
            
            {/* Custom Scanning Overlay */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              {/* Scan Area Frame */}
              <div className="relative w-[220px] h-[220px]">
                {/* Corners */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />
                
                {/* Animated Line */}
                <div className="absolute top-0 left-0 w-full h-0.5 bg-primary/60 shadow-[0_0_15px_rgba(var(--primary),0.8)] animate-[scan_2s_linear_infinite]" />
              </div>
              
              {/* Vignette effect */}
              <div className="absolute inset-0 shadow-[0_0_0_100vmax_rgba(0,0,0,0.4)]" />
            </div>
            
            {!isScanning && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm flex-col gap-4 z-10">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <div className="text-center">
                  <p className="text-white font-semibold">Menghubungkan Kamera</p>
                  <p className="text-white/60 text-xs mt-1">Mohon izinkan akses kamera jika diminta</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex flex-col gap-2 text-center">
            <p className="text-sm font-semibold text-foreground">Sejajarkan QR Code</p>
            <p className="text-xs text-muted-foreground leading-relaxed px-4">
              Arahkan kamera ke QR Code yang tertempel di barang. Sistem akan otomatis mendeteksi item tersebut.
            </p>
          </div>
          
          <Button 
            variant="outline" 
            fullWidth
            onClick={() => setOpen(false)}
            className="w-full"
          >
            Batal
          </Button>
        </div>
        
        <style jsx global>{`
          @keyframes scan {
            0% { top: 0; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
          }
          #qr-reader__scan_region {
            background: transparent !important;
          }
          #qr-reader video {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  )
}
