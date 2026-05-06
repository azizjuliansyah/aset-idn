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
  const warehouseId = searchParams.get('warehouse_id') ?? 'all'
  const dateFrom = searchParams.get('date_from') ?? ''
  const dateTo = searchParams.get('date_to') ?? ''
  const returnDateFrom = searchParams.get('return_date_from') ?? ''
  const returnDateTo = searchParams.get('return_date_to') ?? ''
  const dueFilter = searchParams.get('due_filter') ?? 'all' // all, approaching, overdue

  // Build the select query dynamically based on search
  // Use !inner on requester if we are searching so we can filter by it
  const selectQuery = search
    ? `*, item:items(id, name, price), warehouse:warehouses(id, name), requester:profiles!item_loans_requested_by_fkey!inner(id, full_name), actioner:profiles!item_loans_actioned_by_fkey(id, full_name)`
    : `*, item:items(id, name, price), warehouse:warehouses(id, name), requester:profiles!item_loans_requested_by_fkey(id, full_name), actioner:profiles!item_loans_actioned_by_fkey(id, full_name)`

  let q = supabase
    .from('item_loans')
    .select(selectQuery, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  // Users only see their own loans
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

  if (warehouseId !== 'all') {
    q = q.eq('warehouse_id', warehouseId)
  }

  if (dateFrom) {
    q = q.gte('loan_date', dateFrom)
  }

  if (dateTo) {
    q = q.lte('loan_date', dateTo)
  }

  if (returnDateFrom) {
    q = q.gte('actual_return_date', returnDateFrom)
  }

  if (returnDateTo) {
    q = q.lte('actual_return_date', returnDateTo)
  }

  if (dueFilter !== 'all') {
    const now = new Date()
    q = q.eq('status', 'approved') // Only active loans

    if (dueFilter === 'approaching') {
      const threeDaysLater = new Date()
      threeDaysLater.setDate(now.getDate() + 3)
      q = q.gte('return_date', now.toISOString())
           .lte('return_date', threeDaysLater.toISOString())
    } else if (dueFilter === 'overdue') {
      q = q.lt('return_date', now.toISOString())
    }
  }

  if (search) {
    // If user role, they already only see their own, so search by item name or purpose is better.
    // If admin/GA, search by borrower's name or item name or purpose
    // Actually, cross-table OR is not supported natively like item.name.ilike OR requester.full_name.ilike
    // So we will just search by requester.full_name for GA/admin, or purpose for user
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
  if (profile?.role !== 'user') {
    return NextResponse.json({ error: 'Hanya user yang dapat membuat request peminjaman' }, { status: 403 })
  }

  const body = await request.json()
  const { item_id, warehouse_id, quantity, purpose, loan_date, return_date, note } = body

  if (!item_id || !warehouse_id || !quantity || !purpose || !loan_date) {
    return NextResponse.json({ error: 'Field wajib tidak lengkap' }, { status: 400 })
  }

  const { error } = await supabase.from('item_loans').insert({
    item_id,
    warehouse_id,
    quantity,
    purpose,
    loan_date,
    return_date: return_date || null,
    note: note || null,
    requested_by: user.id,
    status: 'pending',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
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
