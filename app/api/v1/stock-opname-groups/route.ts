import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function authError() { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

// GET /api/v1/stock-opname-groups
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return authError()

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') ?? '10'), 100)
  const search = searchParams.get('search') ?? ''
  const warehouseId = searchParams.get('warehouse_id')
  const categoryId = searchParams.get('category_id')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')
  const from = (page - 1) * pageSize

  let selectStr = 'id, name, description, status, created_by, created_at, creator:profiles(full_name)'
  if (warehouseId || categoryId) {
    selectStr += ', stock_opname_group_items!inner(warehouse_id, item:items!inner(item_category_id))'
  }

  let q = supabase
    .from('stock_opname_groups')
    .select(selectStr, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1)

  if (search) q = q.ilike('name', `%${search}%`)
  if (warehouseId) q = q.eq('stock_opname_group_items.warehouse_id', warehouseId)
  if (categoryId) q = q.eq('stock_opname_group_items.item.item_category_id', categoryId)
  if (startDate) q = q.gte('created_at', startDate)
  if (endDate) q = q.lte('created_at', endDate)

  const { data, count, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  
  return NextResponse.json({ 
    data, 
    count, 
    page, 
    pageSize, 
    totalPages: Math.ceil((count ?? 0) / pageSize) 
  })
}

// POST /api/v1/stock-opname-groups
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return authError()

  // Admin role check
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { name, description } = body

  if (!name) {
    return NextResponse.json({ error: 'Nama group harus diisi' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('stock_opname_groups')
    .insert({
      name,
      description,
      status: 'draft',
      created_by: user.id
    })
    .select('id, name, description, status, created_by, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data }, { status: 201 })
}

// DELETE /api/v1/stock-opname-groups
export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return authError()

  // Admin role check
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { ids } = await request.json()
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'IDs tidak valid' }, { status: 400 })
  }

  // Check if all groups are still draft
  const { data: groups, error: fetchError } = await supabase
    .from('stock_opname_groups')
    .select('id, status, name')
    .in('id', ids)

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })

  const completedGroups = groups?.filter(g => g.status === 'completed')
  if (completedGroups && completedGroups.length > 0) {
    return NextResponse.json({ 
      error: `Beberapa group sudah selesai (${completedGroups.map(g => g.name).join(', ')}), tidak bisa dihapus.` 
    }, { status: 400 })
  }

  const { error: deleteError } = await supabase
    .from('stock_opname_groups')
    .delete()
    .in('id', ids)

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  return NextResponse.json({ message: 'Berhasil menghapus group opname' })
}
