import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function authError() { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

// GET /api/v1/stock-out
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
  const search = searchParams.get('search') ?? ''
  const from = (page - 1) * pageSize

  const selectQuery = search
    ? 'id, item_id, warehouse_id, quantity, date, note, created_at, created_by, item:items!inner(id,name), warehouse:warehouses(id,name)'
    : 'id, item_id, warehouse_id, quantity, date, note, created_at, created_by, item:items(id,name), warehouse:warehouses(id,name)'

  let q = supabase
    .from('stock_out')
    .select(selectQuery, { count: 'exact' })
    .order('date', { ascending: false })
    .range(from, from + pageSize - 1)

  if (search) q = q.ilike('items.name', `%${search}%`)
  if (itemId) q = q.eq('item_id', itemId)
  if (warehouseId) q = q.eq('warehouse_id', warehouseId)
  if (dateFrom) q = q.gte('date', dateFrom)
  if (dateTo) q = q.lte('date', dateTo)

  const { data, count, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count, page, pageSize, totalPages: Math.ceil((count ?? 0) / pageSize) })
}

// POST /api/v1/stock-out
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return authError()

  const body = await request.json()

  try {
    const { reduceStock } = await import('@/lib/stock-service')
    const data = await reduceStock({
      itemId: body.item_id,
      warehouseId: body.warehouse_id,
      quantity: body.quantity,
      note: body.note,
      userId: user.id
    })
    return NextResponse.json({ data }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
