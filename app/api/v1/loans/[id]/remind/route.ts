import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { triggerWAQueueDispatcher } from '@/lib/stock-service'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userSupabase = await createClient()

    // 1. Auth check
    const { data: { user } } = await userSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await userSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'general_affair')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    // 2. Get Loan Details with Relations
    const { data: loan, error: loanError } = await userSupabase
      .from('loan_requests')
      .select('id, purpose, loan_date, return_date, status, requested_by, requester:requested_by(full_name, phone), items:loan_items(quantity, item:item_id(name))')
      .eq('id', id)
      .single()

    if (loanError || !loan) {
      return NextResponse.json({ error: 'Peminjaman tidak ditemukan' }, { status: 404 })
    }

    if (loan.status !== 'approved') {
      return NextResponse.json({ error: 'Hanya bisa mengingatkan peminjaman yang sedang aktif (approved)' }, { status: 400 })
    }

    const requester = loan.requester as any
    const items = loan.items as any[]
    const itemNames = items?.map((i: any) => `${i.item?.name} (${i.quantity} pcs)`).filter(Boolean).join(', ') || 'Barang'
    const itemList = items?.map((i: any, idx: number) => `${idx + 1}. ${i.item?.name} (${i.quantity} pcs)`).filter(Boolean).join('\n') || '1. Barang'

    if (!requester?.phone) {
      return NextResponse.json({ error: 'Peminjam belum mengatur nomor WhatsApp di profilnya' }, { status: 400 })
    }

    // 3. Format dates for payload
    const loanDate = new Date(loan.loan_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    const returnDate = loan.return_date ? new Date(loan.return_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'

    // 4. Queue the reminder message in whatsapp_queue table using admin client to bypass RLS
    const adminSupabase = createAdminClient()
    const { error: queueError } = await adminSupabase
      .from('whatsapp_queue')
      .insert({
        type: 'overdue',
        payload: {
          loan_request_id: id,
          requester_name: requester.full_name || '',
          requester_phone: requester.phone || '',
          barang_belum_kembali: itemNames,
          waktu_pinjam: loanDate,
          batas_pengembalian: returnDate,
          item_names: itemNames,
          item_list: itemList
        },
        status: 'pending'
      })

    if (queueError) {
      console.error('[Manual Remind] Error inserting to queue:', queueError)
      return NextResponse.json({ error: 'Gagal memasukkan pesan ke antrean: ' + queueError.message }, { status: 500 })
    }

    // 5. Trigger the background dispatcher immediately
    triggerWAQueueDispatcher()

    return NextResponse.json({
      success: true,
      message: 'Pengingat WhatsApp berhasil dimasukkan ke antrean dan sedang dikirim'
    })
  } catch (error: any) {
    console.error('Error queuing WA reminder:', error)
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan internal' }, { status: 500 })
  }
}
