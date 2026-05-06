'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Upload, Building2 } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import type { CompanySettings } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const schema = z.object({
  name: z.string().min(1, 'Nama perusahaan wajib diisi'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  is_wa_enabled: z.boolean(),
  wa_message_format: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export function SettingsClient() {
  const supabase = createClient()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  const { data: settings, isLoading } = useQuery({
    queryKey: ['company_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('company_settings').select('*').single<CompanySettings>()
      if (error) throw error
      setLogoUrl(data.logo_url)
      return data
    },
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: settings
      ? {
          name: settings.name,
          address: settings.address ?? '',
          phone: settings.phone ?? '',
          email: settings.email ?? '',
          is_wa_enabled: settings.is_wa_enabled ?? false,
          wa_message_format: settings.wa_message_format ?? '',
        }
      : undefined,
  })

  // Watch wa_message_format to show preview
  const waFormat = form.watch('wa_message_format') || ''

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: settings!.id,
          name: values.name,
          address: values.address || null,
          phone: values.phone || null,
          email: values.email || null,
          is_wa_enabled: values.is_wa_enabled,
          wa_message_format: values.wa_message_format || null,
          logo_url: logoUrl,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal menyimpan pengaturan')
      }
    },
    onSuccess: () => {
      toast.success('Pengaturan disimpan')
      qc.invalidateQueries({ queryKey: ['company_settings'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar')
      return
    }

    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `logos/company-logo.${ext}`

    const { error } = await supabase.storage
      .from('company-assets')
      .upload(path, file, { upsert: true })

    if (error) {
      toast.error('Gagal upload logo: ' + error.message)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage
      .from('company-assets')
      .getPublicUrl(path)

    setLogoUrl(urlData.publicUrl + '?t=' + Date.now())
    toast.success('Logo berhasil diupload')
    setUploading(false)
  }

  const insertTemplate = (placeholder: string) => {
    const current = form.getValues('wa_message_format') || ''
    const space = current && !current.endsWith(' ') && !current.endsWith('\n') ? ' ' : ''
    form.setValue('wa_message_format', current + space + placeholder, { shouldDirty: true, shouldValidate: true })
  }

  if (isLoading) {
    return <div className="animate-pulse h-64 bg-muted rounded-xl" />
  }

  return (
    <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="min-w-0 pb-10">
      <Tabs defaultValue="general" className="w-full max-w-3xl flex-col">
        <TabsList className="mb-6 grid w-full max-w-md grid-cols-2 h-10 items-center rounded-md bg-muted p-1 text-muted-foreground">
          <TabsTrigger value="general" className="h-full">Informasi Umum</TabsTrigger>
          <TabsTrigger value="whatsapp" className="h-full">Pengaturan WhatsApp</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-8 mt-4">
          {/* Logo */}
          <div>
            <div className="mb-4">
              <h3 className="text-base font-medium">Logo Perusahaan</h3>
              <p className="text-sm text-muted-foreground">Upload logo perusahaan yang akan tampil di sidebar</p>
            </div>
            <div className="flex items-center gap-5">
              <Avatar className="w-20 h-20 rounded-xl">
                <AvatarImage src={logoUrl ?? undefined} className="object-contain" />
                <AvatarFallback className="rounded-xl bg-primary/10">
                  <Building2 size={28} className="text-primary" />
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading
                    ? <><Loader2 size={13} className="mr-1.5 animate-spin" />Uploading...</>
                    : <><Upload size={13} className="mr-1.5" />Upload Logo</>
                  }
                </Button>
                <p className="text-xs text-muted-foreground">PNG, JPG, SVG. Maks 2MB.</p>
              </div>
            </div>
          </div>

          {/* Info */}
          <div>
            <div className="mb-4">
              <h3 className="text-base font-medium">Informasi Perusahaan</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="s-name">Nama Perusahaan *</Label>
                <Input id="s-name" {...form.register('name')} />
                {form.formState.errors.name && <p className="text-destructive text-xs">{form.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-address">Alamat</Label>
                <Textarea id="s-address" rows={3} {...form.register('address')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="s-phone">Telepon</Label>
                  <Input id="s-phone" {...form.register('phone')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-email">Email</Label>
                  <Input id="s-email" type="email" {...form.register('email')} />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-6 mt-4">
          {/* WhatsApp Config */}
          <div>
            
            <div className="space-y-6">
              <div className="flex flex-row items-center justify-between rounded-xl border bg-card p-5 shadow-sm">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Aktifkan Pengingat WhatsApp</Label>
                  <p className="text-sm text-muted-foreground">
                    Izinkan General Affair mengirimkan pesan peringatan batas waktu ke nomor WhatsApp peminjam.
                  </p>
                </div>
                <Switch
                  checked={form.watch('is_wa_enabled')}
                  onCheckedChange={(val) => form.setValue('is_wa_enabled', val, { shouldDirty: true, shouldValidate: true })}
                />
              </div>

              <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="border-b bg-muted/30 p-4">
                  <Label htmlFor="s-wa-format" className="text-base font-medium">Template Pesan</Label>
                  <p className="text-sm text-muted-foreground mt-1">Gunakan variabel yang tersedia untuk membuat pesan dinamis.</p>
                </div>
                <div className="p-4 space-y-4">
                  <Textarea 
                    id="s-wa-format" 
                    rows={6} 
                    className="resize-y"
                    placeholder="Halo {{nama_peminjam}}, Anda meminjam {{nama_barang}}..." 
                    {...form.register('wa_message_format')} 
                  />
                  
                  <div className="rounded-lg bg-muted/50 p-3 border border-border/50">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2.5">Variabel Tersedia</p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" size="sm" className="h-7 text-xs px-2.5 bg-background hover:bg-background/80 shadow-sm" onClick={() => insertTemplate('{{nama_peminjam}}')}>
                        {'{' + '{'}nama_peminjam{'}' + '}'}
                      </Button>
                      <Button type="button" variant="secondary" size="sm" className="h-7 text-xs px-2.5 bg-background hover:bg-background/80 shadow-sm" onClick={() => insertTemplate('{{nama_barang}}')}>
                        {'{' + '{'}nama_barang{'}' + '}'}
                      </Button>
                      <Button type="button" variant="secondary" size="sm" className="h-7 text-xs px-2.5 bg-background hover:bg-background/80 shadow-sm" onClick={() => insertTemplate('{{waktu_pinjam}}')}>
                        {'{' + '{'}waktu_pinjam{'}' + '}'}
                      </Button>
                      <Button type="button" variant="secondary" size="sm" className="h-7 text-xs px-2.5 bg-background hover:bg-background/80 shadow-sm" onClick={() => insertTemplate('{{batas_pengembalian}}')}>
                        {'{' + '{'}batas_pengembalian{'}' + '}'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <div className="mt-6">
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <><Loader2 size={14} className="mr-1.5 animate-spin" />Menyimpan...</> : 'Simpan Pengaturan'}
          </Button>
        </div>
      </Tabs>
    </form>
  )
}
