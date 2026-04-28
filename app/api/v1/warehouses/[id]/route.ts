import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function authError() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// GET /api/v1/warehouses/[id]
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return authError()

  const { data, error } = await supabase.from('warehouses').select('*').eq('id', id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ data })
}

// PATCH /api/v1/warehouses/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return authError()

  const body = await request.json()
  const { data, error } = await supabase.from('warehouses')
    .update({ name: body.name, note: body.note ?? null })
    .eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data })
}

// DELETE /api/v1/warehouses/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return authError()

  const { error } = await supabase.from('warehouses').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
