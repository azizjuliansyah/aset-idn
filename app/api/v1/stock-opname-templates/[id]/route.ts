import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 })
const serverError = (msg: string) => NextResponse.json({ error: msg }, { status: 500 })

// GET /api/v1/stock-opname-templates/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  // Role check
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'general_affair') return forbidden()

  try {
    const { data: template, error } = await supabase
      .from('stock_opname_templates')
      .select(`
        id, name, description, warehouse_id, created_by, created_at, updated_at,
        warehouse:warehouses(id, name),
        creator:profiles(id, full_name),
        items:stock_opname_template_items(id, item_id, item:items(id, name))
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 })
      }
      return serverError(error.message)
    }

    return NextResponse.json({ data: template })
  } catch (err: any) {
    return serverError(err.message || 'Internal Server Error')
  }
}

// PATCH /api/v1/stock-opname-templates/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  // Role check
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'general_affair') return forbidden()

  try {
    const body = await request.json()
    const { name, description, warehouse_id, item_ids } = body

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (warehouse_id !== undefined) updateData.warehouse_id = warehouse_id
    updateData.updated_at = new Date().toISOString()

    const { error: updateError } = await supabase
      .from('stock_opname_templates')
      .update(updateData)
      .eq('id', id)

    if (updateError) return serverError(updateError.message)

    // Update items if item_ids is provided
    if (item_ids !== undefined && Array.isArray(item_ids)) {
      // 1. Delete existing items
      const { error: deleteError } = await supabase
        .from('stock_opname_template_items')
        .delete()
        .eq('template_id', id)

      if (deleteError) return serverError(deleteError.message)

      // 2. Insert new ones
      if (item_ids.length > 0) {
        const templateItems = item_ids.map((itemId: number | string) => ({
          template_id: id,
          item_id: itemId
        }))

        const { error: insertError } = await supabase
          .from('stock_opname_template_items')
          .insert(templateItems)

        if (insertError) return serverError(insertError.message)
      }
    }

    // Fetch the updated template
    const { data: updatedTemplate, error: fetchError } = await supabase
      .from('stock_opname_templates')
      .select(`
        id, name, description, warehouse_id, created_by, created_at, updated_at,
        warehouse:warehouses(id, name),
        creator:profiles(id, full_name),
        items:stock_opname_template_items(id, item_id, item:items(id, name))
      `)
      .eq('id', id)
      .single()

    if (fetchError) return serverError(fetchError.message)

    return NextResponse.json({ success: true, data: updatedTemplate })
  } catch (err: any) {
    return serverError(err.message || 'Internal Server Error')
  }
}

// DELETE /api/v1/stock-opname-templates/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  // Role check
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'general_affair') return forbidden()

  try {
    const { error } = await supabase
      .from('stock_opname_templates')
      .delete()
      .eq('id', id)

    if (error) return serverError(error.message)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return serverError(err.message || 'Internal Server Error')
  }
}
