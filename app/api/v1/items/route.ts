import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function authError() { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

// GET /api/v1/items
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return authError()

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') ?? '10'), 100)
  const search = searchParams.get('search') ?? ''
  const status = searchParams.get('status') ?? ''
  const from = (page - 1) * pageSize

  let q = supabase
    .from('items')
    .select('*, item_category(name), item_status(name), item_condition(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1)

  if (search) q = q.ilike('name', `%${search}%`)
  if (status) q = q.eq('status', status)

  const { data, count, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count, page, pageSize, totalPages: Math.ceil((count ?? 0) / pageSize) })
}

// POST /api/v1/items
export async function POST(request: Request) {
  console.log('[API] POST /api/v1/items')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return authError()

  const body = await request.json()
  const { data, error } = await supabase.from('items').insert({
    name: body.name,
    item_category_id: body.item_category_id ?? null,
    item_status_id: body.item_status_id ?? null,
    item_condition_id: body.item_condition_id ?? null,
    price: body.price ?? 0,
    status: body.status ?? 'active',
    note: body.note ?? null,
    minimum_stock: body.minimum_stock ?? 0,
    created_by: user.id,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data }, { status: 201 })
}
