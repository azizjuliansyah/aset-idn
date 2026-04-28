import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import type { Profile, CompanySettings } from '@/types/database'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const [profileRes, companyRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single<Profile>(),
    supabase
      .from('company_settings')
      .select('name, logo_url')
      .single<Pick<CompanySettings, 'name' | 'logo_url'>>(),
  ])

  const profile = profileRes.data
  const company = companyRes.data

  if (profileRes.error) {
    console.error('[DashboardLayout] Error fetching profile:', profileRes.error.message)
  }

  if (!profile) {
    console.error('[DashboardLayout] No profile found for authenticated user:', user.id)
    redirect('/login?error=no_profile')
  }

  return (
    <DashboardShell
      profile={profile}
      companyName={company?.name}
    >
      {children}
    </DashboardShell>
  )
}
