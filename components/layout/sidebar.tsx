'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { navGroups } from './nav-config'
import type { Profile } from '@/types/database'
import type { AppRole } from './nav-config'
import { Warehouse, X, ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface SidebarProps {
  profile: Profile
  companyName?: string
  logoUrl?: string
  mobileOpen?: boolean
  desktopOpen?: boolean
  onMobileClose?: () => void
}

export function Sidebar({ profile, companyName, logoUrl, mobileOpen, desktopOpen = true, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

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

  const filteredGroups = useMemo(() => {
    return navGroups.map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.roles || item.roles.includes(profile.role as AppRole)
      ),
    })).filter(
      (group) =>
        group.items.length > 0 &&
        (!group.roles || group.roles.includes(profile.role as AppRole))
    )
  }, [profile.role])

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('sidebar_collapsed_groups')
    if (saved) {
      try {
        setCollapsedGroups(JSON.parse(saved))
      } catch (e) {
        // ignore
      }
    }
  }, [])

  // Auto-expand any group that contains the currently active item
  useEffect(() => {
    const activeGroup = filteredGroups.find(group => 
      group.items.some(item => isActive(item.href))
    )
    if (activeGroup) {
      setCollapsedGroups(prev => {
        if (prev[activeGroup.title] === true) {
          const updated = { ...prev, [activeGroup.title]: false }
          localStorage.setItem('sidebar_collapsed_groups', JSON.stringify(updated))
          return updated
        }
        return prev
      })
    }
  }, [pathname, filteredGroups])

  const toggleGroup = (groupTitle: string) => {
    setCollapsedGroups(prev => {
      const updated = { ...prev, [groupTitle]: !prev[groupTitle] }
      localStorage.setItem('sidebar_collapsed_groups', JSON.stringify(updated))
      return updated
    })
  }

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
          'transition-all duration-300 ease-in-out',
          'lg:relative',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          desktopOpen ? 'lg:translate-x-0 lg:ml-0' : 'lg:-translate-x-full lg:-ml-64'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-20 border-b border-sidebar-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm overflow-hidden border border-sidebar-border/50 flex-shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1.5" />
              ) : (
                <Warehouse size={20} className="text-primary" />
              )}
            </div>
            <div className="flex flex-col justify-center min-w-0">
              <p className="text-sidebar-foreground font-bold text-[13px] leading-tight break-words">
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
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {filteredGroups.map((group) => {
            const isCollapsed = collapsedGroups[group.title] === true
            return (
              <div key={group.title} className="flex flex-col">
                <button
                  onClick={() => toggleGroup(group.title)}
                  className={cn(
                    "w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors duration-150 group",
                    "text-sidebar-foreground/45 hover:text-sidebar-foreground/80 hover:bg-sidebar-accent/40"
                  )}
                >
                  <span className="uppercase text-[10px] font-bold tracking-widest">
                    {group.title}
                  </span>
                  <ChevronDown
                    size={14}
                    className={cn(
                      "transition-transform duration-200 text-sidebar-foreground/30 group-hover:text-sidebar-foreground/60",
                      isCollapsed ? "-rotate-90" : "rotate-0"
                    )}
                  />
                </button>

                <div
                  className={cn(
                    "grid transition-all duration-200 ease-in-out",
                    isCollapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
                  )}
                >
                  <div className="overflow-hidden min-h-0">
                    <ul className="space-y-0.5 mt-1.5">
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
                </div>
              </div>
            )
          })}
        </nav>

      </aside>
    </>
  )
}
