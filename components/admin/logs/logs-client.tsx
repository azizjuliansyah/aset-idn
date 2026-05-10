'use client'

import * as React from 'react'
import { DataTable } from '@/components/shared/data-table'
import { Badge } from '@/components/ui/badge'
import { useLogsManager } from '@/hooks/admin/use-logs-manager'
import { formatDateTime, cn } from '@/lib/utils'
import { 
  User, 
  Activity, 
  Database, 
  Clock, 
  Info,
  Eye,
  Globe,
  Smartphone
} from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LogDetailModal } from './log-detail-modal'

export function LogsClient() {
  const { state, handlers, queries } = useLogsManager()
  const [selectedLog, setSelectedLog] = React.useState<any | null>(null)

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-green-100 text-green-700 border-green-200'
      case 'UPDATE': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'DELETE': return 'bg-red-100 text-red-700 border-red-200'
      case 'APPROVE': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'REJECT': return 'bg-rose-100 text-rose-700 border-rose-200'
      case 'LOAN': return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'RETURN': return 'bg-cyan-100 text-cyan-700 border-cyan-200'
      case 'REMINDER': return 'bg-amber-100 text-amber-700 border-amber-200'
      default: return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'ITEM':
      case 'ITEM_CATEGORY':
      case 'ITEM_STATUS':
      case 'ITEM_CONDITION':
      case 'STOCK_IN':
      case 'STOCK_OUT':
        return <Database size={12} className="mr-1" />
      case 'LOAN_REQUEST': return <Activity size={12} className="mr-1" />
      case 'USER': return <User size={12} className="mr-1" />
      case 'WAREHOUSE': return <Globe size={12} className="mr-1" />
      case 'SETTING': return <Smartphone size={12} className="mr-1" />
      default: return <Info size={12} className="mr-1" />
    }
  }

  return (
    <div className="space-y-4">
      <DataTable
        columns={[
          {
            key: 'created_at',
            header: 'Waktu',
            className: 'w-[180px]',
            render: (v) => (
              <div className="flex flex-col">
                <span className="font-medium text-sm">{formatDateTime(v as string)}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-tight">WIB</span>
              </div>
            )
          },
          {
            key: 'user',
            header: 'Pengguna',
            render: (_, row: any) => (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                  {row.user?.full_name?.[0] || 'U'}
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{row.user?.full_name || 'System'}</span>
                  <span className="text-[10px] text-muted-foreground uppercase">{row.user?.role || 'user'}</span>
                </div>
              </div>
            )
          },
          {
            key: 'action',
            header: 'Aksi',
            render: (v) => (
              <Badge variant="outline" className={cn("font-bold text-[10px] px-2 py-0.5", getActionColor(v as string))}>
                {v as string}
              </Badge>
            )
          },
          {
            key: 'entity_type',
            header: 'Entitas',
            render: (v) => (
              <div className="flex items-center text-xs font-medium text-muted-foreground">
                {getEntityIcon(v as string)}
                {v as string}
              </div>
            )
          },
          {
            key: 'details',
            header: 'Detail',
            render: (v, row: any) => {
              const details = v as any
              if (!details) return <span className="text-muted-foreground italic text-xs">—</span>
              
              return (
                <div className="flex items-center gap-2 max-w-[300px]">
                  <span className="text-xs truncate text-muted-foreground flex-1">
                    {details.name || details.item_name || details.purpose || JSON.stringify(details).substring(0, 50)}
                  </span>
                  <button 
                    onClick={() => setSelectedLog(row)}
                    className="p-1.5 hover:bg-muted rounded-md text-primary transition-colors"
                    title="Lihat Detail"
                  >
                    <Eye size={14} />
                  </button>
                </div>
              )
            }
          }
        ]}
        data={queries.data?.data ?? []}
        isLoading={queries.isLoading}
        page={state.page}
        pageSize={state.PAGE_SIZE}
        totalCount={queries.data?.count ?? 0}
        onPageChange={handlers.setPage}
        searchValue={state.search}
        onSearchChange={(v) => { handlers.setSearch(v); handlers.setPage(1) }}
        searchPlaceholder="Cari log..."
        filters={
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Aksi</Label>
              <Select value={state.actionFilter} onValueChange={(v) => { handlers.setActionFilter(v); handlers.setPage(1) }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Semua Aksi" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Aksi</SelectItem>
                  <SelectItem value="CREATE">CREATE</SelectItem>
                  <SelectItem value="UPDATE">UPDATE</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                  <SelectItem value="APPROVE">APPROVE</SelectItem>
                  <SelectItem value="REJECT">REJECT</SelectItem>
                  <SelectItem value="LOAN">LOAN</SelectItem>
                  <SelectItem value="RETURN">RETURN</SelectItem>
                  <SelectItem value="REMINDER">REMINDER</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Entitas</Label>
              <Select value={state.entityFilter} onValueChange={(v) => { handlers.setEntityFilter(v); handlers.setPage(1) }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Semua Entitas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Entitas</SelectItem>
                  <SelectItem value="ITEM">ITEM</SelectItem>
                  <SelectItem value="ITEM_CATEGORY">ITEM_CATEGORY</SelectItem>
                  <SelectItem value="ITEM_STATUS">ITEM_STATUS</SelectItem>
                  <SelectItem value="ITEM_CONDITION">ITEM_CONDITION</SelectItem>
                  <SelectItem value="LOAN_REQUEST">LOAN_REQUEST</SelectItem>
                  <SelectItem value="WAREHOUSE">WAREHOUSE</SelectItem>
                  <SelectItem value="STOCK_IN">STOCK_IN</SelectItem>
                  <SelectItem value="STOCK_OUT">STOCK_OUT</SelectItem>
                  <SelectItem value="USER">USER</SelectItem>
                  <SelectItem value="SETTING">SETTING</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        }
        emptyText="Belum ada log aktivitas"
      />

      <LogDetailModal 
        log={selectedLog}
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        getActionColor={getActionColor}
        getEntityIcon={getEntityIcon}
      />
    </div>
  )
}
