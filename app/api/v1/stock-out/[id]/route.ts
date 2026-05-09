import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createActivityLog } from '@/lib/logger'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { data, error } = await supabase
    .from('stock_out')
    .update({
      item_id: body.item_id,
      warehouse_id: body.warehouse_id,
      quantity: body.quantity,
      date: body.date,
      note: body.note ?? null,
    })
    .eq('id', id)
    .select('*, items(name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await createActivityLog({
    action: 'UPDATE',
    entityType: 'STOCK_OUT',
    entityId: data.item_id,
    details: { 
      name: (data.items as any)?.name, 
      type: 'Stock Out',
      quantity: data.quantity,
      transaction_id: id 
    }
  })

  return NextResponse.json({ data })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get data before delete
  const { data: stockOut } = await supabase
    .from('stock_out')
    .select('item_id, items(name), quantity')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('stock_out')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await createActivityLog({
    action: 'DELETE',
    entityType: 'STOCK_OUT',
    entityId: stockOut?.item_id,
    details: { 
      name: (stockOut?.items as any)?.name, 
      type: 'Stock Out',
      quantity: stockOut?.quantity,
      transaction_id: id 
    }
  })

  return NextResponse.json({ success: true })
}
