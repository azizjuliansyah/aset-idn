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

    // Verify permission before bypassing RLS
    const { data: loan, error: loanErr } = await supabase.from('item_loans').select('requested_by, status').eq('id', id).single()
    if (loanErr || !loan) return NextResponse.json({ error: 'Data peminjaman tidak ditemukan' }, { status: 404 })
    
    const isAdminOrGA = profile.role === 'admin' || profile.role === 'general_affair'
    
    if (action === 'cancel') {
      if (loan.requested_by !== user.id && !isAdminOrGA) {
        return NextResponse.json({ error: 'Tidak berhak membatalkan peminjaman' }, { status: 403 })
      }
      if (loan.status !== 'pending') {
         return NextResponse.json({ error: 'Peminjaman tidak dapat dibatalkan' }, { status: 400 })
      }
    } else {
      if (!isAdminOrGA) {
        return NextResponse.json({ error: 'Tidak memiliki izin' }, { status: 403 })
      }
    }

    // Use admin client to bypass RLS "WITH CHECK" policy
    const { createAdminClient } = await import('@/lib/supabase/server')
    const adminClient = createAdminClient()

    const { error } = await adminClient
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

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdminOrGA = profile?.role === 'admin' || profile?.role === 'general_affair'

  let q = supabase.from('item_loans').delete().eq('id', id)
  
  if (!isAdminOrGA) {
    q = q.eq('requested_by', user.id) // Only requester can delete their own request if not admin/GA
  }

  const { error } = await q

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
