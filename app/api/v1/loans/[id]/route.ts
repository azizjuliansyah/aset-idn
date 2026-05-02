import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { action, ...extra } = body

  if (action) {
    let updateData: any = {}
    
    switch (action) {
      case 'approve':
        updateData = {
          status: 'approved',
          actioned_by: user.id,
          actioned_at: new Date().toISOString()
        }
        break
      case 'reject':
        updateData = {
          status: 'rejected',
          actioned_by: user.id,
          actioned_at: new Date().toISOString(),
          rejection_note: extra.rejection_note || null
        }
        break
      case 'return':
        updateData = {
          status: 'returned',
          actual_return_date: extra.actual_return_date || new Date().toISOString()
        }
        break
      case 'undo_return':
        updateData = {
          status: 'approved',
          actual_return_date: null
        }
        break
      case 'cancel':
        updateData = {
          status: 'cancelled'
        }
        break
    }

    const { error } = await supabase
      .from('item_loans')
      .update(updateData)
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  }

  // Regular update
  const { error } = await supabase
    .from('item_loans')
    .update(body)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
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
    .from('item_loans')
    .delete()
    .eq('id', id)
    .eq('requested_by', user.id) // Only requester can delete their own request

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
