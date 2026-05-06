'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, RotateCcw, Undo2, Eye } from 'lucide-react'
import { DataTable } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoanStatusBadge } from './loan-status-badge'
import { GaLoansFilter } from './sub-components/ga-loans-filter'
import { GaLoansDialogs } from './sub-components/ga-loans-dialogs'
import { useGaLoans, type LoanWithJoins } from '@/hooks/loans/use-ga-loans'
import { formatDate } from '@/lib/utils'

interface GaLoansClientProps {
  isHistory?: boolean
}

export function GaLoansClient({ isHistory = false }: GaLoansClientProps) {
  const { state, handlers, queries, mutations } = useGaLoans(isHistory)

  const [detailLoan, setDetailLoan] = useState<LoanWithJoins | null>(null)
  const [approveTarget, setApproveTarget] = useState<LoanWithJoins | null>(null)
  const [rejectTarget, setRejectTarget] = useState<LoanWithJoins | null>(null)
  const [returnTarget, setReturnTarget] = useState<LoanWithJoins | null>(null)
  const [undoTarget, setUndoTarget] = useState<LoanWithJoins | null>(null)

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
            render: (_, row) => <span className="font-medium">{row.requester?.full_name ?? '—'}</span>,
          },
          { key: 'item', header: 'Barang', render: (_, row) => row.item?.name ?? '—' },
          { key: 'warehouse', header: 'Gudang', render: (_, row) => row.warehouse?.name ?? '—' },
          { key: 'quantity', header: 'Jml', render: (v) => <span className="font-semibold">{v as number}</span> },
          { key: 'loan_date', header: 'Tgl Pinjam', render: (v) => formatDate(v as string) },
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
            key: 'actions', header: 'Aksi', className: 'w-44 text-right',
            render: (_, row) => (
              <div className="flex gap-1 justify-end">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setDetailLoan(row)}><Eye size={16} /></Button>
                {row.status === 'pending' && (
                  <>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={() => setApproveTarget(row)}><CheckCircle2 size={16} /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setRejectTarget(row)}><XCircle size={16} /></Button>
                  </>
                )}
                {row.status === 'approved' && (
                  <Button variant="ghost" size="sm" className="h-8 text-blue-600 gap-1.5 px-2" onClick={() => setReturnTarget(row)}>
                    <RotateCcw size={14} /><span className="text-xs font-semibold">Kembalikan</span>
                  </Button>
                )}
                {row.status === 'returned' && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setUndoTarget(row)}><Undo2 size={14} /></Button>
                )}
              </div>
            ),
          },
        ]}
        data={queries.data?.data ?? []}
        isLoading={queries.isLoading}
        page={state.page}
        pageSize={state.PAGE_SIZE}
        totalCount={queries.data?.count ?? 0}
        onPageChange={handlers.setPage}
        searchValue={state.search}
        onSearchChange={(v) => { handlers.setSearch(v); handlers.setPage(1) }}
        searchPlaceholder="Cari tujuan peminjaman..."
        filters={
          <GaLoansFilter 
            isHistory={isHistory}
            statusFilter={state.statusFilter}
            setStatusFilter={(v) => { handlers.setStatusFilter(v); handlers.setPage(1) }}
            actionedByFilter={state.actionedByFilter}
            setActionedByFilter={(v) => { handlers.setActionedByFilter(v); handlers.setPage(1) }}
            handlers={queries.handlers}
          />
        }
        emptyText={isHistory ? "Belum ada riwayat peminjaman" : "Tidak ada peminjaman yang perlu ditangani"}
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
        onAction={handleAction}
        isPending={mutations.performAction.isPending}
      />
    </>
  )
}
