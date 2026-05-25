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
    const { data: groupData, error: groupError } = await supabase
      .from('stock_opname_groups')
      .select(`
        id, name, description, status, created_by, created_at, 
        creator:profiles(full_name)
      `)
      .eq('id', groupId)
      .single()

    if (groupError) {
      console.error('[API DEBUG] Group Fetch Error:', {
        groupId,
        userId: user.id,
        error: groupError
      })
      // If group not found, return 404 instead of 500
      if (groupError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Stock opname group not found' }, { status: 404 })
      }
      return serverError(groupError.message)
    }

    return NextResponse.json({
      data: groupData
    })
  } catch (err: any) {
    console.error('[API] Unexpected Error in GET:', err)
    return serverError(err.message || 'Internal Server Error')
  }
}

/**
 * PATCH /api/v1/stock-opname-groups/[id]
 * Updates the stock opname group metadata (name, description).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  // Admin role check
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { name, description } = body

    const { data, error } = await supabase
      .from('stock_opname_groups')
      .update({ name, description })
      .eq('id', groupId)
      .select()
      .single()

    if (error) {
      console.error('[API] Patch Error:', error)
      return serverError(error.message)
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error('[API] Unexpected Error in PATCH:', err)
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

  // Admin role check
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

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
