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
    } else {
      // Use admin client for cron to bypass RLS
      supabase = createAdminClient()
    }
    
    // 2. Get Company Settings
    const { data: settings } = await supabase
      .from('company_settings')
      .select('*')
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

    // 3. Get Overdue Loans
    const now = new Date().toISOString()
    const { data: overdueLoans, error: loansError } = await supabase
      .from('loan_requests')
      .select(`
        *,
        requester:requested_by(full_name, phone),
        items:loan_items(quantity, returned_quantity, item:item_id(name))
      `)
      .eq('status', 'approved')
      .lt('return_date', now)

    if (loansError) throw loansError
    if (!overdueLoans || overdueLoans.length === 0) {
      return NextResponse.json({ success: true, message: 'Tidak ada peminjaman yang terlambat saat ini.' })
    }

    if (!settings?.wa_overdue_message_format) {
      return NextResponse.json({ error: 'Template pesan terlambat belum diatur di Pengaturan WhatsApp' }, { status: 400 })
    }

    const numberKey = settings?.wa_number_key || process.env.WATZAP_NUMBER_KEY

    if (!process.env.WATZAP_API_KEY || !numberKey) {
      return NextResponse.json({ error: 'Kredensial Watzap belum dikonfigurasi di server atau database' }, { status: 500 })
    }

    const { createActivityLog } = await import('@/lib/logger')
    let successCount = 0
    let failCount = 0

    // 4. Send Reminders
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

        // Format personal message
        const personalMessage = settings.wa_overdue_message_format
          .replace(/{{nama_peminjam}}/g, requester.full_name || '')
          .replace(/{{nomor_peminjam}}/g, requester.phone ? `+62${requester.phone}` : '-')
          .replace(/{{nama_barang}}/g, itemNames)
          .replace(/{{list_barang}}/g, itemList)
          .replace(/{{barang_belum_kembali}}/g, unreturnedList)
          .replace(/{{waktu_pinjam}}/g, loanDate)
          .replace(/{{batas_pengembalian}}/g, returnDate)

        // Send to Borrower
        const personalRes = await fetch('https://api.watzap.id/v1/send_message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: process.env.WATZAP_API_KEY,
            number_key: numberKey,
            phone_no: '62' + requester.phone,
            message: personalMessage,
          }),
        })
        const personalResult = await personalRes.json()
        const isPersonalSent = personalResult.status === '200' || personalResult.status === 200

        if (isPersonalSent) {
          successCount++
          
          // Send to Group if configured
          if (settings.wa_overdue_group_id && settings.wa_overdue_group_message_format) {
            const groupIds = settings.wa_overdue_group_id.split(',').map(id => id.trim()).filter(Boolean)
            const groupMessage = settings.wa_overdue_group_message_format
              .replace(/{{nama_peminjam}}/g, requester.full_name || '')
              .replace(/{{nomor_peminjam}}/g, requester.phone ? `+62${requester.phone}` : '-')
              .replace(/{{nama_barang}}/g, itemNames)
              .replace(/{{list_barang}}/g, itemList)
              .replace(/{{barang_belum_kembali}}/g, unreturnedList)
              .replace(/{{waktu_pinjam}}/g, loanDate)
              .replace(/{{batas_pengembalian}}/g, returnDate)

            await Promise.all(groupIds.map(async (groupId) => {
              try {
                await fetch('https://api.watzap.id/v1/send_message_group', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    api_key: process.env.WATZAP_API_KEY,
                    number_key: numberKey,
                    group_id: groupId,
                    message: groupMessage,
                  }),
                })
              } catch (e) {
                console.error(`Failed to send overdue group reminder for loan ${loan.id} to group ${groupId}:`, e)
              }
            }))
          }

          // Log activity for each successful reminder
          await createActivityLog({
            action: 'REMINDER',
            entityType: 'LOAN_REQUEST',
            entityId: loan.id,
            details: { 
              name: requester.full_name, 
              type: 'Overdue WhatsApp Reminder',
              status: 'Sent'
            }
          })
        } else {
          failCount++
        }
      } catch (err) {
        console.error(`Error processing overdue reminder for loan ${loan.id}:`, err)
        failCount++
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Berhasil mengirim ${successCount} pengingat. ${failCount > 0 ? `Gagal: ${failCount}` : ''}`
    })

  } catch (error: any) {
    console.error('Error in overdue reminder API:', error)
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan internal' }, { status: 500 })
  }
}
