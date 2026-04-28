import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function authError() { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

// GET /api/v1/stock-in
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return authError()

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') ?? '10'), 100)
  const itemId = searchParams.get('item_id') ?? ''
  const warehouseId = searchParams.get('warehouse_id') ?? ''
  const dateFrom = searchParams.get('date_from') ?? ''
  const dateTo = searchParams.get('date_to') ?? ''
  const from = (page - 1) * pageSize

  let q = supabase
    .from('stock_in')
    .select('*, item:items(id,name), warehouse:warehouses(id,name)', { count: 'exact' })
    .order('date', { ascending: false })
    .range(from, from + pageSize - 1)

  if (itemId) q = q.eq('item_id', itemId)
  if (warehouseId) q = q.eq('warehouse_id', warehouseId)
  if (dateFrom) q = q.gte('date', dateFrom)
  if (dateTo) q = q.lte('date', dateTo)

  const { data, count, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count, page, pageSize, totalPages: Math.ceil((count ?? 0) / pageSize) })
}

// POST /api/v1/stock-in
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return authError()

  const body = await request.json()
  const { data, error } = await supabase.from('stock_in').insert({
    item_id: body.item_id,
    warehouse_id: body.warehouse_id,
    quantity: body.quantity,
    date: body.date ?? new Date().toISOString(),
    note: body.note ?? null,
    created_by: user.id,
  }).select('*, item:items(id,name), warehouse:warehouses(id,name)').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data }, { status: 201 })
}
