'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Camera, User, ShieldCheck } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getInitials, cn } from '@/lib/utils'

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
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile')

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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
      {/* Left Column: Live Preview Profile */}
      <div className="lg:col-span-4">
        <div className="relative overflow-hidden rounded-xl border bg-card shadow-sm flex flex-col items-center text-center">
          <div className="h-32 w-full bg-linear-to-r from-red-600 to-red-400 opacity-90" />
          <div className="px-6 pb-8 flex-1 flex flex-col items-center w-full">
            <div className="relative group -mt-16 mb-4">
              <Avatar className="w-32 h-32 text-xl border-4 border-card bg-card transition-all group-hover:border-primary/20 shadow-xl">
                <AvatarImage src={profile?.avatar_url ?? undefined} className="object-cover" />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-4xl">
                  {profile ? getInitials(profile.full_name) : '?'}
                </AvatarFallback>
              </Avatar>
              <label 
                htmlFor="avatar-upload" 
                className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg cursor-pointer hover:scale-105 active:scale-95 transition-all z-10 border-[3px] border-card"
              >
                {uploadAvatarMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Camera size={14} />
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
            
            <h2 className="text-2xl font-bold text-foreground">{profile?.full_name}</h2>
            <div className="flex flex-col items-center gap-3 mt-2">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
                {profile?.role === 'admin' ? <ShieldCheck size={14} /> : <User size={14} />}
                {profile?.role === 'admin' ? 'Administrator' : profile?.role === 'general_affair' ? 'General Affair' : profile?.role}
              </span>
              <span className="text-xs text-muted-foreground font-mono bg-muted px-2.5 py-1 rounded-md border border-border">
                ID: {profile?.id.split('-')[0] ?? profile?.id.slice(0, 8)}...
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Integrated Card with Tabs */}
      <div className="lg:col-span-8">
        <Card className="h-full overflow-hidden border-border/50 shadow-sm">
          <div className="flex flex-col sm:flex-row border-b bg-muted/30">
          <button 
            onClick={() => setActiveTab('profile')}
            className={cn(
              "flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all relative",
              activeTab === 'profile' 
                ? "text-primary bg-background" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <User size={16} />
            <span>Informasi Profil</span>
            {activeTab === 'profile' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('password')}
            className={cn(
              "flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all relative",
              activeTab === 'password' 
                ? "text-primary bg-background" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <ShieldCheck size={16} />
            <span>Keamanan</span>
            {activeTab === 'password' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>

        <CardContent className="p-0">
          {activeTab === 'profile' && (
            <div className="p-6 sm:p-8 animate-in fade-in duration-300">
              <form onSubmit={profileForm.handleSubmit((v) => updateProfileMutation.mutate(v))} className="space-y-6 max-w-xl">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="p-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nama Lengkap</Label>
                    <Input 
                      id="p-name" 
                      placeholder="Masukkan nama lengkap"
                      {...profileForm.register('full_name')} 
                    />
                    {profileForm.formState.errors.full_name && (
                      <p className="text-destructive text-xs mt-1 font-medium">{profileForm.formState.errors.full_name.message}</p>
                    )}
                  </div>
                  
                  {/* Readonly Email if available - usually from auth but let's just show a dummy or role */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Role Akun</Label>
                    <Input 
                      value={profile?.role ?? ''} 
                      disabled 
                      className="bg-muted capitalize"
                    />
                  </div>
                </div>
                
                <div className="pt-4">
                  <Button type="submit" disabled={updateProfileMutation.isPending} className="min-w-32 shadow-lg shadow-primary/20">
                    {updateProfileMutation.isPending ? (
                      <><Loader2 size={16} className="mr-2 animate-spin" />Menyimpan...</>
                    ) : 'Simpan Perubahan'}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'password' && (
            <div className="p-6 sm:p-8 animate-in fade-in duration-300">
              <form onSubmit={passwordForm.handleSubmit((v) => updatePasswordMutation.mutate(v))} className="space-y-6 max-w-xl">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="pw-new" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password Baru</Label>
                    <Input 
                      id="pw-new" 
                      type="password" 
                      placeholder="Minimal 8 karakter"
                      {...passwordForm.register('password')} 
                    />
                    {passwordForm.formState.errors.password && (
                      <p className="text-destructive text-xs mt-1 font-medium">{passwordForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pw-confirm" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Konfirmasi Password</Label>
                    <Input 
                      id="pw-confirm" 
                      type="password" 
                      placeholder="Ulangi password baru"
                      {...passwordForm.register('confirm')} 
                    />
                    {passwordForm.formState.errors.confirm && (
                      <p className="text-destructive text-xs mt-1 font-medium">{passwordForm.formState.errors.confirm.message}</p>
                    )}
                  </div>
                </div>
                
                <div className="pt-4">
                  <Button type="submit" disabled={updatePasswordMutation.isPending} className="min-w-32 shadow-lg shadow-primary/20">
                    {updatePasswordMutation.isPending ? (
                      <><Loader2 size={16} className="mr-2 animate-spin" />Mengubah...</>
                    ) : 'Ubah Password'}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </CardContent>
        </Card>
      </div>
    </div>
  )
}
