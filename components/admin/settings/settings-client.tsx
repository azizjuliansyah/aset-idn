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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const schema = z.object({
  name: z.string().min(1, 'Nama perusahaan wajib diisi'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
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
        }
      : undefined,
  })

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { error } = await supabase
        .from('company_settings')
        .update({
          name: values.name,
          address: values.address || null,
          phone: values.phone || null,
          email: values.email || null,
          logo_url: logoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings!.id)
      if (error) throw error
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

  if (isLoading) {
    return <div className="animate-pulse h-64 bg-muted rounded-xl" />
  }

  return (
    <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))}>
      <div className="grid gap-6 max-w-2xl">
        {/* Logo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Logo Perusahaan</CardTitle>
            <CardDescription>Upload logo perusahaan yang akan tampil di sidebar</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-5">
            <Avatar className="w-20 h-20 rounded-xl border">
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
          </CardContent>
        </Card>

        {/* Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informasi Perusahaan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>

        <Button type="submit" disabled={saveMutation.isPending} className="self-start">
          {saveMutation.isPending ? <><Loader2 size={14} className="mr-1.5 animate-spin" />Menyimpan...</> : 'Simpan Pengaturan'}
        </Button>
      </div>
    </form>
  )
}
