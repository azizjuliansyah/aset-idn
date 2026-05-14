import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CompanySettings, Profile, Item } from '@/types/database'

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

    // 3. Get Company Settings for WA Format
    const { data: settings } = await supabase
      .from('company_settings')
      .select('wa_message_format, wa_group_id, wa_group_message_format, wa_api_key, wa_number_key')
      .limit(1)
      .single<CompanySettings>()


    const rawFormat = settings?.wa_message_format
    if (!rawFormat) {
      return NextResponse.json({ error: 'Format Pesan WA belum diatur di Pengaturan Admin' }, { status: 400 })
    }

    const apiKey = settings?.wa_api_key || process.env.WATZAP_API_KEY
    const numberKey = settings?.wa_number_key || process.env.WATZAP_NUMBER_KEY

    if (!apiKey || !numberKey) {
      return NextResponse.json({ error: 'Kredensial Watzap (API Key / Number Key) belum dikonfigurasi di server atau database' }, { status: 500 })
    }

    // 4. Parse message
    const loanDate = new Date(loan.loan_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    const returnDate = loan.return_date ? new Date(loan.return_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'

    const message = rawFormat
      .replace(/{{nama_peminjam}}/g, requester.full_name || '')
      .replace(/{{nomor_peminjam}}/g, requester.phone ? `+62${requester.phone}` : '-')
      .replace(/{{nama_barang}}/g, itemNames)
      .replace(/{{list_barang}}/g, itemList)
      .replace(/{{waktu_pinjam}}/g, loanDate)
      .replace(/{{batas_pengembalian}}/g, returnDate)

    const targetNumber = '62' + requester.phone

    // 5. Send to Borrower using Watzap
    const res = await fetch('https://api.watzap.id/v1/send_message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        number_key: numberKey,
        phone_no: '62' + requester.phone,
        message: message,
      }),
    })

    const result = await res.json()
    const isBorrowerSent = result.status === '200' || result.status === 200

    if (!isBorrowerSent) {
      return NextResponse.json({ 
        error: 'Gagal mengirim ke peminjam: ' + (result.message || result.detail || 'Unknown error') 
      }, { status: 500 })
    }

    // 6. Send to Group if configured
    let isGroupSent = false
    if (settings.wa_group_id && settings.wa_group_message_format) {
      const groupIds = settings.wa_group_id.split(',').map(id => id.trim()).filter(Boolean)
      
      if (groupIds.length > 0) {
        const groupMessage = settings.wa_group_message_format
          .replace(/{{nama_peminjam}}/g, requester.full_name || '')
          .replace(/{{nomor_peminjam}}/g, requester.phone ? `+62${requester.phone}` : '-')
          .replace(/{{nama_barang}}/g, itemNames)
          .replace(/{{list_barang}}/g, itemList)
          .replace(/{{waktu_pinjam}}/g, loanDate)
          .replace(/{{batas_pengembalian}}/g, returnDate)

        const groupResults = await Promise.all(groupIds.map(async (groupId) => {
          try {
            const groupRes = await fetch('https://api.watzap.id/v1/send_message_group', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                api_key: apiKey,
                number_key: numberKey,
                group_id: groupId,
                message: groupMessage,
              }),
            })
            const groupResult = await groupRes.json()
            return groupResult.status === '200' || groupResult.status === 200
          } catch (e) {
            console.error(`Failed to send to group ${groupId}:`, e)
            return false
          }
        }))
        
        isGroupSent = groupResults.some(success => success)
      }
    }

    const { createActivityLog } = await import('@/lib/logger')
    await createActivityLog({
      action: 'REMINDER',
      entityType: 'LOAN_REQUEST',
      entityId: id,
      details: { 
        name: requester.full_name, 
        type: 'WhatsApp Reminder',
        sentTo: isGroupSent ? 'Borrower & Group' : 'Borrower Only',
        status: 'Sent'
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: isGroupSent 
        ? 'Pengingat WhatsApp berhasil dikirim ke peminjam dan grup' 
        : 'Pengingat WhatsApp berhasil dikirim ke peminjam' 
    })
  } catch (error: any) {
    console.error('Error sending WA:', error)
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan internal' }, { status: 500 })
  }
}
