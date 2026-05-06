'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Eye, AlertTriangle } from 'lucide-react'
import { DataTable } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { ItemDetailModal } from './item-detail-modal'
import { ItemsFilter } from './sub-components/items-filter'
import { ItemsDialogs } from './sub-components/items-dialogs'
import { useItemsManager, type ItemWithJoins } from '@/hooks/items/use-items-manager'
import { formatCurrency, cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

export function ItemsClient() {
  const { state, handlers, queries, mutations } = useItemsManager()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<ItemWithJoins | null>(null)
  const [deleteItem, setDeleteItem] = useState<ItemWithJoins | null>(null)
  const [viewItemId, setViewItemId] = useState<string | null>(null)
  
  const supabase = createClient()

  const openCreate = () => {
    setEditItem(null)
    setDialogOpen(true)
  }

  const openEdit = async (item: ItemWithJoins) => {
    // Fetch full item to ensure IDs are available
    const { data: fullItem, error } = await supabase
      .from('items')
      .select('*')
      .eq('id', item.id)
      .single()
    
    if (error) {
      console.error('Error fetching full item:', error)
      toast.error('Gagal memuat data lengkap barang')
    }

    setEditItem((fullItem || item) as ItemWithJoins)
    setDialogOpen(true)
  }

  return (
    <>
      <DataTable
        columns={[
          { 
            key: 'name', header: 'Nama Barang',
            render: (v, row) => (
              <button 
                onClick={() => setViewItemId(row.id)}
                className="font-bold text-primary hover:underline text-left"
              >
                {v as string}
              </button>
            )
          },
          { key: 'category_name', header: 'Kategori', render: (v) => (v as string) ?? '—' },
          { key: 'price', header: 'Harga', render: (v) => formatCurrency(v as number) },
          {
            key: 'current_stock', header: 'Stok',
            render: (v, row) => (
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "font-bold",
                  (v as number) === 0 ? "text-destructive" : 
                  (v as number) <= row.minimum_stock ? "text-amber-600" : "text-green-600"
                )}>
                  {v as number}
                </span>
                {(v as number) <= row.minimum_stock && (v as number) > 0 && <AlertTriangle size={12} className="text-amber-500" />}
              </div>
            ),
          },
          {
            key: 'minimum_stock', header: 'Min. Stok',
            render: (v) => (
              <span className="flex items-center gap-1 text-sm">
                {v as number}
                {(v as number) === 0 && <AlertTriangle size={12} className="text-amber-500" />}
              </span>
            ),
          },
          {
            key: 'actions', header: '', className: 'w-24 text-right',
            render: (_, row) => (
              <div className="flex gap-1 justify-end">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => setViewItemId(row.id)}><Eye size={13} /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(row)}><Pencil size={13} /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteItem(row)}><Trash2 size={13} /></Button>
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
        onBulkDelete={(ids) => mutations.bulkDelete.mutate(ids)}
        searchValue={state.search}
        onSearchChange={(v) => { handlers.setSearch(v); handlers.setPage(1) }}
        searchPlaceholder="Cari barang..."
        actions={<Button size="sm" onClick={openCreate}><Plus size={14} className="mr-1.5" /> Tambah Barang</Button>}
        filters={
          <ItemsFilter 
            warehouseId={state.warehouseId} 
            setWarehouseId={(v) => { handlers.setWarehouseId(v); handlers.setPage(1) }}
            categoryId={state.categoryId}
            setCategoryId={(v) => { handlers.setCategoryId(v); handlers.setPage(1) }}
            conditionId={state.conditionId}
            setConditionId={(v) => { handlers.setConditionId(v); handlers.setPage(1) }}
            stockStatus={state.stockStatus}
            setStockStatus={(v) => { handlers.setStockStatus(v); handlers.setPage(1) }}
          />
        }
        emptyText="Belum ada barang"
      />

      <ItemsDialogs 
        editItem={editItem}
        deleteItem={deleteItem}
        dialogOpen={dialogOpen}
        setDialogOpen={setDialogOpen}
        setDeleteItem={setDeleteItem}
        onSave={(values) => mutations.save.mutate({ id: editItem?.id, values }, { onSuccess: () => setDialogOpen(false) })}
        onDelete={() => mutations.delete.mutate(deleteItem!.id, { onSuccess: () => setDeleteItem(null) })}
        isSaving={mutations.save.isPending}
        isDeleting={mutations.delete.isPending}
      />

      <ItemDetailModal 
        itemId={viewItemId} 
        onOpenChange={(open) => !open && setViewItemId(null)} 
      />
    </>
  )
}
