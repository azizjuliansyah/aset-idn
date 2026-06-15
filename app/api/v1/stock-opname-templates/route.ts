import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function authError() { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
function forbiddenError() { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

// GET /api/v1/stock-opname-templates
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return authError()

  // Role check: Admin & General Affair allowed
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'general_affair') return forbiddenError()

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') ?? '10'), 100)
  const search = searchParams.get('search') ?? ''
  const warehouseId = searchParams.get('warehouse_id')
  const from = (page - 1) * pageSize

  let q = supabase
    .from('stock_opname_templates')
    .select(`
      id, name, description, warehouse_id, created_by, created_at, updated_at,
      warehouse:warehouses(id, name),
      creator:profiles(id, full_name),
      items:stock_opname_template_items(id, item_id, item:items(id, name))
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1)

  if (search) q = q.ilike('name', `%${search}%`)
  if (warehouseId) q = q.eq('warehouse_id', warehouseId)

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

// POST /api/v1/stock-opname-templates
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return authError()

  // Role check: Admin & General Affair allowed
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'general_affair') return forbiddenError()

  const body = await request.json()
  const { name, description, warehouse_id, item_ids } = body

  if (!name || !warehouse_id) {
    return NextResponse.json({ error: 'Nama template dan gudang harus diisi' }, { status: 400 })
  }

  // Create template record
  const { data: template, error: templateError } = await supabase
    .from('stock_opname_templates')
    .insert({
      name,
      description,
      warehouse_id,
      created_by: user.id
    })
    .select()
    .single()

  if (templateError) {
    return NextResponse.json({ error: templateError.message }, { status: 500 })
  }

  // Insert items if provided
  if (item_ids && Array.isArray(item_ids) && item_ids.length > 0) {
    const templateItems = item_ids.map((itemId: number | string) => ({
      template_id: template.id,
      item_id: itemId
    }))

    const { error: itemsError } = await supabase
      .from('stock_opname_template_items')
      .insert(templateItems)

    if (itemsError) {
      // Cleanup created template on error
      await supabase.from('stock_opname_templates').delete().eq('id', template.id)
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }
  }

  // Fetch fully populated template to return
  const { data: fullTemplate, error: fetchError } = await supabase
    .from('stock_opname_templates')
    .select(`
      id, name, description, warehouse_id, created_by, created_at, updated_at,
      warehouse:warehouses(id, name),
      creator:profiles(id, full_name),
      items:stock_opname_template_items(id, item_id, item:items(id, name))
    `)
    .eq('id', template.id)
    .single()

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  return NextResponse.json({ data: fullTemplate }, { status: 201 })
}
