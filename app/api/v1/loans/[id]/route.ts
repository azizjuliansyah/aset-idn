import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { action, ...extra } = body

    if (action) {
      let updateData: any = {}
      
      switch (action) {
        case 'approve':
          updateData = {
            status: 'approved',
            actioned_by: user.id
          }
          if (extra.return_date) {
            // Use the timestamp provided by the client (datetime-local format)
            updateData.return_date = new Date(extra.return_date).toISOString()
          }
          break
        case 'reject':
          updateData = {
            status: 'rejected',
            actioned_by: user.id,
            rejection_note: extra.rejection_note || null
          }
          break
        case 'return':
          updateData = {
            status: 'returned',
            actual_return_date: extra.actual_return_date || new Date().toISOString()
          }
          break
        case 'undo_return':
          updateData = {
            status: 'approved',
            actual_return_date: null
          }
          break
        case 'cancel':
          updateData = {
            status: 'cancelled'
          }
          break
      }

      // Verify permission
      const { data: loan, error: loanErr } = await supabase
        .from('loan_requests')
        .select('requested_by, status, loan_date, items:loan_items(item_id, quantity)')
        .eq('id', id)
        .single()

      if (loanErr || !loan) return NextResponse.json({ error: 'Data peminjaman tidak ditemukan' }, { status: 404 })

      // 0. Validate return_date if provided during approval
      if (action === 'approve' && extra.return_date) {
        if (new Date(extra.return_date) < new Date(loan.loan_date)) {
          return NextResponse.json({ error: 'Batas waktu kembali tidak boleh sebelum waktu pinjam' }, { status: 400 })
        }
      }
      
      const isAdminOrGA = profile.role === 'admin' || profile.role === 'general_affair'
      
      if (action === 'cancel') {
        if (loan.requested_by !== user.id && !isAdminOrGA) {
          return NextResponse.json({ error: 'Tidak berhak membatalkan peminjaman' }, { status: 403 })
        }
        if (loan.status !== 'pending') {
           return NextResponse.json({ error: 'Peminjaman tidak dapat dibatalkan' }, { status: 400 })
        }
      } else if (!isAdminOrGA) {
        return NextResponse.json({ error: 'Tidak memiliki izin' }, { status: 403 })
      }

      const { createAdminClient } = await import('@/lib/supabase/server')
      const adminClient = createAdminClient()

      // 1. Update Header
      if (Object.keys(updateData).length > 0) {
        const { error: headerErr } = await adminClient
          .from('loan_requests')
          .update(updateData)
          .eq('id', id)

        if (headerErr) return NextResponse.json({ error: headerErr.message }, { status: 400 })
      }

      // 2. Handle Stock and Pivot Updates
      if (action === 'approve' || action === 'reject') {
        const itemsExtra = extra.items_extra // Record<item_id, { warehouse_id, status }>
        if (itemsExtra && Object.keys(itemsExtra).length > 0) {
          // Update each item with its specific warehouse and status
          const updatePromises = Object.entries(itemsExtra).map(([itemId, data]: [string, any]) => 
            adminClient
               .from('loan_items')
               .update({ 
                 warehouse_id: data.status === 'approved' ? data.warehouse_id : null,
                 status: data.status 
               })
               .eq('loan_request_id', id)
               .eq('item_id', itemId)
          )
          await Promise.all(updatePromises)
        }

        // Insert into stock_out ONLY for items marked as 'approved' (only if approving the whole loan)
        if (action === 'approve') {
          const approvedItems = (loan.items as any[]).filter((item: any) => 
            itemsExtra?.[item.item_id]?.status === 'approved'
          )

          if (approvedItems.length > 0) {
            const { reduceStock } = await import('@/lib/stock-service')
            for (const item of approvedItems) {
              await reduceStock({
                itemId: item.item_id,
                warehouseId: itemsExtra?.[item.item_id]?.warehouse_id,
                quantity: item.quantity,
                note: `Peminjaman #${id} disetujui`,
                userId: user.id
              })
            }
          }
        }
      } else if (action === 'partial_return') {
        const returns = extra.returns // Record<loan_item_id, { quantity, note }>
        if (!returns || Object.keys(returns).length === 0) {
          return NextResponse.json({ error: 'Data pengembalian tidak lengkap' }, { status: 400 })
        }

        // 1. Process each return
        const returnedItemsForAlert: { name: string, quantity: number }[] = []

        for (const [loanItemId, data] of Object.entries(returns) as [string, any][]) {
          if (data.quantity <= 0) continue

          // Update returned_quantity
          const { data: item } = await adminClient
            .from('loan_items')
            .select('item_id, warehouse_id, quantity, returned_quantity, item:items(name)')
            .eq('id', loanItemId)
            .single()

          if (!item) continue
          
          returnedItemsForAlert.push({ 
            name: (item.item as any)?.name || 'Barang', 
            quantity: data.quantity 
          })

          const newReturnedQty = (item.returned_quantity || 0) + data.quantity
          await adminClient
            .from('loan_items')
            .update({ returned_quantity: newReturnedQty })
            .eq('id', loanItemId)

          // Add to log
          await adminClient.from('loan_item_returns').insert({
            loan_item_id: loanItemId,
            quantity: data.quantity,
            note: data.note || null,
            actioned_by: user.id,
            returned_at: new Date().toISOString()
          })

          // Add back to stock
          const { addStock } = await import('@/lib/stock-service')
          await addStock({
            itemId: item.item_id,
            warehouseId: item.warehouse_id,
            quantity: data.quantity,
            note: `Pengembalian Parsial Peminjaman #${id} (ID: ${loanItemId})`,
            userId: user.id
          })
        }

        // Trigger WA Dispatcher to immediately send queued return alerts
        if (returnedItemsForAlert.length > 0) {
          try {
            const cronSecret = process.env.CRON_SECRET || ''
            const dispatcherUrl = new URL('/api/v1/webhooks/whatsapp-dispatcher', request.url)
            dispatcherUrl.searchParams.set('secret', cronSecret)
            await fetch(dispatcherUrl.toString(), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-cron-secret': cronSecret
              }
            })
          } catch (e) {
            console.error('[Loan API] Error triggering WA Dispatcher for partial return:', e)
          }
        }

        // 2. Check if all items are fully returned to update header status
        const { data: allItems } = await adminClient
          .from('loan_items')
          .select('quantity, returned_quantity')
          .eq('loan_request_id', id)
          .eq('status', 'approved')

        const isFullyReturned = allItems?.every((i: any) => (i.returned_quantity || 0) >= i.quantity)
        if (isFullyReturned) {
          await adminClient
            .from('loan_requests')
            .update({ 
              status: 'returned',
              actual_return_date: new Date().toISOString()
            })
            .eq('id', id)
        }

      } else if (action === 'return') {
        // Legacy full return for backward compatibility
        const { data: items } = await adminClient
          .from('loan_items')
          .select('id, item_id, warehouse_id, quantity, returned_quantity, item:items(name)')
          .eq('loan_request_id', id)
          .eq('status', 'approved')

        if (items && items.length > 0) {
          const returnedItemsForAlert: { name: string, quantity: number }[] = []

          for (const item of items) {
            const remaining = item.quantity - (item.returned_quantity || 0)
            if (remaining <= 0) continue

            returnedItemsForAlert.push({ 
              name: (item.item as any)?.name || 'Barang', 
              quantity: remaining 
            })

            await adminClient
              .from('loan_items')
              .update({ returned_quantity: item.quantity })
              .eq('id', item.id)

            await adminClient.from('loan_item_returns').insert({
              loan_item_id: item.id,
              quantity: remaining,
              note: 'Pengembalian penuh',
              actioned_by: user.id,
              returned_at: new Date().toISOString()
            })

            const { addStock } = await import('@/lib/stock-service')
            await addStock({
              itemId: item.item_id,
              warehouseId: item.warehouse_id,
              quantity: remaining,
              note: `Pengembalian Peminjaman #${id}`,
              userId: user.id
            })
          }

          // Trigger WA Dispatcher to immediately send queued return alerts
          if (returnedItemsForAlert.length > 0) {
            try {
              const cronSecret = process.env.CRON_SECRET || ''
              const dispatcherUrl = new URL('/api/v1/webhooks/whatsapp-dispatcher', request.url)
              dispatcherUrl.searchParams.set('secret', cronSecret)
              await fetch(dispatcherUrl.toString(), {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-cron-secret': cronSecret
                }
              })
            } catch (e) {
              console.error('[Loan API] Error triggering WA Dispatcher for full return:', e)
            }
          }
        }
      } else if (action === 'undo_return') {
        // Remove all stock_in records for this loan
        await adminClient.from('stock_in')
          .delete()
          .ilike('note', `%#${id}%`)
      }

      return NextResponse.json({ success: true })
    }

    // Regular update
    const { error } = await supabase
      .from('loan_requests')
      .update(body)
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Loan PATCH Error]:', error)
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan internal pada server' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { createAdminClient } = await import('@/lib/supabase/server')
    const adminClient = createAdminClient()

    const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    const isAdminOrGA = profile?.role === 'admin' || profile?.role === 'general_affair'

    // 1. Get loan details to check status and items
    const { data: loan, error: fetchErr } = await adminClient
      .from('loan_requests')
      .select('status, requested_by, items:loan_items(item_id, warehouse_id, quantity, status)')
      .eq('id', id)
      .single()

    if (fetchErr || !loan) return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })

    // Permission check
    if (!isAdminOrGA && loan.requested_by !== user.id) {
      return NextResponse.json({ error: 'Tidak memiliki izin' }, { status: 403 })
    }

    // 2. If status was 'approved', we MUST revert the stock
    if (loan.status === 'approved') {
      const { addStock } = await import('@/lib/stock-service')
      const approvedItems = (loan.items as any[]).filter(i => i.status === 'approved')
      
      for (const item of approvedItems) {
        if (item.warehouse_id) {
          await addStock({
            itemId: item.item_id,
            warehouseId: item.warehouse_id,
            quantity: item.quantity,
            note: `Penghapusan Peminjaman #${id} (Stok dikembalikan otomatis)`,
            userId: user.id
          })
        }
      }
    }

    // 3. Delete the record
    const { error } = await adminClient.from('loan_requests').delete().eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Loan DELETE Error]:', error)
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan internal pada server' },
      { status: 500 }
    )
  }
}
