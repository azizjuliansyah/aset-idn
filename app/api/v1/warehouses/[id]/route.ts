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
    .from('warehouses')
    .update({
      name: body.name,
      note: body.note ?? null,
      is_default: body.is_default ?? false,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await createActivityLog({
    action: 'UPDATE',
    entityType: 'WAREHOUSE',
    entityId: id,
    details: { name: data.name, changes: body }
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

  const { error } = await supabase
    .from('warehouses')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await createActivityLog({
    action: 'DELETE',
    entityType: 'WAREHOUSE',
    entityId: id
  })

  return NextResponse.json({ success: true })
}
