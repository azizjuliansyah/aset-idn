'use client'

import { useState, useEffect, ReactElement } from 'react'
import { Search, Users, Loader2, Check } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export type WatzapGroup = {
  id: string
  name: string
}

interface WaGroupSelectorProps {
  selectedGroups: WatzapGroup[]
  onSelect: (groups: WatzapGroup[]) => void
  trigger: ReactElement
}

export function WaGroupSelector({ selectedGroups, onSelect, trigger }: WaGroupSelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchGroup, setSearchGroup] = useState('')
  const [tempSelectedGroups, setTempSelectedGroups] = useState<WatzapGroup[]>(selectedGroups)

  // Fetch groups from our API
  const { data: groupsData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['watzap_groups'],
    queryFn: async () => {
      const res = await fetch('/api/admin/whatsapp/groups', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengambil grup')
      }
      return data as { groups: WatzapGroup[] }
    },
    enabled: open, // Only fetch when dialog opens
  })

  // Sync temp selection when dialog opens or selectedGroups changes
  useEffect(() => {
    if (open) {
      setTempSelectedGroups(selectedGroups)
      setSearchGroup('')
    }
  }, [open, selectedGroups])

  const groups = Array.isArray(groupsData?.groups) ? groupsData.groups : []
  const filteredGroups = groups.filter(g => 
    g.name?.toLowerCase().includes(searchGroup.toLowerCase()) ||
    g.id?.toLowerCase().includes(searchGroup.toLowerCase())
  )

  const toggleGroup = (group: WatzapGroup) => {
    if (tempSelectedGroups.some(g => g.id === group.id)) {
      setTempSelectedGroups(prev => prev.filter(g => g.id !== group.id))
    } else {
      setTempSelectedGroups(prev => [...prev, group])
    }
  }

  const handleSave = () => {
    onSelect(tempSelectedGroups)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-w-md p-0 overflow-hidden gap-0 flex flex-col h-[85vh] max-h-[600px]">
        <DialogHeader className="px-6 py-4 mb-0 border-b flex-none mx-0 mt-0">
          <DialogTitle>Daftar Grup WhatsApp</DialogTitle>
        </DialogHeader>
        
        <div className="p-6 pb-0 space-y-4 flex-1 flex flex-col min-h-0">
          <div className="relative flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
            <Input 
              placeholder="Cari nama grup..." 
              className="pl-9"
              value={searchGroup}
              onChange={(e) => setSearchGroup(e.target.value)}
            />
          </div>

          <ScrollArea className="flex-1 min-h-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full space-y-3 py-10 text-muted-foreground">
                <Loader2 className="animate-spin" size={24} />
                <p className="text-sm">Mengambil data grup...</p>
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center py-10 text-destructive text-center px-4">
                <Users size={32} className="mb-2 opacity-20" />
                <p className="text-sm font-medium">Gagal memuat grup</p>
                <p className="text-xs opacity-80 mt-1">{(error as Error)?.message || 'Terjadi kesalahan pada server'}</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
                  Coba Lagi
                </Button>
              </div>
            ) : filteredGroups.length > 0 ? (
              <div className="space-y-1 pb-6">
                {filteredGroups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted text-left transition-colors group"
                    onClick={() => toggleGroup(group)}
                  >
                    <div className="min-w-0 pr-4">
                      <p className="font-medium text-sm truncate">{group.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{group.id}</p>
                    </div>
                    {tempSelectedGroups.some(g => g.id === group.id) && (
                      <div className="h-5 w-5 bg-primary rounded-full flex items-center justify-center flex-none">
                        <Check size={12} className="text-primary-foreground" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Users size={32} className="mb-2 opacity-20" />
                <p className="text-sm">Grup tidak ditemukan</p>
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="p-4 border-t bg-muted/30 flex-none flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            {tempSelectedGroups.length} grup dipilih
          </div>
          <Button size="sm" onClick={handleSave}>Simpan Pilihan</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
