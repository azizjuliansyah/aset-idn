'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Menu, LogOut, User, ChevronDown, Shield, Building2, PanelLeft } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'
import { getInitials } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface TopbarProps {
  profile: Profile
  pageTitle?: string
  onMobileMenuToggle: () => void
  onDesktopMenuToggle?: () => void
}

export function Topbar({ profile, pageTitle, onMobileMenuToggle, onDesktopMenuToggle }: TopbarProps) {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Berhasil logout')
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 gap-4 flex-shrink-0">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Menu size={20} />
        </button>
        {onDesktopMenuToggle && (
          <button
            onClick={onDesktopMenuToggle}
            className="hidden lg:block p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <PanelLeft size={20} />
          </button>
        )}
        {pageTitle && (
          <h1 className="text-base font-semibold text-foreground hidden sm:block">
            {pageTitle}
          </h1>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent transition-colors">
            <Avatar className="w-9 h-9">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                {getInitials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:block text-left">
              <span className="block text-sm font-medium text-foreground leading-none">{profile.full_name}</span>
              <div className="mt-1.5 flex items-center">
                <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tracking-wide bg-primary/10 text-primary ring-1 ring-inset ring-primary/20 uppercase">
                  {profile.role === 'admin' ? (
                    <>
                      <Shield size={10} />
                      Administrator
                    </>
                  ) : profile.role === 'general_affair' ? (
                    <>
                      <Building2 size={10} />
                      General Affair
                    </>
                  ) : (
                    <span>{profile.role}</span>
                  )}
                </span>
              </div>
            </span>
            <ChevronDown size={14} className="text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/dashboard/profile')}>
              <User size={14} className="mr-2" />
              Edit Profil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              disabled={loggingOut}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut size={14} className="mr-2" />
              {loggingOut ? 'Keluar...' : 'Keluar'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
