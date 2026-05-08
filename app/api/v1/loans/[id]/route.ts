import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
      .select('requested_by, status, items:loan_items(item_id, quantity)')
      .eq('id', id)
      .single()

    if (loanErr || !loan) return NextResponse.json({ error: 'Data peminjaman tidak ditemukan' }, { status: 404 })
    
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
    const { error: headerErr } = await adminClient
      .from('loan_requests')
      .update(updateData)
      .eq('id', id)

    if (headerErr) return NextResponse.json({ error: headerErr.message }, { status: 400 })

    // 2. Handle Stock and Pivot Updates
    if (action === 'approve') {
      const itemsExtra = extra.items_extra // Record<item_id, { warehouse_id, status }>
      if (!itemsExtra || Object.keys(itemsExtra).length === 0) {
        return NextResponse.json({ error: 'Data item tidak lengkap' }, { status: 400 })
      }

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

      // Insert into stock_out ONLY for items marked as 'approved'
      const approvedItems = (loan.items as any[]).filter((item: any) => 
        itemsExtra[item.item_id]?.status === 'approved'
      )

      if (approvedItems.length > 0) {
        const stockOutData = approvedItems.map((item: any) => ({
          item_id: item.item_id,
          warehouse_id: itemsExtra[item.item_id].warehouse_id,
          quantity: item.quantity,
          date: new Date().toISOString(),
          note: `Peminjaman #${id} disetujui`,
          created_by: user.id
        }))
        await adminClient.from('stock_out').insert(stockOutData)
      }

    } else if (action === 'partial_return') {
      const returns = extra.returns // Record<loan_item_id, { quantity, note }>
      if (!returns || Object.keys(returns).length === 0) {
        return NextResponse.json({ error: 'Data pengembalian tidak lengkap' }, { status: 400 })
      }

      // 1. Process each return
      for (const [loanItemId, data] of Object.entries(returns) as [string, any][]) {
        if (data.quantity <= 0) continue

        // Update returned_quantity
        const { data: item } = await adminClient
          .from('loan_items')
          .select('item_id, warehouse_id, quantity, returned_quantity')
          .eq('id', loanItemId)
          .single()

        if (!item) continue

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
        await adminClient.from('stock_in').insert({
          item_id: item.item_id,
          warehouse_id: item.warehouse_id,
          quantity: data.quantity,
          date: new Date().toISOString(),
          note: `Pengembalian Parsial Peminjaman #${id} (ID: ${loanItemId})`,
          created_by: user.id
        })
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
        .select('*')
        .eq('loan_request_id', id)
        .eq('status', 'approved')

      if (items && items.length > 0) {
        for (const item of items) {
          const remaining = item.quantity - (item.returned_quantity || 0)
          if (remaining <= 0) continue

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

          await adminClient.from('stock_in').insert({
            item_id: item.item_id,
            warehouse_id: item.warehouse_id,
            quantity: remaining,
            date: new Date().toISOString(),
            note: `Pengembalian Peminjaman #${id}`,
            created_by: user.id
          })
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
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdminOrGA = profile?.role === 'admin' || profile?.role === 'general_affair'

  let q = supabase.from('loan_requests').delete().eq('id', id)
  
  if (!isAdminOrGA) {
    q = q.eq('requested_by', user.id)
  }

  const { error } = await q

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
