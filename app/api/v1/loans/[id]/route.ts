import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/v1/loans/[id]
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
  const { action, rejection_note, actual_return_date } = body

  // Fetch current loan
  const { data: loan, error: fetchError } = await supabase
    .from('item_loans')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !loan) return NextResponse.json({ error: 'Peminjaman tidak ditemukan' }, { status: 404 })

  // Action: cancel — user can cancel own pending
  if (action === 'cancel') {
    if (loan.requested_by !== user.id || loan.status !== 'pending') {
      return NextResponse.json({ error: 'Tidak dapat membatalkan peminjaman ini' }, { status: 403 })
    }
    const { error } = await supabase
      .from('item_loans')
      .update({ status: 'cancelled' })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // Actions: approve, reject, return, undo_return — GA or admin only
  if (!['general_affair', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Tidak memiliki izin' }, { status: 403 })
  }

  if (action === 'approve') {
    if (loan.status !== 'pending') {
      return NextResponse.json({ error: 'Hanya peminjaman pending yang dapat disetujui' }, { status: 400 })
    }
    const { error } = await supabase
      .from('item_loans')
      .update({ status: 'approved', actioned_by: user.id })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'reject') {
    if (loan.status !== 'pending') {
      return NextResponse.json({ error: 'Hanya peminjaman pending yang dapat ditolak' }, { status: 400 })
    }
    const { error } = await supabase
      .from('item_loans')
      .update({
        status: 'rejected',
        actioned_by: user.id,
        rejection_note: rejection_note || null,
      })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'return') {
    if (loan.status !== 'approved') {
      return NextResponse.json({ error: 'Hanya peminjaman yang disetujui yang dapat ditandai dikembalikan' }, { status: 400 })
    }
    const { error } = await supabase
      .from('item_loans')
      .update({
        status: 'returned',
        actual_return_date: actual_return_date || new Date().toISOString().split('T')[0],
      })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'undo_return') {
    if (loan.status !== 'returned') {
      return NextResponse.json({ error: 'Hanya peminjaman yang sudah kembali yang dapat di-undo' }, { status: 400 })
    }
    const { error } = await supabase
      .from('item_loans')
      .update({
        status: 'approved',
        actual_return_date: null,
      })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Aksi tidak valid' }, { status: 400 })
}
