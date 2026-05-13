import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function authError() { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

// PATCH /api/v1/stock-opnames/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return authError()

  const body = await request.json()
  const { actual_stock, note } = body

  // Check if group is still draft before updating
  const { data: entry } = await supabase
    .from('stock_opnames')
    .select('group:stock_opname_groups(status)')
    .eq('id', id)
    .single()

  if ((entry as any)?.group?.status !== 'draft') {
    return NextResponse.json({ error: 'Group sudah selesai, tidak bisa mengubah item' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('stock_opnames')
    .update({
      actual_stock,
      note,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}

// DELETE /api/v1/stock-opnames/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return authError()

  // Check if group is still draft before deleting
  const { data: entry } = await supabase
    .from('stock_opnames')
    .select('group:stock_opname_groups(status)')
    .eq('id', id)
    .single()

  if ((entry as any)?.group?.status !== 'draft') {
    return NextResponse.json({ error: 'Group sudah selesai, tidak bisa menghapus item' }, { status: 400 })
  }

  const { error } = await supabase
    .from('stock_opnames')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
