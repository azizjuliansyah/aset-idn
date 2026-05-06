import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ItemLoan, CompanySettings, Profile, Item } from '@/types/database'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    // 1. Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'general_affair')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    // 2. Get Loan Details with Relations
    const { data: loan, error: loanError } = await supabase
      .from('item_loans')
      .select('*, requester:requested_by(full_name, phone), item:item_id(name)')
      .eq('id', id)
      .single()

    if (loanError || !loan) {
      return NextResponse.json({ error: 'Peminjaman tidak ditemukan' }, { status: 404 })
    }

    if (loan.status !== 'approved') {
      return NextResponse.json({ error: 'Hanya bisa mengingatkan peminjaman yang sedang aktif (approved)' }, { status: 400 })
    }

    const requester = loan.requester as any
    const item = loan.item as any

    if (!requester?.phone) {
      return NextResponse.json({ error: 'Peminjam belum mengatur nomor WhatsApp di profilnya' }, { status: 400 })
    }

    // 3. Get Company Settings for WA Format
    const { data: settings } = await supabase
      .from('company_settings')
      .select('*')
      .limit(1)
      .single<CompanySettings>()

    if (!settings?.is_wa_enabled) {
      return NextResponse.json({ error: 'Fitur Pengingat WhatsApp sedang dinonaktifkan' }, { status: 400 })
    }

    const rawFormat = settings.wa_message_format
    if (!rawFormat) {
      return NextResponse.json({ error: 'Format Pesan WA belum diatur di Pengaturan Admin' }, { status: 400 })
    }

    if (!process.env.FONNTE_TOKEN) {
      return NextResponse.json({ error: 'Token Fonnte belum dikonfigurasi di server' }, { status: 500 })
    }

    // 4. Parse message
    const loanDate = new Date(loan.loan_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    const returnDate = loan.return_date ? new Date(loan.return_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'

    const message = rawFormat
      .replace(/{{nama_peminjam}}/g, requester.full_name || '')
      .replace(/{{nama_barang}}/g, item.name || '')
      .replace(/{{waktu_pinjam}}/g, loanDate)
      .replace(/{{batas_pengembalian}}/g, returnDate)

    const targetNumber = '62' + requester.phone

    // 5. Send using Fonnte
    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': process.env.FONNTE_TOKEN,
      },
      body: new URLSearchParams({
        target: targetNumber,
        message: message,
        countryCode: '62', // optional but good
      }),
    })

    const result = await res.json()
    if (!result.status) {
      return NextResponse.json({ error: 'Gagal mengirim pesan melalui Fonnte: ' + (result.reason || result.detail || 'Unknown error') }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Pengingat WhatsApp berhasil dikirim' })
  } catch (error: any) {
    console.error('Error sending WA:', error)
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan internal' }, { status: 500 })
  }
}
