'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { navGroups } from './nav-config'
import type { Profile } from '@/types/database'
import type { AppRole } from './nav-config'
import { Warehouse, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface SidebarProps {
  profile: Profile
  companyName?: string
  logoUrl?: string
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function Sidebar({ profile, companyName, logoUrl, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (pathname === href) return true
    
    // Check if pathname is a sub-path of href
    if (pathname.startsWith(href + '/')) {
      // If there's another more specific menu item that also matches, this one is not the "active" one
      const isOtherBetterMatch = navGroups.some(group => 
        group.items.some(item => 
          item.href !== href && 
          pathname.startsWith(item.href) && 
          item.href.length > href.length
        )
      )
      return !isOtherBetterMatch
    }
    
    return false
  }

  const filteredGroups = navGroups.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => !item.roles || item.roles.includes(profile.role as AppRole)
    ),
  })).filter(
    (group) =>
      group.items.length > 0 &&
      (!group.roles || group.roles.includes(profile.role as AppRole))
  )

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col',
          'transition-transform duration-300 ease-in-out',
          'lg:relative lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-sidebar-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-md overflow-hidden border border-sidebar-border/50">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
              ) : (
                <Warehouse size={16} className="text-primary" />
              )}
            </div>
            <div>
              <p className="text-sidebar-foreground font-semibold text-sm leading-none">
                {companyName ?? 'Gudang IDN'}
              </p>
            </div>
          </div>

          {/* Mobile close */}
          <button
            onClick={onMobileClose}
            className="lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {filteredGroups.map((group) => (
            <div key={group.title}>
              <p className="text-sidebar-foreground/40 uppercase text-[10px] font-semibold tracking-widest px-2 mb-2">
                {group.title}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href)
                  const Icon = item.icon
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onMobileClose}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                          active
                            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm shadow-primary/20'
                            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        )}
                      >
                        <Icon size={16} className="flex-shrink-0" />
                        <span className="flex-1 truncate">{item.title}</span>
                        {item.badge && (
                          <Badge variant="secondary" className="text-xs py-0 px-1.5">
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Role badge */}
        <div className="px-4 py-3 border-t border-sidebar-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
            <span className="text-sidebar-foreground/50 text-xs truncate">
              {profile.role === 'admin'
                ? '🔑 Administrator'
                : profile.role === 'general_affair'
                ? '🏢 General Affair'
                : '👤 User'}
            </span>
          </div>
        </div>
      </aside>
    </>
  )
}
