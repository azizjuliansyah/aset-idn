'use client'

import { useState, useEffect, useMemo } from 'react'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, ClipboardList, Plus, Trash2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWarehouses } from '@/hooks/queries/use-warehouses'

import type { Item, Warehouse, Profile } from '@/types/database'
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
import { cn, getJakartaTimestamp } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const schema = z.object({
  atas_nama: z.string().optional(),
  items: z.array(z.object({
    item_id: z.string().min(1, 'Pilih barang'),
    quantity: z.number().min(1, 'Jumlah minimal 1'),
    warehouse_id: z.string().optional(),
  })).min(1, 'Pilih minimal 1 barang'),
  purpose: z.string().min(3, 'Tujuan wajib diisi'),
  loan_date: z.string().min(1, 'Waktu pinjam wajib diisi'),
  return_date: z.string().optional(),
  note: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

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

  const { data: warehouses } = useWarehouses()

  const { data: myProfile } = useQuery({
    queryKey: ['my_profile_for_loan'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      return data as Profile
    },
    enabled: open,
  })

  const { data: stockBalances } = useQuery({
    queryKey: ['stock_balances'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_stock_balances')
      if (error) throw error
      return data as { item_id: string; warehouse_id: string; balance: number | string }[]
    },
    enabled: open,
  })

  const isGAOrAdmin = myProfile?.role === 'general_affair' || myProfile?.role === 'admin'

  const dynamicSchema = useMemo(() => z.object({
    atas_nama: z.string().optional(),
    items: z.array(z.object({
      item_id: z.string().min(1, 'Pilih barang'),
      quantity: z.number().min(1, 'Jumlah minimal 1'),
      warehouse_id: z.string().optional(),
    })).min(1, 'Pilih minimal 1 barang'),
    purpose: z.string().min(3, 'Tujuan wajib diisi'),
    loan_date: z.string().min(1, 'Waktu pinjam wajib diisi'),
    return_date: z.string().optional(),
    note: z.string().optional(),
  }).superRefine((data, ctx) => {
    if (isGAOrAdmin && !data.atas_nama) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Atas nama wajib diisi',
        path: ['atas_nama'],
      });
    }

    if (data.return_date && data.loan_date) {
      if (new Date(data.return_date) < new Date(data.loan_date)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Batas waktu kembali tidak boleh sebelum waktu pinjam',
          path: ['return_date'],
        });
      }
    }

    data.items.forEach((item, index) => {
      // 1. Warehouse required for GA
      if (isGAOrAdmin && !item.warehouse_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Pilih gudang',
          path: ['items', index, 'warehouse_id'],
        });
      }

      // 2. Stock check (Only for GA/Admin)
      if (isGAOrAdmin && item.item_id && stockBalances) {
        if (item.warehouse_id) {
          const stock = Number(stockBalances.find(s => s.item_id === item.item_id && s.warehouse_id === item.warehouse_id)?.balance ?? 0)
          if (item.quantity > stock) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Stok tidak cukup (Tersedia: ${stock})`,
              path: ['items', index, 'quantity'],
            });
          }
        }
      }
    });
  }), [isGAOrAdmin, stockBalances])

  const form = useForm<FormValues>({
    resolver: zodResolver(dynamicSchema),
    mode: 'onChange',
    defaultValues: {
      atas_nama: '',
      items: [{ item_id: '', quantity: 1, warehouse_id: '' }],
      purpose: '',
      loan_date: getJakartaTimestamp(),
      return_date: '',
      note: '',
    },
  })

  // Set default warehouse for the first item when warehouses are loaded
  useEffect(() => {
    if (open && warehouses && warehouses.length > 0) {
      const currentItems = form.getValues('items')
      if (currentItems.length === 1 && currentItems[0].warehouse_id === '') {
        const defaultWhId = warehouses.find(w => w.is_default)?.id || ''
        form.setValue('items.0.warehouse_id', defaultWhId)
      }
    }
  }, [open, warehouses, form])

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  // Set default warehouse when warehouses data is loaded or items added
  useEffect(() => {
    if (warehouses && warehouses.length > 0) {
      const defaultWhId = warehouses.find(w => w.is_default)?.id || ''
      const currentItems = form.getValues('items')
      currentItems.forEach((item, idx) => {
        if (!item.warehouse_id) {
          form.setValue(`items.${idx}.warehouse_id`, defaultWhId)
        }
      })
    }
  }, [warehouses, fields.length, form])

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
      qc.invalidateQueries({ queryKey: ['loans_ga'] })
      onOpenChange(false)
      form.reset()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList size={18} />
            Request Pinjam Barang
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4 min-w-0">
          {isGAOrAdmin && (
            <div className="space-y-1.5">
              <Label htmlFor="atas_nama">Atas Nama (Peminjam) *</Label>
              <Input 
                id="atas_nama"
                placeholder="Masukkan nama peminjam..."
                {...form.register('atas_nama')}
              />
              <p className="text-[10px] text-red-600/70">Pinjaman akan otomatis disetujui jika dibuat oleh GA/Admin.</p>
              {form.formState.errors.atas_nama && (
                <p className="text-destructive text-xs">{form.formState.errors.atas_nama.message}</p>
              )}
            </div>
          )}

          {/* Items List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Daftar Barang *</Label>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="h-7 text-[10px] gap-1"
                onClick={() => {
                  const defaultWhId = warehouses?.find(w => w.is_default)?.id || ''
                  append({ 
                    item_id: '', 
                    quantity: 1, 
                    warehouse_id: defaultWhId 
                  })
                }}
              >
                <Plus size={12} /> Tambah Barang
              </Button>
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start bg-muted/30 p-3 rounded-lg border border-dashed">
                  <div className="flex-1 space-y-2">
                    <div className="space-y-1">
                      <Controller
                        name={`items.${index}.item_id`}
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
                      {form.formState.errors.items?.[index]?.item_id && (
                        <p className="text-destructive text-[10px]">{form.formState.errors.items[index]?.item_id?.message}</p>
                      )}
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] font-semibold">Jumlah</Label>
                          {isGAOrAdmin && (() => {
                            const itemId = form.watch(`items.${index}.item_id`)
                            const whId = form.watch(`items.${index}.warehouse_id`)
                            if (itemId && stockBalances) {
                              let s = 0
                              if (whId) {
                                s = Number(stockBalances.find(st => st.item_id === itemId && st.warehouse_id === whId)?.balance ?? 0)
                              }
                              return (
                                <span className="text-[9px] text-muted-foreground font-medium bg-muted/50 px-1 py-0.5 rounded leading-none">
                                  Tersedia: <span className={cn("font-bold", s <= 0 ? "text-destructive" : "text-foreground")}>{s}</span>
                                </span>
                              )
                            }
                            return null
                          })()}
                        </div>
                        <Input
                          type="number"
                          min={1}
                          className="h-8 text-xs"
                          {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                        />
                        {form.formState.errors.items?.[index]?.quantity && (
                          <p className="text-destructive text-[10px]">{form.formState.errors.items[index]?.quantity?.message}</p>
                        )}
                      </div>

                      {isGAOrAdmin && (
                        <div className="flex-[2] space-y-1">
                          <Label className="text-[10px] font-semibold">Gudang *</Label>
                          <Controller
                            name={`items.${index}.warehouse_id`}
                            control={form.control}
                            render={({ field }) => (
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Pilih gudang" />
                                </SelectTrigger>
                                <SelectContent>
                                  {warehouses?.map((w) => (
                                    <SelectItem key={w.id} value={w.id} className="text-xs">
                                      {w.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                          {form.formState.errors.items?.[index]?.warehouse_id && (
                            <p className="text-destructive text-[10px]">{form.formState.errors.items[index]?.warehouse_id?.message}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {fields.length > 1 && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-red-50 mt-0"
                      onClick={() => remove(index)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              ))}
              {form.formState.errors.items?.root && (
                <p className="text-destructive text-xs">{form.formState.errors.items.root.message}</p>
              )}
            </div>
          </div>

          <div className="h-px bg-border my-4" />

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="loan-date">Waktu Pinjam *</Label>
              <Input id="loan-date" type="datetime-local" {...form.register('loan_date')} />
              {form.formState.errors.loan_date && (
                <p className="text-destructive text-xs">{form.formState.errors.loan_date.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="return-date">Batas Waktu Kembali</Label>
              <Input id="return-date" type="datetime-local" {...form.register('return_date')} />
              {form.formState.errors.return_date && (
                <p className="text-destructive text-xs">{form.formState.errors.return_date.message}</p>
              )}
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
            <Button 
              type="submit" 
              disabled={mutation.isPending}
            >
              {mutation.isPending
                ? <><Loader2 size={14} className="mr-1.5 animate-spin" />Memproses...</>
                : 'Kirim Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
