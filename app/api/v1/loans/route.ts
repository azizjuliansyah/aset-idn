import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
  const actionedBy = searchParams.get('actioned_by') ?? 'all'
  const dateFrom = searchParams.get('date_from') ?? ''
  const dateTo = searchParams.get('date_to') ?? ''

  // Build the select query
  // We join loan_items and then items inside it
  const selectQuery = `
    *,
    items:loan_items(
      *,
      item:items(id, name, price),
      warehouse:warehouses(id, name),
      returns:loan_item_returns(*)
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

  if (search) {
    if (profile.role === 'user') {
      q = q.ilike('purpose', `%${search}%`)
    } else {
      q = q.ilike('requester.full_name', `%${search}%`)
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

  return NextResponse.json({ success: true, id: loanReq.id })
}

// DELETE /api/v1/loans
export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdminOrGA = profile?.role === 'admin' || profile?.role === 'general_affair'

  const body = await request.json()
  const ids: string[] = body.ids

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
  }

  let q = supabase.from('item_loans').delete().in('id', ids)

  if (!isAdminOrGA) {
    q = q.eq('requested_by', user.id)
  }

  const { error } = await q

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
