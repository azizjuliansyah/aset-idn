'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, RotateCcw, Undo2, Eye, Trash2, MoreHorizontal, MessageSquareWarning, Plus } from 'lucide-react'
import { DataTable } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LoanStatusBadge } from './loan-status-badge'
import { GaLoansFilter } from './sub-components/ga-loans-filter'
import { GaLoansDialogs } from './sub-components/ga-loans-dialogs'
import { useGaLoans, type LoanWithJoins } from '@/hooks/loans/use-ga-loans'
import { LoanRequestDialog } from './loan-request-dialog'
import { formatDateTime } from '@/lib/utils'

interface GaLoansClientProps {
  isHistory?: boolean
}

const EMPTY_LOANS: LoanWithJoins[] = []

export function GaLoansClient({ isHistory = false }: GaLoansClientProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const { state, handlers, queries, mutations } = useGaLoans(isHistory, selectedIds)

  const [detailLoan, setDetailLoan] = useState<LoanWithJoins | null>(null)
  const [approveTarget, setApproveTarget] = useState<LoanWithJoins | null>(null)
  const [rejectTarget, setRejectTarget] = useState<LoanWithJoins | null>(null)
  const [returnTarget, setReturnTarget] = useState<LoanWithJoins | null>(null)
  const [undoTarget, setUndoTarget] = useState<LoanWithJoins | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LoanWithJoins | null>(null)
  const [remindTarget, setRemindTarget] = useState<LoanWithJoins | null>(null)
  const [remindOverdueTarget, setRemindOverdueTarget] = useState<LoanWithJoins | null>(null)
  const [overdueConfirm, setOverdueConfirm] = useState(false)
  const [requestOpen, setRequestOpen] = useState(false)

  const handleAction = (id: string, action: string, extra?: any) => {
    mutations.performAction.mutate({ id, action, extra }, {
      onSuccess: () => {
        setApproveTarget(null)
        setRejectTarget(null)
        setReturnTarget(null)
        setUndoTarget(null)
      }
    })
  }

  return (
    <>
      <DataTable
        columns={[
          {
            key: 'requester', header: 'Peminjam',
            render: (_, row) => (
              <div className="flex flex-col">
                <span className="font-medium">{row.atas_nama || row.requester?.full_name || '—'}</span>
                {row.is_by_ga && row.atas_nama && (
                  <span className="text-[10px] text-muted-foreground italic">(Oleh: {row.requester?.full_name})</span>
                )}
              </div>
            ),
          },
          { 
            key: 'items', 
            header: 'Barang', 
            render: (_, row) => (
              <div className="flex flex-col gap-0.5">
                {row.items?.slice(0, 2).map((item, i) => (
                  <div key={i} className="text-sm truncate max-w-[200px]">
                    {item.item?.name}
                  </div>
                ))}
                {(row.items?.length ?? 0) > 2 && (
                  <div className="text-[10px] text-muted-foreground">
                    +{(row.items?.length ?? 0) - 2} barang lainnya
                  </div>
                )}
              </div>
            )
          },
          { 
            key: 'quantity', 
            header: 'Total Jml', 
            render: (_, row) => {
              const total = row.items?.reduce((acc, item) => acc + (item.quantity || 0), 0) ?? 0
              return <span className="font-semibold">{total}</span>
            } 
          },
          { key: 'loan_date', header: 'Waktu Pinjam', render: (v) => formatDateTime(v as string) },
          { 
            key: 'return_date', 
            header: isHistory ? 'Waktu Dikembalikan' : 'Batas Kembali',
            render: (_, item: LoanWithJoins) => {
              if (isHistory) {
                return item.actual_return_date ? formatDateTime(item.actual_return_date) : '-'
              }
              
              const returnDate = item.return_date ? new Date(item.return_date) : null
              const now = new Date()
              const threeDaysLater = new Date()
              threeDaysLater.setDate(now.getDate() + 3)

              let dotColor = 'bg-emerald-500' 
              if (returnDate) {
                if (returnDate < now) {
                  dotColor = 'bg-destructive animate-pulse'
                } else if (returnDate <= threeDaysLater) {
                  dotColor = 'bg-amber-500'
                }
              }

              return (
                <div className="flex items-center gap-2">
                  {item.status === 'approved' && (
                    <div className={`size-2 rounded-full ${dotColor}`} />
                  )}
                  <span>{item.return_date ? formatDateTime(item.return_date) : '-'}</span>
                </div>
              )
            }
          },
          {
            key: 'status', header: 'Status',
            render: (_, row) => {
              const isApprovedOrReturned = row.status === 'approved' || row.status === 'returned'
              return (
                <div className="flex flex-col gap-1.5">
                  <LoanStatusBadge status={isApprovedOrReturned ? 'approved' : row.status} />
                  {isApprovedOrReturned && (
                    <div className="flex items-center gap-2">
                      {row.status === 'returned' ? (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 gap-1 border-blue-200 text-[10px]">
                          <RotateCcw size={10} /> Sudah Kembali
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-700 border-amber-300 gap-1 text-[10px]">
                          <CheckCircle2 size={10} className="opacity-50" /> Belum Kembali
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              )
            },
          },
          {
            key: 'actions', header: '', className: 'w-16 text-right',
            render: (_, row) => (
              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger 
                    render={<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" />}
                  >
                    <MoreHorizontal size={16} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setDetailLoan(row)}>
                      <Eye size={14} className="mr-2 text-muted-foreground" /> Detail Peminjaman
                    </DropdownMenuItem>
                    
                    {row.status === 'pending' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setApproveTarget(row)} className="text-green-600 focus:text-green-600 focus:bg-green-50">
                          <CheckCircle2 size={14} className="mr-2" /> Setujui Peminjaman
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setRejectTarget(row)} className="text-destructive focus:text-destructive focus:bg-red-50">
                          <XCircle size={14} className="mr-2" /> Tolak Peminjaman
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    {row.status === 'approved' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setRemindTarget(row)} className="text-amber-600 focus:text-amber-600 focus:bg-amber-50">
                          <MessageSquareWarning size={14} className="mr-2" /> Ingatkan Pengembalian
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setRemindOverdueTarget(row)} className="text-destructive focus:text-destructive focus:bg-red-50 font-medium">
                          <MessageSquareWarning size={14} className="mr-2" /> Kirim Pengingat Terlambat
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setReturnTarget(row)} className="text-blue-600 focus:text-blue-600 focus:bg-blue-50">
                          <RotateCcw size={14} className="mr-2" /> Tandai Dikembalikan
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    {row.status === 'returned' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setUndoTarget(row)}>
                          <Undo2 size={14} className="mr-2 text-muted-foreground" /> Batalkan Kembali
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    {!isHistory && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setDeleteTarget(row)} className="text-destructive focus:text-destructive focus:bg-red-50">
                          <Trash2 size={14} className="mr-2" /> Hapus Peminjaman
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ),
          },
        ]}
        data={queries.data?.data ?? EMPTY_LOANS}
        isLoading={queries.isLoading}
        page={state.page}
        pageSize={state.PAGE_SIZE}
        totalCount={queries.data?.count ?? 0}
        onPageChange={handlers.setPage}
        searchValue={state.search}
        onSearchChange={(v) => { handlers.setSearch(v); handlers.setPage(1) }}
        searchPlaceholder="Cari nama peminjam..."
        actions={!isHistory && (
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => setOverdueConfirm(true)} 
              className="h-9 gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50" 
              size="sm"
            >
              <MessageSquareWarning size={16} /> Kirim Pengingat Terlambat {queries.validSelectedCount > 0 && `(${queries.validSelectedCount})`}
            </Button>
            <Button onClick={() => setRequestOpen(true)} className="h-9 gap-1.5" size="sm">
              <Plus size={16} /> Pinjam Barang
            </Button>
          </div>
        )}
        filters={
          <GaLoansFilter 
            isHistory={isHistory}
            statusFilter={state.statusFilter}
            setStatusFilter={(v) => { handlers.setStatusFilter(v); handlers.setPage(1) }}
            actionedByFilter={state.actionedByFilter}
            setActionedByFilter={(v) => { handlers.setActionedByFilter(v); handlers.setPage(1) }}
            handlers={queries.handlers}
            warehouseId={state.warehouseId}
            setWarehouseId={(v) => { handlers.setWarehouseId(v); handlers.setPage(1) }}
            datePreset={state.datePreset}
            setDatePreset={(v) => { handlers.setDatePreset(v); handlers.setPage(1) }}
            customStartDate={state.customStartDate}
            setCustomStartDate={(v) => { handlers.setCustomStartDate(v); handlers.setPage(1) }}
            customEndDate={state.customEndDate}
            setCustomEndDate={(v) => { handlers.setCustomEndDate(v); handlers.setPage(1) }}
            returnDatePreset={state.returnDatePreset}
            setReturnDatePreset={(v) => { handlers.setReturnDatePreset(v); handlers.setPage(1) }}
            returnCustomStartDate={state.returnCustomStartDate}
            setReturnCustomStartDate={(v) => { handlers.setReturnCustomStartDate(v); handlers.setPage(1) }}
            returnCustomEndDate={state.returnCustomEndDate}
            setReturnCustomEndDate={(v) => { handlers.setReturnCustomEndDate(v); handlers.setPage(1) }}
            dueFilter={state.dueFilter}
            setDueFilter={(v) => { handlers.setDueFilter(v); handlers.setPage(1) }}
          />
        }
        emptyText={isHistory ? "Belum ada riwayat peminjaman" : "Tidak ada peminjaman yang perlu ditangani"}
        onBulkDelete={!isHistory ? (ids) => mutations.deleteBulkLoans.mutate(ids) : undefined}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
      />

      <GaLoansDialogs 
        detailLoan={detailLoan}
        setDetailLoan={setDetailLoan}
        approveTarget={approveTarget}
        setApproveTarget={setApproveTarget}
        rejectTarget={rejectTarget}
        setRejectTarget={setRejectTarget}
        returnTarget={returnTarget}
        setReturnTarget={setReturnTarget}
        undoTarget={undoTarget}
        setUndoTarget={setUndoTarget}
        deleteTarget={deleteTarget}
        setDeleteTarget={setDeleteTarget}
        remindTarget={remindTarget}
        setRemindTarget={setRemindTarget}
        remindOverdueTarget={remindOverdueTarget}
        setRemindOverdueTarget={setRemindOverdueTarget}
        overdueConfirm={overdueConfirm}
        setOverdueConfirm={setOverdueConfirm}
        onAction={handleAction}
        onDelete={(id) => mutations.deleteLoan.mutate(id, { onSuccess: () => setDeleteTarget(null) })}
        onRemind={(id) => mutations.remindLoan.mutate(id, { onSuccess: () => setRemindTarget(null) })}
        onRemindOverdueSingle={(id) => mutations.remindOverdue.mutate(id, { onSuccess: () => setRemindOverdueTarget(null) })}
        onRemindOverdue={() => mutations.remindOverdue.mutate(selectedIds.length > 0 ? selectedIds : undefined, { 
          onSuccess: () => {
            setOverdueConfirm(false)
            setSelectedIds([])
          } 
        })}
        selectedCount={queries.validSelectedCount}
        overdueCount={queries.overdueCount}
        isPending={mutations.performAction.isPending}
        isDeleting={mutations.deleteLoan.isPending}
        isReminding={mutations.remindLoan.isPending}
        isRemindingOverdue={mutations.remindOverdue.isPending}
      />

      <LoanRequestDialog open={requestOpen} onOpenChange={setRequestOpen} />
    </>
  )
}
