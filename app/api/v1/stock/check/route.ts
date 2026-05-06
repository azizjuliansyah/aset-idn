import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { item_id, warehouse_id, quantity } = body

  if (!item_id || !warehouse_id || typeof quantity !== 'number') {
    return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
  }

  // Check current stock from stock_ledger view
  const { data: stock, error } = await supabase
    .from('stock_ledger')
    .select('current_stock')
    .eq('item_id', item_id)
    .eq('warehouse_id', warehouse_id)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 means no row found (0 stock)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const currentStock = stock?.current_stock ?? 0
  const isAvailable = currentStock >= quantity

  // Return only boolean status to avoid leaking actual stock count
  return NextResponse.json({ isAvailable })
}
