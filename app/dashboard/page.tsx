import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from '@/components/dashboard/dashboard-client'
import { UserDashboardClient } from '@/components/dashboard/user-dashboard-client'
import { PageWrapper } from '@/components/shared/page-wrapper'

export const metadata: Metadata = { title: 'Dashboard — Gudang IDN' }

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isUser = profile?.role === 'user'

  return (
    <PageWrapper
      title={isUser ? "Ringkasan Saya" : "Dashboard"}
      description={isUser ? "Ringkasan aktivitas peminjaman Anda" : "Ringkasan aktivitas gudang"}
      contentClassName="bg-transparent p-0"
    >
      {isUser ? <UserDashboardClient /> : <DashboardClient />}
    </PageWrapper>
  )
}
