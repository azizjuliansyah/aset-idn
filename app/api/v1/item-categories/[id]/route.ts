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
  const { error, data } = await supabase
    .from('item_category')
    .update({ name: body.name })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await createActivityLog({
    action: 'UPDATE',
    entityType: 'ITEM_CATEGORY',
    entityId: data.id,
    details: { name: data.name, type: 'Category' }
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

  // Get name before delete for logging
  const { data: category } = await supabase.from('item_category').select('name').eq('id', id).single()

  const { error } = await supabase
    .from('item_category')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await createActivityLog({
    action: 'DELETE',
    entityType: 'ITEM_CATEGORY',
    entityId: id,
    details: { name: category?.name, type: 'Category' }
  })

  return NextResponse.json({ success: true })
}
