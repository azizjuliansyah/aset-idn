import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createActivityLog } from '@/lib/logger'

// PATCH /api/v1/stock-opname-diff-categories/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, note } = body

  if (!name) {
    return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('stock_opname_diff_categories')
    .update({
      name,
      note: note || null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await createActivityLog({
    action: 'UPDATE',
    entityType: 'STOCK_OPNAME_DIFF_CATEGORY',
    entityId: id,
    details: { name: data.name, type: 'Kategori Selisih' }
  })

  return NextResponse.json({ data })
}

// DELETE /api/v1/stock-opname-diff-categories/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get name before delete
  const { data: category } = await supabase
    .from('stock_opname_diff_categories')
    .select('name')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('stock_opname_diff_categories')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await createActivityLog({
    action: 'DELETE',
    entityType: 'STOCK_OPNAME_DIFF_CATEGORY',
    entityId: id,
    details: { name: category?.name, type: 'Kategori Selisih' }
  })

  return NextResponse.json({ success: true })
}
