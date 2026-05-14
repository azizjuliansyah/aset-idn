import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createActivityLog } from '@/lib/logger'

function authError() { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

// GET /api/v1/stock-transfer
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return authError()

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') ?? '10'), 100)
  const itemId = searchParams.get('item_id') ?? ''
  const search = searchParams.get('search') ?? ''
  const fromWarehouseId = searchParams.get('from_warehouse_id')
  const toWarehouseId = searchParams.get('to_warehouse_id')
  const categoryId = searchParams.get('category_id')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')
  const from = (page - 1) * pageSize

  let q = supabase
    .from('stock_transfers')
    .select('id, item_id, from_warehouse_id, to_warehouse_id, quantity, date, note, created_at, created_by, item:items!inner(id,name,item_category_id), from:warehouses!from_warehouse_id(id,name), to:warehouses!to_warehouse_id(id,name), creator:profiles!created_by(full_name)', { count: 'exact' })
    .order('date', { ascending: false })
    .range(from, from + pageSize - 1)

  if (search) q = q.ilike('item.name', `%${search}%`)
  if (itemId) q = q.eq('item_id', itemId)
  if (fromWarehouseId) q = q.eq('from_warehouse_id', fromWarehouseId)
  if (toWarehouseId) q = q.eq('to_warehouse_id', toWarehouseId)
  if (categoryId) q = q.eq('item.item_category_id', categoryId)
  if (startDate) q = q.gte('date', startDate)
  if (endDate) q = q.lte('date', endDate)

  const { data, count, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  
  return NextResponse.json({ data, count, page, pageSize, totalPages: Math.ceil((count ?? 0) / pageSize) })
}

// POST /api/v1/stock-transfer
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return authError()

  const body = await request.json()
  
  try {
    const { transferStock } = await import('@/lib/stock-service')
    const data = await transferStock({
      itemId: body.item_id,
      fromWarehouseId: body.from_warehouse_id,
      toWarehouseId: body.to_warehouse_id,
      quantity: body.quantity,
      note: body.note,
      userId: user.id
    })
    return NextResponse.json({ data }, { status: 201 })
  } catch (error: any) {
    console.error('[API][StockTransfer] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
