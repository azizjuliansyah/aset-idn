import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  console.log(`[API] PATCH /api/v1/items/${id}`)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { data, error } = await supabase
    .from('items')
    .update({
      name: body.name,
      item_category_id: body.item_category_id || null,
      item_status_id: body.item_status_id || null,
      item_condition_id: body.item_condition_id || null,
      price: body.price,
      status: body.status,
      note: body.note || null,
      minimum_stock: body.minimum_stock,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[API] Update error:', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ data })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  console.log(`[API] DELETE /api/v1/items/${id}`)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[API] Delete error:', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
