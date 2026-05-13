import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Custom error responses
const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
const serverError = (msg: string) => NextResponse.json({ error: msg }, { status: 500 })

/**
 * GET /api/v1/stock-opname-groups/[id]
 * Fetches the group details and all its associated stock opname entries.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  try {
    // We execute these in parallel to improve performance
    const fetchGroup = supabase
      .from('stock_opname_groups')
      .select('*, creator:profiles(full_name)')
      .eq('id', groupId)
      .single()

    const fetchEntries = supabase
      .from('stock_opnames')
      .select('*, item:items(name, category:item_category(name)), warehouse:warehouses(name)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })

    const [groupResponse, entriesResponse] = await Promise.all([fetchGroup, fetchEntries])

    if (groupResponse.error) {
      console.error('[API] Group Fetch Error:', groupResponse.error)
      // If group not found, return 404 instead of 500
      if (groupResponse.error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Stock opname group not found' }, { status: 404 })
      }
      return serverError(groupResponse.error.message)
    }

    if (entriesResponse.error) {
      console.error('[API] Entries Fetch Error:', entriesResponse.error)
      return serverError(entriesResponse.error.message)
    }

    return NextResponse.json({
      data: {
        ...groupResponse.data,
        entries: entriesResponse.data || []
      }
    })
  } catch (err: any) {
    console.error('[API] Unexpected Error in GET:', err)
    return serverError(err.message || 'Internal Server Error')
  }
}

/**
 * DELETE /api/v1/stock-opname-groups/[id]
 * Deletes the stock opname group.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  try {
    const { error } = await supabase
      .from('stock_opname_groups')
      .delete()
      .eq('id', groupId)

    if (error) {
      console.error('[API] Delete Error:', error)
      return serverError(error.message)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[API] Unexpected Error in DELETE:', err)
    return serverError(err.message || 'Internal Server Error')
  }
}
