import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function authError() { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

// GET /api/v1/stock-ledger
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return authError()

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') ?? '10'), 100)
  const search = searchParams.get('search') ?? ''
  const isLowStock = searchParams.get('is_low_stock') === 'true'
  const from = (page - 1) * pageSize

  let q = supabase
    .from('stock_ledger')
    .select('*', { count: 'exact' })
    .order('item_name', { ascending: true })
    .range(from, from + pageSize - 1)

  if (search) {
    q = q.or(`item_name.ilike.%${search}%,warehouse_name.ilike.%${search}%`)
  }
  if (isLowStock) {
    q = q.eq('is_low_stock', true)
  }

  const { data, count, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count, page, pageSize, totalPages: Math.ceil((count ?? 0) / pageSize) })
}
