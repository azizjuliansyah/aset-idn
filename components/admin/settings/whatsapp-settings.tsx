'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Search, Users, Check, Smartphone, X, RotateCcw, Clock } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { CompanySettings } from '@/types/database'
import { Button, buttonVariants } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs'
import { TooltipProvider } from "@/components/ui/tooltip"

// Sub-components
import { WaVariableList } from './sub-components/wa-variable-list'
import { WaGroupSelector, type WatzapGroup } from './sub-components/wa-group-selector'

const schema = z.object({
  wa_message_format: z.string().optional(),
  wa_group_id: z.string().optional(),
  wa_group_names: z.string().optional(),
  wa_group_message_format: z.string().optional(),
  wa_stock_low_group_id: z.string().optional(),
  wa_stock_low_group_names: z.string().optional(),
  wa_stock_low_message_format: z.string().optional(),
  wa_return_message_format: z.string().optional(),
  wa_return_group_message_format: z.string().optional(),
  wa_return_group_id: z.string().optional(),
  wa_return_group_names: z.string().optional(),
  wa_return_finished_message_format: z.string().optional(),
  wa_return_finished_group_message_format: z.string().optional(),
  wa_overdue_message_format: z.string().optional(),
  wa_overdue_group_id: z.string().optional(),
  wa_overdue_group_names: z.string().optional(),
  wa_overdue_group_message_format: z.string().optional(),
  wa_overdue_cron_time: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export function WhatsappSettings() {
  const supabase = createClient()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('loan')
  const [lastFocusedField, setLastFocusedField] = useState<keyof FormValues>('wa_message_format')

  const { data: settings, isLoading } = useQuery({
    queryKey: ['company_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('company_settings').select('*').single<CompanySettings>()
      if (error) throw error
      return data
    },
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      wa_message_format: '',
      wa_group_id: '',
      wa_group_names: '',
      wa_group_message_format: '',
      wa_stock_low_group_id: '',
      wa_stock_low_group_names: '',
      wa_stock_low_message_format: '',
      wa_return_message_format: '',
      wa_return_group_message_format: '',
      wa_return_group_id: '',
      wa_return_group_names: '',
      wa_return_finished_message_format: '',
      wa_return_finished_group_message_format: '',
      wa_overdue_message_format: '',
      wa_overdue_group_id: '',
      wa_overdue_group_names: '',
      wa_overdue_group_message_format: '',
      wa_overdue_cron_time: '08:00',
    },
    values: settings
      ? {
          wa_message_format: settings.wa_message_format ?? '',
          wa_group_id: settings.wa_group_id ?? '',
          wa_group_names: settings.wa_group_names ?? '',
          wa_group_message_format: settings.wa_group_message_format ?? '',
          wa_stock_low_group_id: settings.wa_stock_low_group_id ?? '',
          wa_stock_low_group_names: settings.wa_stock_low_group_names ?? '',
          wa_stock_low_message_format: settings.wa_stock_low_message_format ?? '',
          wa_return_message_format: settings.wa_return_message_format ?? '',
          wa_return_group_message_format: settings.wa_return_group_message_format ?? '',
          wa_return_group_id: settings.wa_return_group_id ?? '',
          wa_return_group_names: settings.wa_return_group_names ?? '',
          wa_return_finished_message_format: settings.wa_return_finished_message_format ?? '',
          wa_return_finished_group_message_format: settings.wa_return_finished_group_message_format ?? '',
          wa_overdue_message_format: settings.wa_overdue_message_format ?? '',
          wa_overdue_group_id: settings.wa_overdue_group_id ?? '',
          wa_overdue_group_names: settings.wa_overdue_group_names ?? '',
          wa_overdue_group_message_format: settings.wa_overdue_group_message_format ?? '',
          wa_overdue_cron_time: settings.wa_overdue_cron_time ?? '08:00',
        }
      : undefined,
  })

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: settings!.id,
          ...values,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal menyimpan pengaturan')
      }
    },
    onSuccess: () => {
      toast.success('Pengaturan WhatsApp disimpan')
      qc.invalidateQueries({ queryKey: ['company_settings'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const insertTemplate = (placeholder: string, field: keyof FormValues = 'wa_message_format') => {
    const ids: Record<string, string> = {
      'wa_message_format': 's-wa-format',
      'wa_group_message_format': 's-wa-group-format',
      'wa_stock_low_message_format': 's-wa-stock-format',
      'wa_return_message_format': 's-wa-return-format',
      'wa_return_group_message_format': 's-wa-return-group-format',
      'wa_return_finished_message_format': 's-wa-return-finished-format',
      'wa_return_finished_group_message_format': 's-wa-return-finished-group-format',
      'wa_overdue_message_format': 's-wa-overdue-format',
      'wa_overdue_group_message_format': 's-wa-overdue-group-format'
    }
    const id = ids[field]
    const textarea = document.getElementById(id) as HTMLTextAreaElement
    const current = form.getValues(field) || ''

    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const before = current.substring(0, start)
      const after = current.substring(end)
      
      const newValue = before + placeholder + after
      form.setValue(field, newValue, { shouldDirty: true, shouldValidate: true })
      
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + placeholder.length, start + placeholder.length)
      }, 0)
    } else {
      const space = current && !current.endsWith(' ') && !current.endsWith('\n') ? ' ' : ''
      form.setValue(field, current + space + placeholder, { shouldDirty: true, shouldValidate: true })
    }
  }

  const handleGroupsSelect = (field: 'wa_group_id' | 'wa_stock_low_group_id' | 'wa_return_group_id' | 'wa_overdue_group_id', nameField: 'wa_group_names' | 'wa_stock_low_group_names' | 'wa_return_group_names' | 'wa_overdue_group_names', selected: WatzapGroup[]) => {
    form.setValue(field, selected.map(g => g.id).join(','), { shouldDirty: true, shouldValidate: true })
    form.setValue(nameField, selected.map(g => g.name).join(', '), { shouldDirty: true, shouldValidate: true })
  }

  if (isLoading) return <div className="animate-pulse h-64 bg-muted rounded-xl" />

  const selectedGroups: WatzapGroup[] = form.watch('wa_group_id') 
    ? form.watch('wa_group_id')!.split(',').map((id, i) => ({ 
        id: id.trim(), 
        name: form.watch('wa_group_names')!.split(',')[i]?.trim() || id.trim() 
      })) 
    : []

  const selectedStockGroups: WatzapGroup[] = form.watch('wa_stock_low_group_id')
    ? form.watch('wa_stock_low_group_id')!.split(',').map((id, i) => ({
        id: id.trim(),
        name: form.watch('wa_stock_low_group_names')!.split(',')[i]?.trim() || id.trim()
      }))
    : []

  const selectedReturnGroups: WatzapGroup[] = form.watch('wa_return_group_id')
    ? form.watch('wa_return_group_id')!.split(',').map((id, i) => ({
        id: id.trim(),
        name: form.watch('wa_return_group_names')!.split(',')[i]?.trim() || id.trim()
      }))
    : []

  const selectedOverdueGroups: WatzapGroup[] = form.watch('wa_overdue_group_id')
    ? form.watch('wa_overdue_group_id')!.split(',').map((id, i) => ({
        id: id.trim(),
        name: form.watch('wa_overdue_group_names')!.split(',')[i]?.trim() || id.trim()
      }))
    : []

  return (
    <TooltipProvider>
      <div className="w-full pb-10">
      <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="inline-flex h-auto bg-muted/50 rounded-xl gap-1">
            <TabsTrigger value="loan" className="flex items-center gap-2">
              <Smartphone size={14} />
              Peminjaman Barang
            </TabsTrigger>
            <TabsTrigger value="stock" className="flex items-center gap-2">
              <Check size={14} />
              Pergerakan Stok
            </TabsTrigger>
            <TabsTrigger value="return" className="flex items-center gap-2">
              <RotateCcw size={14} />
              Pengembalian Barang Pinjaman
            </TabsTrigger>
            <TabsTrigger value="overdue" className="flex items-center gap-2">
              <Clock size={14} />
              Keterlambatan Pengembalian
            </TabsTrigger>
          </TabsList>

          <TabsContent value="loan">
            <div className="rounded-xl border bg-card shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="p-6 space-y-6">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Personal Column */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 text-muted-foreground h-8">
                      <Smartphone size={14} />
                      <Label className="text-[11px] font-medium uppercase tracking-widest">Template Peminjam (Personal)</Label>
                    </div>
                    <Textarea 
                      id="s-wa-format" 
                      className="h-[220px] resize-none focus:ring-1 focus:ring-primary overflow-y-auto"
                      placeholder="Halo {{nama_peminjam}}, Anda meminjam {{nama_barang}}..." 
                      {...form.register('wa_message_format')}
                      onFocus={() => setLastFocusedField('wa_message_format')}
                    />
                  </div>

                  {/* Group Column */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between h-8">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users size={14} />
                        <Label className="text-[11px] font-medium uppercase tracking-widest">Template Grup</Label>
                      </div>
                      <WaGroupSelector 
                        selectedGroups={selectedGroups}
                        onSelect={(groups) => handleGroupsSelect('wa_group_id', 'wa_group_names', groups)}
                        trigger={
                          <Button variant="outline" size="sm" className="h-7 text-[11px] px-2">
                            <Search size={12} className="mr-1" />
                            Pilih Grup
                          </Button>
                        }
                      />
                    </div>
                    <Textarea 
                      id="s-wa-group-format" 
                      className="h-[220px] resize-none focus:ring-1 focus:ring-primary overflow-y-auto"
                      placeholder="Notifikasi Peminjaman: {{nama_peminjam}} meminjam {{nama_barang}}..." 
                      {...form.register('wa_group_message_format')}
                      onFocus={() => setLastFocusedField('wa_group_message_format')}
                    />
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedGroups.length > 0 ? (
                        selectedGroups.map(g => (
                          <div key={g.id} className="bg-muted/50 text-xs px-2 py-1 rounded-md border flex items-center gap-2">
                            <div className="flex flex-col">
                              <span className="font-medium text-[10px] leading-tight">{g.name}</span>
                              <span className="text-[9px] opacity-60 leading-tight">{g.id}</span>
                            </div>
                            <X size={12} className="cursor-pointer hover:text-destructive" onClick={() => handleGroupsSelect('wa_group_id', 'wa_group_names', selectedGroups.filter(x => x.id !== g.id))} />
                          </div>
                        ))
                      ) : <p className="text-[10px] italic text-muted-foreground">Belum ada grup dipilih</p>}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mb-3 block">Variabel Tersedia</Label>
                  <WaVariableList 
                    variables={['{{nama_peminjam}}', '{{nomor_peminjam}}', '{{nama_barang}}', '{{list_barang}}', '{{waktu_pinjam}}', '{{batas_pengembalian}}']}
                    onSelect={(v) => insertTemplate(v, lastFocusedField.includes('wa_message') || lastFocusedField.includes('wa_group_message') ? lastFocusedField : 'wa_message_format')}
                  />
                  <p className="text-[10px] text-muted-foreground mt-2 italic">
                    * Klik variabel untuk menyisipkan ke bagian yang sedang difokuskan.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="stock">
            <div className="rounded-xl border bg-card shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between h-8">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Check size={14} />
                      <Label className="text-[11px] font-medium uppercase tracking-widest">Template Pesan Stok Rendah</Label>
                    </div>
                  <WaGroupSelector 
                    selectedGroups={selectedStockGroups}
                    onSelect={(groups) => handleGroupsSelect('wa_stock_low_group_id', 'wa_stock_low_group_names', groups)}
                    trigger={
                      <Button variant="outline" size="sm" className="h-8">
                        <Search size={13} className="mr-1.5" />
                        Pilih Grup Target
                      </Button>
                    }
                  />
                </div>

                <Textarea 
                  id="s-wa-stock-format" 
                  className="h-[220px] resize-none focus:ring-1 focus:ring-primary overflow-y-auto"
                  placeholder={`⚠️ *STOK MINIMUM TERCAPAI*\n\nBarang: *{{nama_barang}}*\n...`} 
                  {...form.register('wa_stock_low_message_format')} 
                  onFocus={() => setLastFocusedField('wa_stock_low_message_format')}
                />

                <div className="flex flex-wrap gap-2">
                  {selectedStockGroups.length > 0 ? (
                    selectedStockGroups.map(g => (
                      <div key={g.id} className="bg-muted/50 text-xs px-2 py-1 rounded-md border flex items-center gap-2">
                        <div className="flex flex-col">
                          <span className="font-medium text-[10px] leading-tight">{g.name}</span>
                          <span className="text-[9px] opacity-60 leading-tight">{g.id}</span>
                        </div>
                        <X size={12} className="cursor-pointer hover:text-destructive" onClick={() => handleGroupsSelect('wa_stock_low_group_id', 'wa_stock_low_group_names', selectedStockGroups.filter(x => x.id !== g.id))} />
                      </div>
                    ))
                  ) : <p className="text-xs italic text-muted-foreground">Belum ada grup target pengadaan</p>}
                </div>

                <div className="pt-4 border-t">
                  <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mb-3 block">Variabel Tersedia</Label>
                  <WaVariableList 
                    variables={['{{nama_barang}}', '{{stok_saat_ini}}', '{{batas_minimum}}', '{{trigger_notifikasi}}']}
                    onSelect={(v) => insertTemplate(v, 'wa_stock_low_message_format')}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="return">
            <div className="rounded-xl border bg-card shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-2 text-primary">
                  <RotateCcw size={16} />
                  <Label className="text-sm font-bold uppercase tracking-widest">Pengembalian Parsial (Sebagian)</Label>
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                  {/* Personal Column */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 text-muted-foreground h-8">
                      <RotateCcw size={14} />
                      <Label className="text-[11px] font-medium uppercase tracking-widest">Template Peminjam (Personal)</Label>
                    </div>
                    <Textarea 
                      id="s-wa-return-format" 
                      className="h-[180px] resize-none focus:ring-1 focus:ring-primary overflow-y-auto"
                      placeholder="Halo {{nama_peminjam}}, Anda telah mengembalikan..." 
                      {...form.register('wa_return_message_format')}
                      onFocus={() => setLastFocusedField('wa_return_message_format')}
                    />
                  </div>

                  {/* Group Column */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between h-8">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users size={14} />
                        <Label className="text-[11px] font-medium uppercase tracking-widest">Template Grup</Label>
                      </div>
                      <WaGroupSelector 
                        selectedGroups={selectedReturnGroups}
                        onSelect={(groups) => handleGroupsSelect('wa_return_group_id', 'wa_return_group_names', groups)}
                        trigger={
                          <Button variant="outline" size="sm" className="h-7 text-[11px] px-2">
                            <Search size={12} className="mr-1" />
                            Pilih Grup
                          </Button>
                        }
                      />
                    </div>
                    <Textarea 
                      id="s-wa-return-group-format" 
                      className="h-[180px] resize-none focus:ring-1 focus:ring-primary overflow-y-auto"
                      placeholder="Notifikasi Pengembalian: {{nama_peminjam}} telah mengembalikan..." 
                      {...form.register('wa_return_group_message_format')}
                      onFocus={() => setLastFocusedField('wa_return_group_message_format')}
                    />
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedReturnGroups.length > 0 ? (
                        selectedReturnGroups.map(g => (
                          <div key={g.id} className="bg-muted/50 text-xs px-2 py-1 rounded-md border flex items-center gap-2">
                            <div className="flex flex-col">
                              <span className="font-medium text-[10px] leading-tight">{g.name}</span>
                              <span className="text-[9px] opacity-60 leading-tight">{g.id}</span>
                            </div>
                            <X size={12} className="cursor-pointer hover:text-destructive" onClick={() => handleGroupsSelect('wa_return_group_id', 'wa_return_group_names', selectedReturnGroups.filter(x => x.id !== g.id))} />
                          </div>
                        ))
                      ) : <p className="text-[10px] italic text-muted-foreground">Belum ada grup dipilih</p>}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t space-y-6">
                  <div className="flex items-center gap-2 text-primary">
                    <Check size={16} />
                    <Label className="text-sm font-bold uppercase tracking-widest">Pengembalian Selesai (Semua Barang)</Label>
                  </div>
                  
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Finished Personal Column */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2 text-muted-foreground h-8">
                        <RotateCcw size={14} />
                        <Label className="text-[11px] font-medium uppercase tracking-widest">Template Peminjam (Personal)</Label>
                      </div>
                      <Textarea 
                        id="s-wa-return-finished-format" 
                        className="h-[180px] resize-none focus:ring-1 focus:ring-primary overflow-y-auto"
                        placeholder="Halo {{nama_peminjam}}, semua barang pinjaman Anda telah kembali..." 
                        {...form.register('wa_return_finished_message_format')}
                        onFocus={() => setLastFocusedField('wa_return_finished_message_format')}
                      />
                    </div>

                    {/* Finished Group Column */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2 text-muted-foreground h-8">
                        <Users size={14} />
                        <Label className="text-[11px] font-medium uppercase tracking-widest">Template Grup</Label>
                      </div>
                      <Textarea 
                        id="s-wa-return-finished-group-format" 
                        className="h-[180px] resize-none focus:ring-1 focus:ring-primary overflow-y-auto"
                        placeholder="Notifikasi Selesai: {{nama_peminjam}} telah mengembalikan semua barang..." 
                        {...form.register('wa_return_finished_group_message_format')}
                        onFocus={() => setLastFocusedField('wa_return_finished_group_message_format')}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mb-3 block">Variabel Tersedia</Label>
                  <WaVariableList 
                    variables={['{{nama_peminjam}}', '{{nomor_peminjam}}', '{{barang_kembali}}', '{{barang_belum_kembali}}', '{{waktu_pinjam}}', '{{batas_pengembalian}}']}
                    onSelect={(v) => insertTemplate(v, lastFocusedField.includes('wa_return') ? lastFocusedField : 'wa_return_message_format')}
                  />
                  <p className="text-[10px] text-muted-foreground mt-2 italic">
                    * Klik variabel untuk menyisipkan ke bagian yang sedang difokuskan.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="overdue">
            <div className="rounded-xl border bg-card shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="p-6 space-y-6">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Personal Column */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 text-muted-foreground h-8">
                      <Clock size={14} />
                      <Label className="text-[11px] font-medium uppercase tracking-widest">Template Peminjam (Personal)</Label>
                    </div>
                    <Textarea 
                      id="s-wa-overdue-format" 
                      className="h-[220px] resize-none focus:ring-1 focus:ring-primary overflow-y-auto"
                      placeholder="Halo {{nama_peminjam}}, peminjaman Anda melewati batas waktu..." 
                      {...form.register('wa_overdue_message_format')}
                      onFocus={() => setLastFocusedField('wa_overdue_message_format')}
                    />
                  </div>

                  {/* Group Column */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between h-8">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users size={14} />
                        <Label className="text-[11px] font-medium uppercase tracking-widest">Template Grup</Label>
                      </div>
                      <WaGroupSelector 
                        selectedGroups={selectedOverdueGroups}
                        onSelect={(groups) => handleGroupsSelect('wa_overdue_group_id', 'wa_overdue_group_names', groups)}
                        trigger={
                          <Button variant="outline" size="sm" className="h-7 text-[11px] px-2">
                            <Search size={12} className="mr-1" />
                            Pilih Grup
                          </Button>
                        }
                      />
                    </div>
                    <Textarea 
                      id="s-wa-overdue-group-format" 
                      className="h-[220px] resize-none focus:ring-1 focus:ring-primary overflow-y-auto"
                      placeholder="Notifikasi Keterlambatan: {{nama_peminjam}} terlambat mengembalikan..." 
                      {...form.register('wa_overdue_group_message_format')}
                      onFocus={() => setLastFocusedField('wa_overdue_group_message_format')}
                    />
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedOverdueGroups.length > 0 ? (
                        selectedOverdueGroups.map(g => (
                          <div key={g.id} className="bg-muted/50 text-xs px-2 py-1 rounded-md border flex items-center gap-2">
                            <div className="flex flex-col">
                              <span className="font-medium text-[10px] leading-tight">{g.name}</span>
                              <span className="text-[9px] opacity-60 leading-tight">{g.id}</span>
                            </div>
                            <X size={12} className="cursor-pointer hover:text-destructive" onClick={() => handleGroupsSelect('wa_overdue_group_id', 'wa_overdue_group_names', selectedOverdueGroups.filter(x => x.id !== g.id))} />
                          </div>
                        ))
                      ) : <p className="text-[10px] italic text-muted-foreground">Belum ada grup dipilih</p>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 py-4 px-4 bg-muted/30 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-primary" />
                    <Label className="text-sm font-medium">Waktu Pengiriman Otomatis</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="time" 
                      className="w-28 h-9 text-center font-mono bg-background border rounded-md px-2 focus:ring-1 focus:ring-primary outline-none"
                      {...form.register('wa_overdue_cron_time')}
                    />
                    <span className="text-xs text-muted-foreground">WIB (Asia/Jakarta)</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground ml-auto max-w-[250px] leading-tight">
                    Sistem akan mengirimkan pengingat setiap hari pada jam ini jika scheduler diaktifkan di Vercel.
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mb-3 block">Variabel Tersedia</Label>
                  <WaVariableList 
                    variables={['{{nama_peminjam}}', '{{nomor_peminjam}}', '{{list_barang}}', '{{barang_belum_kembali}}', '{{waktu_pinjam}}', '{{batas_pengembalian}}']}
                    onSelect={(v) => insertTemplate(v, lastFocusedField.includes('wa_overdue') ? lastFocusedField : 'wa_overdue_message_format')}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-6">
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <><Loader2 size={14} className="mr-1.5 animate-spin" />Menyimpan...</> : 'Simpan Perubahan'}
          </Button>
        </div>
      </form>
      </div>
    </TooltipProvider>
  )
}
