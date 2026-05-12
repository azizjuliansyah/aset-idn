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
  const from = (page - 1) * pageSize

  let q = supabase
    .from('stock_transfers')
    .select('*, item:items!inner(id,name), from:warehouses!from_warehouse_id(id,name), to:warehouses!to_warehouse_id(id,name), creator:profiles!created_by(full_name)', { count: 'exact' })
    .order('date', { ascending: false })
    .range(from, from + pageSize - 1)

  if (search) q = q.ilike('item.name', `%${search}%`)
  if (itemId) q = q.eq('item_id', itemId)

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
