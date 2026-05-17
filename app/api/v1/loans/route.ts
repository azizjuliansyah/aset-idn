import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createActivityLog } from '@/lib/logger'

// GET /api/v1/loans
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const searchParams = new URL(request.url).searchParams
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = parseInt(searchParams.get('pageSize') ?? '10')
  const status = searchParams.get('status') ?? 'all'
  const search = searchParams.get('search') ?? ''
  const ids = searchParams.get('ids') ?? ''
  const actionedBy = searchParams.get('actioned_by') ?? 'all'
  const dateFrom = searchParams.get('date_from') ?? ''
  const dateTo = searchParams.get('date_to') ?? ''
  const dueFilter = searchParams.get('due_filter') ?? 'all'

  const isSummary = searchParams.get('summary') === 'true'

  if (isSummary) {
    let q = supabase.from('loan_requests').select('id', { count: 'exact', head: true })

    if (profile.role === 'user') {
      q = q.eq('requested_by', user.id)
    }

    if (status !== 'all') {
      const statusList = status.split(',')
      q = q.in('status', statusList)
    }
    
    if (actionedBy !== 'all') {
      q = q.eq('actioned_by', actionedBy)
    }

    if (dateFrom) q = q.gte('loan_date', dateFrom)
    if (dateTo) q = q.lte('loan_date', dateTo)

    if (ids) {
      const idList = ids.split(',')
      q = q.in('id', idList)
    }

    if (dueFilter === 'overdue') {
      q = q.lt('return_date', new Date().toISOString())
        .not('return_date', 'is', null)
    }

    const { count, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ count: count ?? 0 })
  }

  // Build the select query
  // We join loan_items and then items inside it
  const selectQuery = `
    id,
    purpose,
    loan_date,
    return_date,
    actual_return_date,
    note,
    requested_by,
    created_by,
    atas_nama,
    is_by_ga,
    status,
    actioned_by,
    created_at,
    rejection_note,
    items:loan_items(
      id,
      loan_request_id,
      item_id,
      quantity,
      warehouse_id,
      status,
      returned_quantity,
      item:items(id, name, price),
      warehouse:warehouses(id, name)
    ),
    requester:profiles!loan_requests_requested_by_fkey(id, full_name),
    actioner:profiles!loan_requests_actioned_by_fkey(id, full_name)
  `

  let q = supabase
    .from('loan_requests')
    .select(selectQuery, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (profile.role === 'user') {
    q = q.eq('requested_by', user.id)
  }

  if (status !== 'all') {
    const statusList = status.split(',')
    q = q.in('status', statusList)
  }
  
  if (actionedBy !== 'all') {
    q = q.eq('actioned_by', actionedBy)
  }

  if (dateFrom) q = q.gte('loan_date', dateFrom)
  if (dateTo) q = q.lte('loan_date', dateTo)

  if (ids) {
    const idList = ids.split(',')
    q = q.in('id', idList)
  }

  if (dueFilter === 'overdue') {
    q = q.lt('return_date', new Date().toISOString())
      .not('return_date', 'is', null)
  }

  if (search) {
    if (profile.role === 'user') {
      q = q.ilike('purpose', `%${search}%`)
    } else {
      // Pre-fetch matched profiles to perform a flat OR filter on local columns
      const { data: matchedProfiles } = await supabase
        .from('profiles')
        .select('id')
        .ilike('full_name', `%${search}%`)
      
      const profileIds = matchedProfiles?.map(p => p.id) || []
      
      if (profileIds.length > 0) {
        q = q.or(`atas_nama.ilike.%${search}%,requested_by.in.(${profileIds.join(',')})`)
      } else {
        q = q.ilike('atas_nama', `%${search}%`)
      }
    }
  }

  const { data, count, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, count })
}

// POST /api/v1/loans
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const body = await request.json()
  const { items, purpose, loan_date, return_date, note, atas_nama } = body

  const isGAOrAdmin = profile.role === 'general_affair' || profile.role === 'admin'

  if (!items || !Array.isArray(items) || items.length === 0 || !purpose || !loan_date) {
    return NextResponse.json({ error: 'Field wajib tidak lengkap' }, { status: 400 })
  }

  // 0. Validate Dates
  if (return_date && new Date(return_date) < new Date(loan_date)) {
    return NextResponse.json({ error: 'Batas waktu kembali tidak boleh sebelum waktu pinjam' }, { status: 400 })
  }

  // 1. Insert Request Header
  const { data: loanReq, error: reqErr } = await supabase
    .from('loan_requests')
    .insert({
      purpose,
      loan_date,
      return_date: return_date || null,
      note: note || null,
      requested_by: user.id,
      created_by: user.id,
      atas_nama: isGAOrAdmin ? (atas_nama || null) : null,
      is_by_ga: isGAOrAdmin,
      status: isGAOrAdmin ? 'approved' : 'pending',
      actioned_by: isGAOrAdmin ? user.id : null,
    })
    .select('id')
    .single()

  if (reqErr) return NextResponse.json({ error: reqErr.message }, { status: 500 })

  // 2. Insert Request Items (Pivot)
  const insertItems = items.map((item: { item_id: string; quantity: number; warehouse_id?: string }) => ({
    loan_request_id: loanReq.id,
    item_id: item.item_id,
    quantity: item.quantity,
    warehouse_id: isGAOrAdmin ? (item.warehouse_id || null) : null,
    status: isGAOrAdmin ? 'approved' : 'pending'
  }))

  const { error: itemsErr } = await supabase.from('loan_items').insert(insertItems)

  if (itemsErr) {
    // Cleanup header if items fail
    await supabase.from('loan_requests').delete().eq('id', loanReq.id)
    return NextResponse.json({ error: itemsErr.message }, { status: 500 })
  }

  await createActivityLog({
    action: 'LOAN',
    entityType: 'LOAN_REQUEST',
    entityId: loanReq.id,
    details: { purpose, item_count: items.length, atas_nama }
  })

  return NextResponse.json({ success: true, id: loanReq.id })
}

// DELETE /api/v1/loans
export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { createAdminClient } = await import('@/lib/supabase/server')
  const adminClient = createAdminClient()

  const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
  const isAdminOrGA = profile?.role === 'admin' || profile?.role === 'general_affair'

  const body = await request.json()
  const ids: string[] = body.ids

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
  }

  // 1. Get all loans to check status and revert stock if needed
  const { data: loans } = await adminClient
    .from('loan_requests')
    .select('id, status, requested_by, items:loan_items(item_id, warehouse_id, quantity, status)')
    .in('id', ids)

  if (!loans || loans.length === 0) {
    return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })
  }

  const { addStock } = await import('@/lib/stock-service')

  for (const loan of loans) {
    // Permission check per loan
    if (!isAdminOrGA && loan.requested_by !== user.id) continue

    // Revert stock if approved
    if (loan.status === 'approved') {
      const approvedItems = (loan.items as any[]).filter(i => i.status === 'approved')
      for (const item of approvedItems) {
        if (item.warehouse_id) {
          await addStock({
            itemId: item.item_id,
            warehouseId: item.warehouse_id,
            quantity: item.quantity,
            note: `Penghapusan Massal #${loan.id} (Stok dikembalikan)`,
            userId: user.id
          })
        }
      }
    }

    // Delete and log
    await adminClient.from('loan_requests').delete().eq('id', loan.id)
    await createActivityLog({
      action: 'DELETE',
      entityType: 'LOAN_REQUEST',
      entityId: loan.id,
      details: { bulk: true, status: loan.status }
    })
  }

  return NextResponse.json({ success: true })
}
