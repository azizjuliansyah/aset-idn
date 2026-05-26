import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { CompanySettings } from '@/types/database'

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret') || request.headers.get('x-cron-secret')
    
    let isCron = false
    if (process.env.CRON_SECRET && secret === process.env.CRON_SECRET) {
      isCron = true
    }

    let supabase = await createClient()

    if (!isCron) {
      // 1. Auth check for manual trigger
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

      // Switch to admin client to bypass RLS for subsequent queue operations
      supabase = createAdminClient()
    } else {
      // Use admin client for cron to bypass RLS
      supabase = createAdminClient()
    }
    
    // 2. Get Company Settings
    const { data: settings } = await supabase
      .from('company_settings')
      .select('is_wa_enabled, wa_overdue_cron_time, wa_overdue_message_format, wa_overdue_group_id, wa_overdue_group_message_format, wa_api_key, wa_number_key')
      .limit(1)
      .single<CompanySettings>()

    if (!settings?.is_wa_enabled) {
      return NextResponse.json({ message: 'WhatsApp notification is disabled' })
    }

    if (isCron) {
      const currentJakartaTime = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(new Date())

      // If cron time is set (e.g. "08:00") and doesn't match current time
      // we skip. We check only the hour if we want to be less strict, 
      // but HH:mm is better if cron runs every hour or more.
      if (settings?.wa_overdue_cron_time && settings.wa_overdue_cron_time !== currentJakartaTime) {
        // If it's an hourly cron, we might want to just check the hour part
        const currentHour = currentJakartaTime.split(':')[0]
        const targetHour = settings.wa_overdue_cron_time.split(':')[0]
        
        if (currentHour !== targetHour) {
          return NextResponse.json({ message: `Not scheduled time yet (Current: ${currentJakartaTime}, Target: ${settings.wa_overdue_cron_time})` })
        }
      }
    }

    const body = await request.json().catch(() => ({}))
    const { loanId, loanIds } = body

    // 3. Get Overdue Loans
    const now = new Date().toISOString()
    
    let query = supabase
      .from('loan_requests')
      .select(`
        id, purpose, loan_date, return_date, status, requested_by,
        requester:requested_by(full_name, phone),
        items:loan_items(quantity, returned_quantity, item:item_id(name))
      `)
      .eq('status', 'approved')

    if (loanIds && Array.isArray(loanIds) && loanIds.length > 0) {
      query = query.in('id', loanIds).lt('return_date', now)
    } else if (loanId) {
      query = query.eq('id', loanId).lt('return_date', now)
    } else {
      query = query.lt('return_date', now)
    }

    const { data: overdueLoans, error: loansError } = await query

    if (loansError) throw loansError
    if (!overdueLoans || overdueLoans.length === 0) {
      let message = 'Tidak ada peminjaman yang terlambat saat ini.'
      if (loanIds) message = 'Peminjaman terpilih tidak ada yang berstatus disetujui dan terlambat.'
      else if (loanId) message = 'Peminjaman tidak ditemukan, tidak disetujui, atau belum terlambat.'
      
      return NextResponse.json({ success: true, message })
    }

    if (!settings?.wa_overdue_message_format) {
      return NextResponse.json({ error: 'Template pesan terlambat belum diatur di Pengaturan WhatsApp' }, { status: 400 })
    }

    let enqueuedCount = 0

    // 4. Queue Overdue Reminders
    for (const loan of overdueLoans) {
      try {
        const requester = loan.requester as any
        const items = loan.items as any[]
        
        if (!requester?.phone) continue

        const itemNames = items?.map((i: any) => `${i.item?.name} (${i.quantity} pcs)`).filter(Boolean).join(', ') || 'Barang'
        const itemList = items?.map((i: any, idx: number) => `${idx + 1}. ${i.item?.name} (${i.quantity} pcs)`).filter(Boolean).join('\n') || '1. Barang'
        
        // Items not yet fully returned
        const unreturnedItems = items?.filter((i: any) => (i.quantity || 0) - (i.returned_quantity || 0) > 0)
        const unreturnedList = unreturnedItems?.map((i: any, idx: number) => {
          const remaining = (i.quantity || 0) - (i.returned_quantity || 0)
          return `${idx + 1}. ${i.item?.name} (${remaining} pcs)`
        }).join('\n') || 'Semua barang sudah kembali'

        const loanDate = new Date(loan.loan_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
        const returnDate = loan.return_date ? new Date(loan.return_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'

        // Insert task to whatsapp_queue
        const { error: insertError } = await supabase.from('whatsapp_queue').insert({
          type: 'overdue',
          payload: {
            loan_request_id: loan.id,
            requester_name: requester.full_name || 'Peminjam',
            requester_phone: requester.phone,
            barang_belum_kembali: unreturnedList,
            waktu_pinjam: loanDate,
            batas_pengembalian: returnDate,
            item_names: itemNames,
            item_list: itemList,
            is_cron: isCron
          }
        })

        if (insertError) {
          console.error(`Failed to queue overdue reminder for loan ${loan.id}:`, insertError)
        } else {
          enqueuedCount++
        }
      } catch (err) {
        console.error(`Error queuing overdue reminder for loan ${loan.id}:`, err)
      }
    }

    // 5. Trigger WhatsApp Queue Dispatcher to immediately process the queued notifications
    if (enqueuedCount > 0) {
      try {
        const cronSecret = process.env.CRON_SECRET || ''
        const dispatcherUrl = new URL('/api/v1/webhooks/whatsapp-dispatcher', request.url)
        dispatcherUrl.searchParams.set('secret', cronSecret)
        
        console.log(`[Overdue API] Enqueued ${enqueuedCount} reminders. Invoking WA Dispatcher...`)
        
        const dispatcherRes = await fetch(dispatcherUrl.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-cron-secret': cronSecret
          }
        })
        const dispatcherResult = await dispatcherRes.json()
        console.log('[Overdue API] WA Dispatcher response:', dispatcherResult)
      } catch (e) {
        console.error('[Overdue API] Error triggering WA Dispatcher:', e)
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Berhasil mengantrekan ${enqueuedCount} pengingat keterlambatan untuk diproses dispatcher.`
    })

  } catch (error: any) {
    console.error('Error in overdue reminder API:', error)
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan internal' }, { status: 500 })
  }
}

