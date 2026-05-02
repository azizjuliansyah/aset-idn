import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/v1/loans
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = parseInt(searchParams.get('pageSize') ?? '10')
  const status = searchParams.get('status') ?? 'all'
  const search = searchParams.get('search') ?? ''
  const actionedBy = searchParams.get('actioned_by') ?? 'all'

  let q = supabase
    .from('item_loans')
    .select(`
      *,
      item:items(id, name, price),
      warehouse:warehouses(id, name),
      requester:profiles!item_loans_requested_by_fkey(id, full_name),
      actioner:profiles!item_loans_actioned_by_fkey(id, full_name)
    `, { count: 'exact' })
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

  if (search) {
    q = q.ilike('purpose', `%${search}%`)
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
