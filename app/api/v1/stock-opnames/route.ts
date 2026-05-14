import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function authError() { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

// POST /api/v1/stock-opnames
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return authError()

  const body = await request.json()
  const { group_id, item_id, warehouse_id, system_stock, actual_stock, note } = body

  if (!group_id || !item_id || !warehouse_id || typeof actual_stock !== 'number') {
    return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
  }

  // Check if group is still draft
  const { data: group } = await supabase
    .from('stock_opname_groups')
    .select('status')
    .eq('id', group_id)
    .single()

  if (group?.status !== 'draft') {
    return NextResponse.json({ error: 'Group sudah selesai, tidak bisa menambah item lagi' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('stock_opnames')
    .insert({
      group_id,
      item_id,
      warehouse_id,
      system_stock,
      actual_stock,
      note,
      created_by: user.id
    })
    .select('id, group_id, item_id, warehouse_id, system_stock, actual_stock, note, created_at, created_by')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data }, { status: 201 })
}

// DELETE /api/v1/stock-opnames
export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return authError()

  const { ids } = await request.json()
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'IDs tidak valid' }, { status: 400 })
  }

  // Check if all entries belong to groups that are still draft
  const { data: entries, error: fetchError } = await supabase
    .from('stock_opnames')
    .select('id, group:stock_opname_groups(status)')
    .in('id', ids)

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })

  const finalizedEntries = entries?.filter(e => (e.group as any)?.status !== 'draft')
  if (finalizedEntries && finalizedEntries.length > 0) {
    return NextResponse.json({ 
      error: 'Beberapa item sudah berada dalam group yang difinalisasi, tidak bisa dihapus.' 
    }, { status: 400 })
  }
  
  const { error: deleteError } = await supabase
    .from('stock_opnames')
    .delete()
    .in('id', ids)

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  return NextResponse.json({ message: 'Berhasil menghapus item opname' })
}
