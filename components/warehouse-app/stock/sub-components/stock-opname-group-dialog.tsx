'use client'

import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2, Building, Package } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useStockOpnameMutations } from '@/hooks/stock/use-stock-opname'

const formSchema = z.object({
  name: z.string().min(3, 'Nama minimal 3 karakter'),
  description: z.string().optional(),
  template_id: z.string().min(1, 'Template harus dipilih'),
})

const editSchema = z.object({
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

  const schema = isEditing ? editSchema : formSchema

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: isEditing
      ? { name: '', description: '' }
      : { name: '', description: '', template_id: '' },
  })

  const selectedTemplateId = watch('template_id')

  const { data: templatesData, isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['stock-opname-templates-dropdown'],
    queryFn: async () => {
      const res = await fetch('/api/v1/stock-opname-templates?pageSize=100')
      if (!res.ok) throw new Error('Gagal mengambil template')
      return res.json()
    },
    enabled: open && !isEditing
  })

  const templates: any[] = templatesData?.data || []

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId]
  )

  useEffect(() => {
    if (open) {
      if (initialData) {
        reset({ name: initialData.name, description: initialData.description || '' })
      } else {
        reset({ name: '', description: '', template_id: '' })
      }
    }
  }, [open, initialData, reset])

  const onSubmit = (values: any) => {
    if (isEditing && initialData) {
      updateGroup.mutate({ id: initialData.id, name: values.name, description: values.description }, {
        onSuccess: () => onOpenChange(false)
      })
    } else {
      createGroup.mutate({
        name: values.name,
        description: values.description,
        template_id: values.template_id,
      }, {
        onSuccess: () => {
          onOpenChange(false)
          reset()
        }
      })
    }
  }

  const onInvalid = () => {
    toast.error('Mohon lengkapi data dengan benar')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl sm:rounded-xl">
        <DialogHeader className="m-0 border-b bg-muted/20 p-6 pb-4 shrink-0">
          <DialogTitle>{isEditing ? 'Edit Group Stock Opname' : 'Buat Group Stock Opname'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="opname-name">Nama Group *</Label>
              <Input
                id="opname-name"
                placeholder="Contoh: Opname Mei 2024"
                {...register('name')}
              />
              {errors.name && <p className="text-destructive text-xs">{errors.name.message as string}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="opname-desc">Deskripsi (Opsional)</Label>
              <Textarea
                id="opname-desc"
                placeholder="Catatan tambahan..."
                className="resize-none"
                {...register('description')}
              />
            </div>

            {!isEditing && (
              <div className="space-y-2">
                <Label htmlFor="opname-template">Template Opname *</Label>
                <Select
                  value={selectedTemplateId || ''}
                  onValueChange={(val) => setValue('template_id', val, { shouldValidate: true })}
                >
                  <SelectTrigger id="opname-template">
                    <SelectValue placeholder="Pilih Template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingTemplates ? (
                      <SelectItem value="__loading__" disabled>Memuat template...</SelectItem>
                    ) : templates.length === 0 ? (
                      <SelectItem value="__empty__" disabled>Belum ada template</SelectItem>
                    ) : (
                      templates.map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.template_id && (
                  <p className="text-destructive text-xs">{errors.template_id.message as string}</p>
                )}

                {selectedTemplate && (
                  <div className="mt-2 rounded-lg border bg-muted/30 p-3 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building size={13} className="shrink-0" />
                      <span>Gudang: <span className="font-semibold text-foreground">{selectedTemplate.warehouse?.name ?? '—'}</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Package size={13} className="shrink-0" />
                      <span>Jumlah barang: <span className="font-semibold text-foreground">{selectedTemplate.items?.length ?? 0} item</span></span>
                    </div>
                    {selectedTemplate.description && (
                      <p className="text-xs text-muted-foreground italic">{selectedTemplate.description}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="m-0 border-t bg-muted/50 p-5 shrink-0">
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
