'use client'

import { useState } from 'react'
import { Plus, Trash2, Eye, MoreHorizontal, ClipboardList, Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

import { DataTable } from '@/components/shared/data-table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'

import { useStockOpnameGroups, useStockOpnameTemplates, useStockOpnameMutations } from '@/hooks/stock/use-stock-opname'
import { StockOpnameGroupDialog } from '@/components/warehouse-app/stock/sub-components/stock-opname-group-dialog'
import { StockOpnameTemplateDialog } from '@/components/warehouse-app/stock/sub-components/stock-opname-template-dialog'
import { StockOpnameTemplateDetailDialog } from '@/components/warehouse-app/stock/sub-components/stock-opname-template-detail-dialog'
import type { StockOpnameGroup, StockOpnameTemplate } from '@/types/database'
import { StockListFilter } from '@/components/warehouse-app/stock/sub-components/stock-list-filter'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useWarehouses } from '@/hooks/queries/use-warehouses'

export function StockOpnameClient() {
  const router = useRouter()
  const supabase = createClient()
  
  const { data: profile } = useQuery({
    queryKey: ['user_profile_for_opname'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      return data
    }
  })

  const { data: warehouses } = useWarehouses()

  const isAuthorized = profile?.role === 'admin' || profile?.role === 'general_affair'

  // Tab State
  const [activeTab, setActiveTab] = useState<'groups' | 'templates'>('groups')

  // Opname Groups State & Hooks
  const {
    page: groupPage, setPage: setGroupPage,
    search: groupSearch, setSearch: setGroupSearch,
    warehouseId: groupWarehouseId, setWarehouseId: setGroupWarehouseId,
    categoryId: groupCategoryId, setCategoryId: setGroupCategoryId,
    dateRange: groupDateRange, setDateRange: setGroupDateRange,
    data: groupData, isLoading: isGroupLoading, pageSize: groupPageSize
  } = useStockOpnameGroups()

  const [datePreset, setDatePreset] = useState('all')

  // Templates State & Hooks
  const {
    page: templatePage, setPage: setTemplatePage,
    search: templateSearch, setSearch: setTemplateSearch,
    warehouseId: templateWarehouseId, setWarehouseId: setTemplateWarehouseId,
    data: templateData, isLoading: isTemplateLoading, pageSize: templatePageSize
  } = useStockOpnameTemplates()

  const { deleteGroup, bulkDeleteGroups, deleteTemplate } = useStockOpnameMutations()

  // Dialog & Modal Control
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false)
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'group' | 'template' } | null>(null)
  
  const [editGroupData, setEditGroupData] = useState<{ id: string, name: string, description?: string | null } | null>(null)
  const [editTemplateData, setEditTemplateData] = useState<any | null>(null)
  const [detailTemplateData, setDetailTemplateData] = useState<StockOpnameTemplate | null>(null)

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'groups' | 'templates')}>
        <TabsList className="mb-4">
          <TabsTrigger value="groups">Group Opname</TabsTrigger>
          <TabsTrigger value="templates">Template Opname</TabsTrigger>
        </TabsList>

        <TabsContent value="groups">
          <DataTable
            columns={[
              { 
                key: 'name', 
                header: 'Nama Group',
                render: (v, row) => {
                  const query = groupWarehouseId && groupWarehouseId !== 'all' ? `?warehouseId=${groupWarehouseId}` : ''
                  return (
                    <button 
                      onClick={() => router.push(`/dashboard/stock-opname/${row.id}${query}`)}
                      className="font-bold text-red-600 hover:underline cursor-pointer text-left"
                    >
                      {v as string}
                    </button>
                  )
                }
              },
              { key: 'description', header: 'Deskripsi', render: (v) => v || '—' },
              {
                key: 'status',
                header: 'Status',
                render: (v) => (
                  <Badge variant={v === 'completed' ? 'success' : 'secondary'}>
                    {v === 'completed' ? 'Selesai' : 'Draft'}
                  </Badge>
                )
              },
              { key: 'creator', header: 'Dibuat Oleh', render: (_, row) => (row as any).creator?.full_name || '—' },
              { key: 'created_at', header: 'Tanggal', render: (v) => formatDateTime(v as string) },
              {
                key: 'actions', header: '', className: 'w-16 text-right',
                render: (_, row) => {
                  const group = row as StockOpnameGroup
                  return (
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" />}
                        >
                          <MoreHorizontal size={16} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => {
                            const query = groupWarehouseId && groupWarehouseId !== 'all' ? `?warehouseId=${groupWarehouseId}` : ''
                            router.push(`/dashboard/stock-opname/${group.id}${query}`)
                          }}>
                            <Eye size={14} className="mr-2 text-muted-foreground" /> Lihat Detail
                          </DropdownMenuItem>
                          {group.status === 'draft' && isAuthorized && (
                            <>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditGroupData({ id: group.id, name: group.name, description: group.description })
                                  setIsGroupDialogOpen(true)
                                }}
                              >
                                <Pencil size={14} className="mr-2 text-muted-foreground" /> Edit Group
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget({ id: group.id, type: 'group' })}
                                className="text-destructive focus:text-destructive focus:bg-red-50"
                              >
                                <Trash2 size={14} className="mr-2" /> Hapus Group
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )
                },
              },
            ]}
            data={groupData?.data ?? []}
            isLoading={isGroupLoading}
            page={groupPage}
            pageSize={groupPageSize}
            totalCount={groupData?.count ?? 0}
            onPageChange={setGroupPage}
            searchValue={groupSearch}
            onSearchChange={(v) => { setGroupSearch(v); setGroupPage(1) }}
            searchPlaceholder="Cari group opname..."
            filters={
              <StockListFilter 
                warehouseId={groupWarehouseId}
                setWarehouseId={(v) => { setGroupWarehouseId(v); setGroupPage(1) }}
                categoryId={groupCategoryId}
                setCategoryId={(v) => { setGroupCategoryId(v); setGroupPage(1) }}
                dateRange={groupDateRange}
                setDateRange={(v) => { setGroupDateRange(v); setGroupPage(1) }}
                datePreset={datePreset}
                setDatePreset={setDatePreset}
              />
            }
            onBulkDelete={isAuthorized ? (ids) => bulkDeleteGroups.mutate(ids) : undefined}
            actions={
              isAuthorized ? (
                <Button size="sm" onClick={() => {
                  setEditGroupData(null)
                  setIsGroupDialogOpen(true)
                }}>
                  <Plus size={14} className="mr-1.5" /> Buat Group Baru
                </Button>
              ) : undefined
            }
            emptyText="Belum ada group stock opname"
          />
        </TabsContent>

        <TabsContent value="templates">
          <DataTable
            columns={[
              {
                key: 'name',
                header: 'Nama Template',
                render: (v, row) => (
                  <button
                    onClick={() => setDetailTemplateData(row as StockOpnameTemplate)}
                    className="font-bold text-red-600 hover:underline cursor-pointer text-left"
                  >
                    {v as string}
                  </button>
                )
              },
              {
                key: 'warehouse', 
                header: 'Gudang Acuan', 
                render: (_, row) => (row as any).warehouse?.name || '—' 
              },
              { 
                key: 'items', 
                header: 'Jumlah Barang', 
                render: (_, row) => {
                  const itemCount = (row as any).items?.length ?? 0
                  return <Badge variant="secondary">{itemCount} barang</Badge>
                } 
              },
              { key: 'creator', header: 'Dibuat Oleh', render: (_, row) => (row as any).creator?.full_name || '—' },
              { key: 'created_at', header: 'Tanggal Dibuat', render: (v) => formatDateTime(v as string) },
              {
                key: 'actions', header: '', className: 'w-16 text-right',
                render: (_, row) => {
                  const template = row as StockOpnameTemplate
                  return (
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" />}
                        >
                          <MoreHorizontal size={16} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => setDetailTemplateData(template)}>
                            <Eye size={14} className="mr-2 text-muted-foreground" /> Lihat Detail
                          </DropdownMenuItem>
                          {isAuthorized && (
                            <>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditTemplateData(template)
                                  setIsTemplateDialogOpen(true)
                                }}
                              >
                                <Pencil size={14} className="mr-2 text-muted-foreground" /> Edit Template
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget({ id: template.id, type: 'template' })}
                                className="text-destructive focus:text-destructive focus:bg-red-50"
                              >
                                <Trash2 size={14} className="mr-2" /> Hapus Template
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )
                },
              },
            ]}
            data={templateData?.data ?? []}
            isLoading={isTemplateLoading}
            page={templatePage}
            pageSize={templatePageSize}
            totalCount={templateData?.count ?? 0}
            onPageChange={setTemplatePage}
            searchValue={templateSearch}
            onSearchChange={(v) => { setTemplateSearch(v); setTemplatePage(1) }}
            searchPlaceholder="Cari template..."
            filters={
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="space-y-1.5 w-full sm:w-64">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gudang</Label>
                  <Select 
                    value={templateWarehouseId} 
                    onValueChange={(v) => { setTemplateWarehouseId(v); setTemplatePage(1) }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Semua Gudang" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Gudang</SelectItem>
                      {warehouses?.map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            }
            actions={
              isAuthorized ? (
                <Button size="sm" onClick={() => {
                  setEditTemplateData(null)
                  setIsTemplateDialogOpen(true)
                }}>
                  <Plus size={14} className="mr-1.5" /> Buat Template
                </Button>
              ) : undefined
            }
            emptyText="Belum ada template stock opname"
          />
        </TabsContent>
      </Tabs>

      <StockOpnameGroupDialog
        open={isGroupDialogOpen}
        onOpenChange={(open) => {
          setIsGroupDialogOpen(open)
          if (!open) setEditGroupData(null)
        }}
        initialData={editGroupData}
      />

      <StockOpnameTemplateDialog
        open={isTemplateDialogOpen}
        onOpenChange={(open) => {
          setIsTemplateDialogOpen(open)
          if (!open) setEditTemplateData(null)
        }}
        initialData={editTemplateData}
      />

      <StockOpnameTemplateDetailDialog
        open={!!detailTemplateData}
        onOpenChange={(open) => { if (!open) setDetailTemplateData(null) }}
        template={detailTemplateData}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={deleteTarget?.type === 'group' ? 'Hapus Group Opname' : 'Hapus Template Opname'}
        description={
          deleteTarget?.type === 'group'
            ? 'Apakah Anda yakin ingin menghapus group opname ini? Semua data di dalamnya akan ikut terhapus.'
            : 'Apakah Anda yakin ingin menghapus template opname ini? Template tidak dapat dikembalikan.'
        }
        onConfirm={() => {
          if (!deleteTarget) return
          if (deleteTarget.type === 'group') {
            deleteGroup.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
          } else {
            deleteTemplate.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
          }
        }}
        loading={deleteGroup.isPending || deleteTemplate.isPending}
      />
    </div>
  )
}

