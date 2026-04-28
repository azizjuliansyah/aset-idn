'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Camera } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getInitials } from '@/lib/utils'

const profileSchema = z.object({
  full_name: z.string().min(1, 'Nama wajib diisi'),
})
const passwordSchema = z.object({
  password: z.string().min(8, 'Password minimal 8 karakter'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { path: ['confirm'], message: 'Password tidak sama' })

type ProfileValues = z.infer<typeof profileSchema>
type PasswordValues = z.infer<typeof passwordSchema>

export function ProfileClient() {
  const supabase = createClient()
  const qc = useQueryClient()

  const { data: profile } = useQuery({
    queryKey: ['my_profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single<Profile>()
      if (error) throw error
      return data
    },
  })

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    values: profile ? { full_name: profile.full_name } : undefined,
  })

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '', confirm: '' },
  })

  const updateProfileMutation = useMutation({
    mutationFn: async (values: ProfileValues) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('profiles')
        .update({ full_name: values.full_name, updated_at: new Date().toISOString() })
        .eq('id', user!.id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Profil diperbarui')
      qc.invalidateQueries({ queryKey: ['my_profile'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updatePasswordMutation = useMutation({
    mutationFn: async (values: PasswordValues) => {
      const { error } = await supabase.auth.updateUser({ password: values.password })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Password berhasil diubah')
      passwordForm.reset()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const fileExt = file.name.split('.').pop()
      const filePath = `${user.id}/${Math.random()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)

      const { error: updateError } = await supabase.from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError
    },
    onSuccess: () => {
      toast.success('Avatar diperbarui')
      qc.invalidateQueries({ queryKey: ['my_profile'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) return toast.error('File terlalu besar (max 2MB)')
      uploadAvatarMutation.mutate(file)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Avatar */}
      <div className="flex items-center gap-5 p-5 bg-card rounded-xl border border-border">
        <div className="relative group">
          <Avatar className="w-20 h-20 text-xl border-2 border-primary/20 transition-all group-hover:border-primary/40">
            <AvatarImage src={profile?.avatar_url ?? undefined} className="object-cover" />
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl">
              {profile ? getInitials(profile.full_name) : '?'}
            </AvatarFallback>
          </Avatar>
          <label 
            htmlFor="avatar-upload" 
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg cursor-pointer hover:bg-primary/90 transition-colors z-10"
          >
            {uploadAvatarMutation.isPending ? (
              <Loader2 size={14} className="text-white animate-spin" />
            ) : (
              <Camera size={14} className="text-white" />
            )}
          </label>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileChange}
            disabled={uploadAvatarMutation.isPending}
          />
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground">{profile?.full_name}</p>
          <p className="text-sm text-muted-foreground capitalize">{profile?.role}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile">
        <TabsList className="w-full">
          <TabsTrigger value="profile" className="flex-1">Edit Profil</TabsTrigger>
          <TabsTrigger value="password" className="flex-1">Ubah Password</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informasi Profil</CardTitle>
              <CardDescription>Perbarui nama tampilan Anda</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={profileForm.handleSubmit((v) => updateProfileMutation.mutate(v))} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="p-name">Nama Lengkap *</Label>
                  <Input id="p-name" {...profileForm.register('full_name')} />
                  {profileForm.formState.errors.full_name && (
                    <p className="text-destructive text-xs">{profileForm.formState.errors.full_name.message}</p>
                  )}
                </div>
                <Button type="submit" disabled={updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending ? <><Loader2 size={14} className="mr-1.5 animate-spin" />Menyimpan...</> : 'Simpan'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ubah Password</CardTitle>
              <CardDescription>Gunakan password yang kuat (minimal 8 karakter)</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={passwordForm.handleSubmit((v) => updatePasswordMutation.mutate(v))} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pw-new">Password Baru *</Label>
                  <Input id="pw-new" type="password" {...passwordForm.register('password')} />
                  {passwordForm.formState.errors.password && (
                    <p className="text-destructive text-xs">{passwordForm.formState.errors.password.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pw-confirm">Konfirmasi Password *</Label>
                  <Input id="pw-confirm" type="password" {...passwordForm.register('confirm')} />
                  {passwordForm.formState.errors.confirm && (
                    <p className="text-destructive text-xs">{passwordForm.formState.errors.confirm.message}</p>
                  )}
                </div>
                <Button type="submit" disabled={updatePasswordMutation.isPending}>
                  {updatePasswordMutation.isPending ? <><Loader2 size={14} className="mr-1.5 animate-spin" />Mengubah...</> : 'Ubah Password'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
