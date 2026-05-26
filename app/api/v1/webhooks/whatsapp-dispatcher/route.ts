import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import type { CompanySettings } from '@/types/database'

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret') || request.headers.get('x-cron-secret')
    
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    // 1. Get Company Settings for Watzap keys & templates
    const { data: settings, error: settingsError } = await supabase
      .from('company_settings')
      .select('*')
      .single()

    if (settingsError) {
      console.error('[WA Dispatcher] Error fetching settings:', settingsError)
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    const isWaEnabled = settings?.is_wa_enabled
    const apiKey = settings?.wa_api_key || process.env.WATZAP_API_KEY
    const numberKey = settings?.wa_number_key || process.env.WATZAP_NUMBER_KEY

    if (!isWaEnabled) {
      return NextResponse.json({ message: 'WhatsApp notification is globally disabled' })
    }

    if (!apiKey || !numberKey) {
      return NextResponse.json({ error: 'Watzap credentials not configured' }, { status: 500 })
    }

    // 2. Fetch pending queue items
    const { data: queueItems, error: queueError } = await supabase
      .from('whatsapp_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (queueError) {
      console.error('[WA Dispatcher] Error fetching queue:', queueError)
      return NextResponse.json({ error: 'Failed to fetch queue items' }, { status: 500 })
    }

    if (!queueItems || queueItems.length === 0) {
      return NextResponse.json({ success: true, message: 'No pending WhatsApp messages in queue.' })
    }

    // Lock items to this request by transitioning them to 'sending' status to prevent race conditions
    const itemIds = queueItems.map((item: any) => item.id)
    const { data: lockedItems, error: lockError } = await supabase
      .from('whatsapp_queue')
      .update({ status: 'sending', updated_at: new Date().toISOString() })
      .in('id', itemIds)
      .eq('status', 'pending')
      .select('*')

    if (lockError) {
      console.error('[WA Dispatcher] Error locking queue items:', lockError)
      return NextResponse.json({ error: 'Failed to lock queue items' }, { status: 500 })
    }

    if (!lockedItems || lockedItems.length === 0) {
      console.log('[WA Dispatcher] All pending items were already locked by another process.')
      return NextResponse.json({ success: true, message: 'No unlocked pending items to process.' })
    }

    console.log(`[WA Dispatcher] Processing ${lockedItems.length} locked items...`)

    let successCount = 0
    let failCount = 0

    // Helper function to format return dates
    const formatDate = (dateStr: string | null) => {
      if (!dateStr) return '-'
      try {
        return new Date(dateStr).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      } catch (e) {
        return dateStr
      }
    }

    // 3. Process each queue item
    for (const item of lockedItems) {
      const { id, type, payload } = item
      let isPersonalSent = false
      let isGroupSent = false
      let lastErrorMessage = ''
      let requester_name = ''
      let requester_phone = ''

      try {
        // --- TYPE: LOW STOCK ---
        if (type === 'low_stock') {
          const { item_name, current_stock, minimum_stock, trigger_qty } = payload
          const template = settings.wa_stock_low_message_format || 
            `⚠️ *STOK MINIMUM TERCAPAI*\n\nBarang: *{{nama_barang}}*\nStok Saat Ini: *{{stok_saat_ini}}*\nBatas Minimum: *{{batas_minimum}}*\n\n_#trigger notifikasi_:\n{{trigger_notifikasi}}\n\nMohon segera lakukan pengadaan barang.`

          const triggerNotif = trigger_qty ? `ada barang keluar ${trigger_qty}pcs` : '-'
          const formattedMessage = template
            .replace(/{{nama_barang}}/g, item_name || 'Barang')
            .replace(/{{stok_saat_ini}}/g, String(current_stock ?? 0))
            .replace(/{{batas_minimum}}/g, String(minimum_stock ?? 0))
            .replace(/{{trigger_notifikasi}}/g, triggerNotif)

          const groupIds = settings.wa_stock_low_group_id ? settings.wa_stock_low_group_id.split(',').map((g: string) => g.trim()).filter(Boolean) : []
          
          if (groupIds.length > 0) {
            const results = await Promise.all(groupIds.map(async (groupId: string) => {
              try {
                const res = await fetch('https://api.watzap.id/v1/send_message_group', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    api_key: apiKey,
                    number_key: numberKey,
                    group_id: groupId,
                    message: formattedMessage,
                  }),
                })
                const result = await res.json()
                if (result.status === '200' || result.status === 200 || result.message?.toLowerCase().includes('success')) {
                  return { success: true }
                } else {
                  return { success: false, message: result.message || `Watzap status: ${result.status}` }
                }
              } catch (e: any) {
                return { success: false, message: e.message || 'Fetch error' }
              }
            }))
            isGroupSent = results.some(r => r.success)
            if (!isGroupSent) {
              const firstFail = results.find(r => !r.success)
              lastErrorMessage = firstFail?.message || 'Failed to send to any low stock groups'
            }
          } else {
            lastErrorMessage = 'No low stock groups configured'
          }
        }

        // --- TYPE: LOAN RETURN ---
        else if (type === 'loan_return') {
          requester_name = payload.requester_name || ''
          requester_phone = payload.requester_phone || ''
          
          const { 
            loan_request_id, barang_kembali, barang_belum_kembali, waktu_pinjam, 
            batas_pengembalian, is_finished 
          } = payload

          const personalTemplate = is_finished 
            ? (settings.wa_return_finished_message_format || settings.wa_return_message_format || '')
            : (settings.wa_return_message_format || '')

          if (requester_phone && personalTemplate) {
            const formattedMessage = personalTemplate
              .replace(/{{nama_peminjam}}/g, requester_name || 'Peminjam')
              .replace(/{{nomor_peminjam}}/g, requester_phone ? `+62${requester_phone}` : '-')
              .replace(/{{barang_kembali}}/g, barang_kembali || '')
              .replace(/{{barang_belum_kembali}}/g, barang_belum_kembali || '')
              .replace(/{{waktu_pinjam}}/g, formatDate(waktu_pinjam))
              .replace(/{{batas_pengembalian}}/g, formatDate(batas_pengembalian))

            const res = await fetch('https://api.watzap.id/v1/send_message', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                api_key: apiKey,
                number_key: numberKey,
                phone_no: '62' + requester_phone,
                message: formattedMessage,
              }),
            })
            const result = await res.json()
            isPersonalSent = result.status === '200' || result.status === 200 || result.message?.toLowerCase().includes('success')
            if (!isPersonalSent) {
              lastErrorMessage = result.message || 'Failed to send personal loan return message'
            }
          }

          // Send to Return Group if configured
          const groupIds = settings.wa_return_group_id ? settings.wa_return_group_id.split(',').map((g: string) => g.trim()).filter(Boolean) : []
          const groupTemplate = is_finished
            ? (settings.wa_return_finished_group_message_format || settings.wa_return_finished_message_format || '')
            : (settings.wa_return_group_message_format || settings.wa_return_message_format || '')

          if (groupIds.length > 0 && groupTemplate) {
            const formattedGroupMessage = groupTemplate
              .replace(/{{nama_peminjam}}/g, requester_name || 'Peminjam')
              .replace(/{{nomor_peminjam}}/g, requester_phone ? `+62${requester_phone}` : '-')
              .replace(/{{barang_kembali}}/g, barang_kembali || '')
              .replace(/{{barang_belum_kembali}}/g, barang_belum_kembali || '')
              .replace(/{{waktu_pinjam}}/g, formatDate(waktu_pinjam))
              .replace(/{{batas_pengembalian}}/g, formatDate(batas_pengembalian))

            await Promise.all(groupIds.map(async (groupId: string) => {
              try {
                await fetch('https://api.watzap.id/v1/send_message_group', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    api_key: apiKey,
                    number_key: numberKey,
                    group_id: groupId,
                    message: formattedGroupMessage,
                  }),
                })
              } catch (e) {
                console.error(`[WA Dispatcher] Group Return notification error for group ${groupId}:`, e)
              }
            }))
            isGroupSent = true
          }
        }

        // --- TYPE: LOAN REQUEST ---
        else if (type === 'loan_request') {
          requester_name = payload.requester_name || ''
          requester_phone = payload.requester_phone || ''

          const {
            loan_request_id, item_names, item_list, waktu_pinjam, batas_pengembalian
          } = payload

          const personalTemplate = settings.wa_message_format
          if (requester_phone && personalTemplate) {
            const formattedMessage = personalTemplate
              .replace(/{{nama_peminjam}}/g, requester_name || '')
              .replace(/{{nomor_peminjam}}/g, requester_phone ? `+62${requester_phone}` : '-')
              .replace(/{{nama_barang}}/g, item_names || '')
              .replace(/{{list_barang}}/g, item_list || '')
              .replace(/{{waktu_pinjam}}/g, formatDate(waktu_pinjam))
              .replace(/{{batas_pengembalian}}/g, formatDate(batas_pengembalian))

            const res = await fetch('https://api.watzap.id/v1/send_message', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                api_key: apiKey,
                number_key: numberKey,
                phone_no: '62' + requester_phone,
                message: formattedMessage,
              }),
            })
            const result = await res.json()
            isPersonalSent = result.status === '200' || result.status === 200 || result.message?.toLowerCase().includes('success')
            if (!isPersonalSent) {
              lastErrorMessage = result.message || 'Failed to send personal loan request notification'
            }
          }

          // Send to Loan Request Group if configured
          const groupIds = settings.wa_group_id ? settings.wa_group_id.split(',').map((g: string) => g.trim()).filter(Boolean) : []
          const groupTemplate = settings.wa_group_message_format

          if (groupIds.length > 0 && groupTemplate) {
            const formattedGroupMessage = groupTemplate
              .replace(/{{nama_peminjam}}/g, requester_name || '')
              .replace(/{{nomor_peminjam}}/g, requester_phone ? `+62${requester_phone}` : '-')
              .replace(/{{nama_barang}}/g, item_names || '')
              .replace(/{{list_barang}}/g, item_list || '')
              .replace(/{{waktu_pinjam}}/g, formatDate(waktu_pinjam))
              .replace(/{{batas_pengembalian}}/g, formatDate(batas_pengembalian))

            await Promise.all(groupIds.map(async (groupId: string) => {
              try {
                await fetch('https://api.watzap.id/v1/send_message_group', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    api_key: apiKey,
                    number_key: numberKey,
                    group_id: groupId,
                    message: formattedGroupMessage,
                  }),
                })
              } catch (e) {
                console.error(`[WA Dispatcher] Group Loan Request notification error for group ${groupId}:`, e)
              }
            }))
            isGroupSent = true
          }
        }

        // --- TYPE: LOAN APPROVED ---
        else if (type === 'loan_approved') {
          requester_name = payload.requester_name || ''
          requester_phone = payload.requester_phone || ''

          const {
            loan_request_id, item_list, waktu_pinjam, batas_pengembalian
          } = payload

          const personalTemplate = settings.wa_approved_message_format
          if (requester_phone && personalTemplate) {
            const formattedMessage = personalTemplate
              .replace(/{{nama_peminjam}}/g, requester_name || '')
              .replace(/{{nomor_peminjam}}/g, requester_phone ? `+62${requester_phone}` : '-')
              .replace(/{{list_barang}}/g, item_list || '')
              .replace(/{{waktu_pinjam}}/g, formatDate(waktu_pinjam))
              .replace(/{{batas_pengembalian}}/g, formatDate(batas_pengembalian))

            const res = await fetch('https://api.watzap.id/v1/send_message', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                api_key: apiKey,
                number_key: numberKey,
                phone_no: '62' + requester_phone,
                message: formattedMessage,
              }),
            })
            const result = await res.json()
            isPersonalSent = result.status === '200' || result.status === 200 || result.message?.toLowerCase().includes('success')
            if (!isPersonalSent) {
              lastErrorMessage = result.message || 'Failed to send personal loan approval notification'
            }
          }
        }

        // --- TYPE: LOAN REJECTED ---
        else if (type === 'loan_rejected') {
          requester_name = payload.requester_name || ''
          requester_phone = payload.requester_phone || ''

          const {
            loan_request_id, item_list, waktu_pinjam, alasan_penolakan
          } = payload

          const personalTemplate = settings.wa_rejected_message_format
          if (requester_phone && personalTemplate) {
            const formattedMessage = personalTemplate
              .replace(/{{nama_peminjam}}/g, requester_name || '')
              .replace(/{{nomor_peminjam}}/g, requester_phone ? `+62${requester_phone}` : '-')
              .replace(/{{list_barang}}/g, item_list || '')
              .replace(/{{waktu_pinjam}}/g, formatDate(waktu_pinjam))
              .replace(/{{alasan_penolakan}}/g, alasan_penolakan || '-')

            const res = await fetch('https://api.watzap.id/v1/send_message', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                api_key: apiKey,
                number_key: numberKey,
                phone_no: '62' + requester_phone,
                message: formattedMessage,
              }),
            })
            const result = await res.json()
            isPersonalSent = result.status === '200' || result.status === 200 || result.message?.toLowerCase().includes('success')
            if (!isPersonalSent) {
              lastErrorMessage = result.message || 'Failed to send personal loan rejection notification'
            }
          }
        }

        // --- TYPE: OVERDUE ---
        else if (type === 'overdue') {
          requester_name = payload.requester_name || ''
          requester_phone = payload.requester_phone || ''

          const {
            loan_request_id, barang_belum_kembali, waktu_pinjam, batas_pengembalian,
            item_names, item_list
          } = payload

          const personalTemplate = settings.wa_overdue_message_format
          if (requester_phone && personalTemplate) {
            const formattedMessage = personalTemplate
              .replace(/{{nama_peminjam}}/g, requester_name || '')
              .replace(/{{nomor_peminjam}}/g, requester_phone ? `+62${requester_phone}` : '-')
              .replace(/{{nama_barang}}/g, item_names || '')
              .replace(/{{list_barang}}/g, item_list || '')
              .replace(/{{barang_belum_kembali}}/g, barang_belum_kembali || '')
              .replace(/{{waktu_pinjam}}/g, waktu_pinjam || '')
              .replace(/{{batas_pengembalian}}/g, batas_pengembalian || '')

            const res = await fetch('https://api.watzap.id/v1/send_message', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                api_key: apiKey,
                number_key: numberKey,
                phone_no: '62' + requester_phone,
                message: formattedMessage,
              }),
            })
            const result = await res.json()
            isPersonalSent = result.status === '200' || result.status === 200 || result.message?.toLowerCase().includes('success')
            if (!isPersonalSent) {
              lastErrorMessage = result.message || 'Failed to send personal overdue reminder'
            }
          }

          // Send to Overdue Group if configured
          const groupIds = settings.wa_overdue_group_id ? settings.wa_overdue_group_id.split(',').map((g: string) => g.trim()).filter(Boolean) : []
          let groupItemTemplate = settings.wa_overdue_group_message_format || ''

          if (groupIds.length > 0 && groupItemTemplate) {
            // Check if it has [DATA_START] and [DATA_END] tags (legacy aggregated format)
            const startIndex = groupItemTemplate.indexOf('[DATA_START]')
            const endIndex = groupItemTemplate.indexOf('[DATA_END]')
            
            let finalGroupMessage = ''
            if (startIndex !== -1 && endIndex !== -1) {
              const header = groupItemTemplate.substring(0, startIndex).trim()
              const footer = groupItemTemplate.substring(endIndex + '[DATA_END]'.length).trim()
              const innerTemplate = groupItemTemplate.substring(startIndex + '[DATA_START]'.length, endIndex).trim()

              const formattedItem = innerTemplate
                .replace(/{{nama_peminjam}}/g, requester_name || '')
                .replace(/{{nomor_peminjam}}/g, requester_phone ? `+62${requester_phone}` : '-')
                .replace(/{{nama_barang}}/g, item_names || '')
                .replace(/{{list_barang}}/g, item_list || '')
                .replace(/{{barang_belum_kembali}}/g, barang_belum_kembali || '')
                .replace(/{{waktu_pinjam}}/g, waktu_pinjam || '')
                .replace(/{{batas_pengembalian}}/g, batas_pengembalian || '')

              finalGroupMessage = `${header}\n\n${formattedItem}\n\n${footer}`
            } else {
              finalGroupMessage = groupItemTemplate
                .replace(/{{nama_peminjam}}/g, requester_name || '')
                .replace(/{{nomor_peminjam}}/g, requester_phone ? `+62${requester_phone}` : '-')
                .replace(/{{nama_barang}}/g, item_names || '')
                .replace(/{{list_barang}}/g, item_list || '')
                .replace(/{{barang_belum_kembali}}/g, barang_belum_kembali || '')
                .replace(/{{waktu_pinjam}}/g, waktu_pinjam || '')
                .replace(/{{batas_pengembalian}}/g, batas_pengembalian || '')
            }

            await Promise.all(groupIds.map(async (groupId: string) => {
              try {
                await fetch('https://api.watzap.id/v1/send_message_group', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    api_key: apiKey,
                    number_key: numberKey,
                    group_id: groupId,
                    message: finalGroupMessage,
                  }),
                })
              } catch (e) {
                console.error(`[WA Dispatcher] Group Overdue reminder error for group ${groupId}:`, e)
              }
            }))
            isGroupSent = true
          }
        }

        // Determine general status
        const isSuccess = (type === 'low_stock') ? isGroupSent : (isPersonalSent || isGroupSent)

        if (isSuccess) {
          successCount++
          await supabase
            .from('whatsapp_queue')
            .update({ status: 'sent', updated_at: new Date().toISOString() })
            .eq('id', id)

          // Insert elegant activity log for reminder sent successfully
          await supabase.from('activity_logs').insert({
            action: 'REMINDER',
            entity_type: type === 'low_stock' ? 'ITEM' : 'LOAN_REQUEST',
            entity_id: type === 'low_stock' ? payload.item_id : payload.loan_request_id,
            details: {
              type: `WhatsApp Dispatcher: ${type}`,
              status: 'Sent Successfully',
              recipient: type === 'low_stock' ? 'Groups' : `${requester_name} (${requester_phone})`,
              details: payload
            },
            ip_address: 'System/Dispatcher',
            user_agent: 'System/Dispatcher'
          })
        } else {
          failCount++
          await supabase
            .from('whatsapp_queue')
            .update({ 
              status: 'failed', 
              error_message: lastErrorMessage || 'Unknown error during dispatching', 
              updated_at: new Date().toISOString() 
            })
            .eq('id', id)
        }

      } catch (err: any) {
        console.error(`[WA Dispatcher] Exception processing item ${id}:`, err)
        failCount++
        await supabase
          .from('whatsapp_queue')
          .update({ 
            status: 'failed', 
            error_message: err.message || 'Unexpected exception', 
            updated_at: new Date().toISOString() 
          })
          .eq('id', id)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${queueItems.length} messages. Success: ${successCount}, Failed: ${failCount}`
    })

  } catch (error: any) {
    console.error('[WA Dispatcher] Fatal error:', error)
    return NextResponse.json({ error: error.message || 'Fatal internal error' }, { status: 500 })
  }
}
