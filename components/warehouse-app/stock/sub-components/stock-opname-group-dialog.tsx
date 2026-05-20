'use client'

import { useEffect } from 'react'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2 } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useStockOpnameMutations } from '@/hooks/stock/use-stock-opname'

const formSchema = z.object({
  name: z.string().min(3, 'Nama minimal 3 karakter'),
  description: z.string().optional(),
})

interface StockOpnameGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: { id: string, name: string, description?: string | null } | null
}

export function StockOpnameGroupDialog({ open, onOpenChange, initialData }: StockOpnameGroupDialogProps) {
  const { createGroup, updateGroup } = useStockOpnameMutations()
  const isEditing = !!initialData
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  })

  // Reset form when dialog opens/closes or initialData changes
  useEffect(() => {
    if (open) {
      if (initialData) {
        reset({
          name: initialData.name,
          description: initialData.description || '',
        })
      } else {
        reset({ name: '', description: '' })
      }
    }
  }, [open, initialData, reset])

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (isEditing && initialData) {
      console.log('[StockOpname] Editing group:', values)
      updateGroup.mutate({ id: initialData.id, ...values }, {
        onSuccess: () => {
          onOpenChange(false)
        }
      })
    } else {
      console.log('[StockOpname] Submitting group:', values)
      createGroup.mutate(values, {
        onSuccess: () => {
          onOpenChange(false)
          reset()
        }
      })
    }
  }

  const onInvalid = (err: any) => {
    console.error('[StockOpname] Validation errors:', err)
    toast.error('Mohon lengkapi data dengan benar')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Group Stock Opname' : 'Buat Group Stock Opname'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="opname-name">Nama Group *</Label>
            <Input 
              id="opname-name" 
              placeholder="Contoh: Opname Mei 2024" 
              {...register('name')} 
            />
            {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="opname-desc">Deskripsi (Opsional)</Label>
            <Textarea 
              id="opname-desc"
              placeholder="Catatan tambahan..." 
              className="resize-none"
              {...register('description')} 
            />
            {errors.description && <p className="text-destructive text-xs">{errors.description.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={createGroup.isPending || updateGroup.isPending}>
              {(createGroup.isPending || updateGroup.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
