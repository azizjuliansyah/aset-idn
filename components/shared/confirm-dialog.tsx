'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Loader2 } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  onConfirm: () => void
  loading?: boolean
  variant?: 'destructive' | 'default' | 'success'
  confirmText?: string
  loadingText?: string
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title = 'Konfirmasi Hapus',
  description = 'Apakah Anda yakin? Tindakan ini tidak dapat dibatalkan.',
  onConfirm,
  loading,
  variant = 'destructive',
  confirmText,
  loadingText,
}: ConfirmDialogProps) {
  const defaultConfirmText = variant === 'destructive' ? 'Hapus' : 'Konfirmasi'
  const defaultLoadingText = variant === 'destructive' ? 'Menghapus...' : 'Memproses...'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {variant === 'destructive' && (
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-destructive" />
              </div>
            )}
            <DialogTitle>{title}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="py-2">
          <DialogDescription className="text-foreground/80 leading-relaxed">
            {description}
          </DialogDescription>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Batal
          </Button>
          <Button
            variant={variant === 'success' ? 'default' : variant}
            onClick={onConfirm}
            disabled={loading}
            className={variant === 'success' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
          >
            {loading ? (
              <>
                <Loader2 size={14} className="mr-1.5 animate-spin" />
                {loadingText || defaultLoadingText}
              </>
            ) : (
              confirmText || defaultConfirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
