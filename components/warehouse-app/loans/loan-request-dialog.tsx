'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, ClipboardList } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

import type { Item, Warehouse } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'

const schema = z.object({
  item_id: z.string().min(1, 'Pilih barang'),
  warehouse_id: z.string().min(1, 'Pilih gudang'),
  quantity: z.number().min(1, 'Jumlah minimal 1'),
  purpose: z.string().min(3, 'Tujuan wajib diisi'),
  loan_date: z.string().min(1, 'Waktu pinjam wajib diisi'),
  return_date: z.string().optional(),
  note: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LoanRequestDialog({ open, onOpenChange }: Props) {
  const supabase = createClient()
  const qc = useQueryClient()

  const { data: items } = useQuery({
    queryKey: ['items_for_loan'],
    queryFn: async () => {
      const { data } = await supabase
        .from('items')
        .select('id, name')
        .eq('status', 'active')
        .order('name')
      return (data ?? []) as Pick<Item, 'id' | 'name'>[]
    },
    enabled: open,
  })

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses_for_loan'],
    queryFn: async () => {
      const { data } = await supabase.from('warehouses').select('id, name').order('name')
      return (data ?? []) as Pick<Warehouse, 'id' | 'name'>[]
    },
    enabled: open,
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      item_id: '',
      warehouse_id: '',
      quantity: 1,
      purpose: '',
      loan_date: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
      return_date: '',
      note: '',
    },
  })

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await fetch('/api/v1/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Gagal membuat request')
      }
    },
    onSuccess: () => {
      toast.success('Request peminjaman berhasil dibuat')
      qc.invalidateQueries({ queryKey: ['loans'] })
      onOpenChange(false)
      form.reset()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList size={18} />
            Request Pinjam Barang
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          {/* Item */}
          <div className="space-y-1.5">
            <Label>Barang *</Label>
            <Controller
              name="item_id"
              control={form.control}
              render={({ field }) => (
                <Combobox 
                  value={field.value} 
                  onValueChange={field.onChange}
                  options={items?.map((i) => ({ value: i.id, label: i.name })) ?? []}
                  placeholder="Pilih barang"
                  searchPlaceholder="Cari barang..."
                  disabled={!items}
                />
              )}
            />
            {form.formState.errors.item_id && (
              <p className="text-destructive text-xs">{form.formState.errors.item_id.message}</p>
            )}
          </div>

          {/* Warehouse */}
          <div className="space-y-1.5">
            <Label>Gudang *</Label>
            <Controller
              name="warehouse_id"
              control={form.control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Pilih gudang" /></SelectTrigger>
                  <SelectContent>
                    {warehouses?.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.warehouse_id && (
              <p className="text-destructive text-xs">{form.formState.errors.warehouse_id.message}</p>
            )}
          </div>

          {/* Quantity */}
          <div className="space-y-1.5">
            <Label htmlFor="loan-qty">Jumlah *</Label>
            <Input
              id="loan-qty"
              type="number"
              min={1}
              {...form.register('quantity', { valueAsNumber: true })}
            />
            {form.formState.errors.quantity && (
              <p className="text-destructive text-xs">{form.formState.errors.quantity.message}</p>
            )}
          </div>

          {/* Purpose */}
          <div className="space-y-1.5">
            <Label htmlFor="loan-purpose">Tujuan Peminjaman *</Label>
            <Textarea
              id="loan-purpose"
              rows={2}
              placeholder="Jelaskan tujuan peminjaman barang..."
              {...form.register('purpose')}
            />
            {form.formState.errors.purpose && (
              <p className="text-destructive text-xs">{form.formState.errors.purpose.message}</p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="loan-date">Waktu Pinjam *</Label>
              <Input id="loan-date" type="datetime-local" {...form.register('loan_date')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="return-date">Batas Waktu Kembali</Label>
              <Input id="return-date" type="datetime-local" {...form.register('return_date')} />
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label htmlFor="loan-note">Catatan</Label>
            <Textarea id="loan-note" rows={2} {...form.register('note')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? <><Loader2 size={14} className="mr-1.5 animate-spin" />Mengirim...</>
                : 'Kirim Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
