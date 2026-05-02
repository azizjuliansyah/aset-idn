import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from '@/components/dashboard/dashboard-client'
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

  // Redirect role 'user' to loans page
  if (profile?.role === 'user') {
    redirect('/dashboard/loans')
  }

  // Admin and GA can access Dashboard
  return (
    <PageWrapper
      title="Dashboard"
      description="Ringkasan aktivitas gudang"
      contentClassName="bg-transparent p-0"
    >
      <DashboardClient />
    </PageWrapper>
  )
}
