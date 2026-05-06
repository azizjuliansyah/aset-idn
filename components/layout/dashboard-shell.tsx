'use client'

import { useState } from 'react'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import type { Profile } from '@/types/database'

interface DashboardShellProps {
  profile: Profile
  companyName?: string
  logoUrl?: string
  pageTitle?: string
  children: React.ReactNode
}

export function DashboardShell({
  profile,
  companyName,
  logoUrl,
  pageTitle,
  children,
}: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopOpen, setDesktopOpen] = useState(true)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        profile={profile}
        companyName={companyName}
        logoUrl={logoUrl}
        mobileOpen={mobileOpen}
        desktopOpen={desktopOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar
          profile={profile}
          pageTitle={pageTitle}
          onMobileMenuToggle={() => setMobileOpen(true)}
          onDesktopMenuToggle={() => setDesktopOpen(!desktopOpen)}
        />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-4 md:p-8">
          <div className="w-full max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
