'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { formatDateTime, cn } from "@/lib/utils"
import { 
  User, 
  Activity, 
  Database, 
  Globe, 
  Clock, 
  Info,
  Smartphone,
  Hash,
  Terminal,
  UserCircle,
  Monitor,
  Copy,
  Check
} from 'lucide-react'

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useState } from "react"

interface LogDetailModalProps {
  log: any | null
  isOpen: boolean
  onClose: () => void
  getActionColor: (action: string) => string
  getEntityIcon: (type: string) => React.ReactNode
}

export function LogDetailModal({ 
  log, 
  isOpen, 
  onClose,
  getActionColor,
  getEntityIcon
}: LogDetailModalProps) {
  const [copied, setCopied] = useState(false)
  if (!log) return null

  const details = log.details || {}

  const handleCopy = () => {
    const jsonString = JSON.stringify(details, null, 2)
    navigator.clipboard.writeText(jsonString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const InfoRow = ({ label, value, icon: Icon }: { label: string, value: React.ReactNode, icon: any }) => (
    <tr className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
      <td className="py-5 px-10 w-[240px] align-top">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase  text-muted-foreground">
          <Icon size={14} className="text-primary/70" />
          {label}
        </div>
      </td>
      <td className="py-5 px-10 align-top">
        <div className="text-sm font-medium break-words whitespace-normal max-w-full overflow-hidden">
          {value}
        </div>
      </td>
    </tr>
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl h-[85vh] sm:h-[80vh] flex flex-col p-0 gap-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="bg-muted/20 border-b m-0">
            <DialogTitle className="text-xl font-semibold flex items-center">
              Detail Log Aktivitas
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn("font-bold text-[10px] px-2 py-0.5", getActionColor(log.action))}>
                {log.action}
              </Badge>
              <div className="flex items-center text-[10px] font-bold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md border border-border/50 uppercase tracking-tight">
                {getEntityIcon(log.entity_type)}
                {log.entity_type}
              </div>
            </div>
          </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-0">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="py-4 px-10 text-left text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 w-[240px]">Informasi</th>
                  <th className="py-4 px-10 text-left text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">Konten</th>
                </tr>
              </thead>
              <tbody>
                <InfoRow 
                  label="Pelaku Aksi" 
                  icon={UserCircle}
                  value={
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black border border-primary/20">
                        {log.user?.full_name?.[0] || 'U'}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-base leading-tight">{log.user?.full_name || 'System'}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-[9px] font-semibold bg-primary/10 text-primary uppercase h-4 px-1.5">{log.user?.role || 'user'}</Badge>
                          <span className="text-[11px] text-muted-foreground font-medium">{log.user?.email || ''}</span>
                        </div>
                      </div>
                    </div>
                  } 
                />
                <InfoRow 
                  label="Waktu Kejadian" 
                  icon={Clock}
                  value={
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm">{formatDateTime(log.created_at)}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold mt-0.5">Western Indonesia Time (WIB)</span>
                    </div>
                  } 
                />
                <InfoRow 
                  label="Alamat IP" 
                  icon={Globe}
                  value={<code className="bg-muted px-2 py-1 rounded text-primary font-semibold text-xs">{log.ip_address || '—'}</code>} 
                />
                <InfoRow 
                  label="User Agent" 
                  icon={Monitor}
                  value={<span className="text-xs font-mono text-muted-foreground leading-relaxed break-all">{log.user_agent || 'Unknown'}</span>} 
                />
                {log.entity_id && (
                  <InfoRow 
                    label="ID Entitas" 
                    icon={Hash}
                    value={<code className="bg-primary/5 text-primary px-2 py-1 rounded font-semibold text-xs border border-primary/10 select-all">{log.entity_id}</code>} 
                  />
                )}
                <InfoRow 
                  label="Data Payload" 
                  icon={Terminal}
                  value={
                    <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-xl group my-2">
                      <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">JSON Response</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors group/copy"
                          >
                            {copied ? (
                              <>
                                <Check size={10} className="text-emerald-500" />
                                <span className="text-emerald-500">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={10} className="group-hover/copy:scale-110 transition-transform" />
                                <span>Copy JSON</span>
                              </>
                            )}
                          </button>
                          <div className="flex gap-1.5 ml-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-rose-500/30" />
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/30" />
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/30" />
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <pre className="text-[11px] leading-relaxed font-mono text-slate-300 custom-scrollbar overflow-y-auto whitespace-pre-wrap break-all max-h-[400px]">
                          {JSON.stringify(details, null, 2)}
                        </pre>
                      </div>
                    </div>
                  } 
                />
                {details.note && (
                  <InfoRow 
                    label="Catatan" 
                    icon={Info}
                    value={
                      <div className="p-4 bg-amber-50/50 border border-amber-200/50 rounded-xl relative overflow-hidden my-1">
                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-400" />
                        <p className="text-xs text-amber-900 leading-relaxed font-medium italic">"{details.note}"</p>
                      </div>
                    } 
                  />
                )}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
