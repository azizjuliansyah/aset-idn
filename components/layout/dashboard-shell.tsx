'use client'

import { useState } from 'react'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import type { Profile } from '@/types/database'

interface DashboardShellProps {
  profile: Profile
  companyName?: string
  pageTitle?: string
  children: React.ReactNode
}

export function DashboardShell({
  profile,
  companyName,
  pageTitle,
  children,
}: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        profile={profile}
        companyName={companyName}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar
          profile={profile}
          pageTitle={pageTitle}
          onMobileMenuToggle={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
