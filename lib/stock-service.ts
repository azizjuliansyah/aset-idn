import { createAdminClient } from './supabase/server'
import { createActivityLog } from './logger'
import { format } from 'date-fns'
import { id as localeID } from 'date-fns/locale'

/**
 * Calculates the total current stock of an item across all warehouses.
 */
export async function getStockBalance(itemId: string) {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient.rpc('get_all_stock_balances')
  if (error) throw error
  
  const balances = data as { item_id: string; balance: number | string }[]
  const itemBalance = balances
    .filter(b => b.item_id === itemId)
    .reduce((acc, b) => acc + Number(b.balance), 0)
    
  return itemBalance
}

/**
 * Validates current stock against minimum threshold and sends WA alert if needed.
 */
export async function validateStockThreshold(itemId: string, triggerQuantity?: number, triggerAction: 'IN' | 'OUT' = 'OUT') {
  const adminClient = createAdminClient()
  
  // 1. Get current stock
  const currentStock = await getStockBalance(itemId)
  
  // 2. Get item info
  const { data: item } = await adminClient
    .from('items')
    .select('name, minimum_stock')
    .eq('id', itemId)
    .single()
    
  if (!item) return
  
  const actionLabel = triggerAction === 'IN' ? 'masuk' : 'keluar'
  
  // 3. Check threshold (current stock <= minimum_stock)
  if (triggerAction === 'OUT' && currentStock <= (item.minimum_stock ?? 0)) {
    // 4. Send WA Alert
    const triggerNotif = triggerQuantity 
      ? `ada barang ${actionLabel} ${triggerQuantity}pcs`
      : '-'
      
    await sendLowStockAlert(item.name, currentStock, item.minimum_stock ?? 0, triggerNotif)
  }
}

/**
 * Sends a WhatsApp group message for low stock alert.
 */
async function sendLowStockAlert(itemName: string, currentStock: number, minStock: number, triggerNotif: string) {
  const adminClient = createAdminClient()
  
  // Get settings
  const { data: settings } = await adminClient
    .from('company_settings')
    .select('*')
    .single()
    
  if (!settings?.wa_stock_low_message_format) return
  
  const groupIds = settings.wa_stock_low_group_id.split(',').map((id: string) => id.trim()).filter(Boolean)
  if (groupIds.length === 0) return
  
  const rawFormat = settings.wa_stock_low_message_format || `⚠️ *STOK MINIMUM TERCAPAI*\n\nBarang: *{{nama_barang}}*\nStok Saat Ini: *{{stok_saat_ini}}*\nBatas Minimum: *{{batas_minimum}}*\n\n_#trigger notifikasi_:\n{{trigger_notifikasi}}\n\nMohon segera lakukan pengadaan barang.`

  const message = rawFormat
    .replace(/{{nama_barang}}/g, itemName)
    .replace(/{{stok_saat_ini}}/g, currentStock.toString())
    .replace(/{{batas_minimum}}/g, minStock.toString())
    .replace(/{{trigger_notifikasi}}/g, triggerNotif)

  const apiKey = settings?.wa_api_key || process.env.WATZAP_API_KEY
  const numberKey = settings?.wa_number_key || process.env.WATZAP_NUMBER_KEY
  
  if (!apiKey || !numberKey) {
    console.error('[StockService] Watzap credentials missing')
    return
  }

  // Send to all groups
  await Promise.all(groupIds.map(async (groupId: string) => {
    try {
      const res = await fetch('https://api.watzap.id/v1/send_message_group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          number_key: numberKey,
          group_id: groupId,
          message: message,
        }),
      })
      const result = await res.json()
      if (result.status !== '200' && result.status !== 200) {
        console.error(`[StockService] Failed to send to group ${groupId}:`, result)
      }
    } catch (e) {
      console.error(`[StockService] Error sending alert to group ${groupId}:`, e)
    }
  }))
}

/**
 * Sends a WhatsApp notification when items are returned.
 */
export async function sendLoanReturnAlert(loanId: string, returnedItems: { name: string, quantity: number }[]) {
  const adminClient = createAdminClient()
  
  // 1. Get Settings
  const { data: settings } = await adminClient.from('company_settings').select('*').single()
  if (!settings?.wa_return_message_format) return

  // 2. Get Loan & Requester info
  const { data: loan } = await adminClient
    .from('loan_requests')
    .select('*, requester:requested_by(full_name, phone)')
    .eq('id', loanId)
    .single()
    
  if (!loan || !loan.requester?.phone) return
  
  // 3. Get all items to check what's still borrowed
  const { data: allItems } = await adminClient
    .from('loan_items')
    .select('quantity, returned_quantity, item:item_id(name)')
    .eq('loan_request_id', loanId)
    .eq('status', 'approved')

  const isFinished = (allItems || []).every((item: any) => (item.returned_quantity || 0) >= item.quantity)
  
  const barangKembali = returnedItems.map(item => `- ${item.name} (${item.quantity} pcs)`).join('\n')
  
  const belumKembali = (allItems || [])
    .filter((item: any) => (item.returned_quantity || 0) < item.quantity)
    .map((item: any) => `- ${item.item?.name} (${item.quantity - (item.returned_quantity || 0)} pcs)`)
    .join('\n') || '- Semua barang telah dikembalikan'

  const loanDate = loan.loan_date ? format(new Date(loan.loan_date), 'dd MMMM yyyy HH:mm', { locale: localeID }) : '-'
  const returnDate = loan.return_date ? format(new Date(loan.return_date), 'dd MMMM yyyy HH:mm', { locale: localeID }) : '-'

  // 4. Format Message
  const personalTemplate = (isFinished && settings.wa_return_finished_message_format) 
    ? settings.wa_return_finished_message_format 
    : settings.wa_return_message_format

  const message = personalTemplate
    .replace(/{{nama_peminjam}}/g, loan.requester.full_name || 'Peminjam')
    .replace(/{{nomor_peminjam}}/g, loan.requester.phone ? `+62${loan.requester.phone}` : '-')
    .replace(/{{barang_kembali}}/g, barangKembali)
    .replace(/{{barang_belum_kembali}}/g, belumKembali)
    .replace(/{{waktu_pinjam}}/g, loanDate)
    .replace(/{{batas_pengembalian}}/g, returnDate)

  // 5. Send via Watzap
  const apiKey = settings?.wa_api_key || process.env.WATZAP_API_KEY
  const numberKey = settings?.wa_number_key || process.env.WATZAP_NUMBER_KEY
  if (!apiKey || !numberKey) return

  // 5.1 Personal Notification (Borrower)
  try {
    const res = await fetch('https://api.watzap.id/v1/send_message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        number_key: numberKey,
        phone_no: '62' + loan.requester.phone,
        message: message,
      }),
    })
    const result = await res.json()
    if (result.status !== '200' && result.status !== 200) {
      console.error('[StockService] Failed to send personal return alert:', result)
    }
  } catch (e) {
    console.error('[StockService] Error sending personal return alert:', e)
  }

  // 5.2 Group Notification (if configured)
  if (settings.wa_return_group_id) {
    const groupIds = settings.wa_return_group_id.split(',').map((id: string) => id.trim()).filter(Boolean)
    
    if (groupIds.length > 0) {
      const groupTemplate = (isFinished && settings.wa_return_finished_group_message_format)
        ? settings.wa_return_finished_group_message_format
        : (settings.wa_return_group_message_format || settings.wa_return_message_format)
        
      const groupMessage = groupTemplate
        .replace(/{{nama_peminjam}}/g, loan.requester.full_name || 'Peminjam')
        .replace(/{{nomor_peminjam}}/g, loan.requester.phone ? `+62${loan.requester.phone}` : '-')
        .replace(/{{barang_kembali}}/g, barangKembali)
        .replace(/{{barang_belum_kembali}}/g, belumKembali)
        .replace(/{{waktu_pinjam}}/g, loanDate)
        .replace(/{{batas_pengembalian}}/g, returnDate)

      await Promise.all(groupIds.map(async (groupId: string) => {
        try {
          const res = await fetch('https://api.watzap.id/v1/send_message_group', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              api_key: apiKey,
              number_key: numberKey,
              group_id: groupId,
              message: groupMessage,
            }),
          })
          const result = await res.json()
          if (result.status !== '200' && result.status !== 200) {
            console.error(`[StockService] Failed to send return alert to group ${groupId}:`, result)
          }
        } catch (e) {
          console.error(`[StockService] Error sending return alert to group ${groupId}:`, e)
        }
      }))
    }
  }
}

/**
 * Records a stock increase and triggers validation.
 */
export async function addStock(params: {
  itemId: string,
  warehouseId: string,
  quantity: number,
  note?: string,
  userId: string
}) {
  const adminClient = createAdminClient()
  
  const { data, error } = await adminClient.from('stock_in').insert({
    item_id: params.itemId,
    warehouse_id: params.warehouseId,
    quantity: params.quantity,
    note: params.note,
    created_by: params.userId
  }).select('*, item:item_id(name), warehouse:warehouse_id(name)').single()
  
  if (error) throw error
  
  await createActivityLog({
    action: 'CREATE',
    entityType: 'STOCK_IN',
    entityId: data.id,
    details: { 
      item_name: data.item?.name, 
      quantity: data.quantity, 
      warehouse_name: data.warehouse?.name 
    }
  })
  
  // Validate after adding
  await validateStockThreshold(params.itemId, params.quantity, 'IN')
  
  return data
}

/**
 * Records a stock decrease and triggers validation.
 */
export async function reduceStock(params: {
  itemId: string,
  warehouseId: string,
  quantity: number,
  note?: string,
  userId: string
}) {
  const adminClient = createAdminClient()
  
  const { data, error } = await adminClient.from('stock_out').insert({
    item_id: params.itemId,
    warehouse_id: params.warehouseId,
    quantity: params.quantity,
    note: params.note,
    created_by: params.userId
  }).select('*, item:item_id(name), warehouse:warehouse_id(name)').single()
  
  if (error) throw error
  
  await createActivityLog({
    action: 'CREATE',
    entityType: 'STOCK_OUT',
    entityId: data.id,
    details: { 
      item_name: data.item?.name, 
      quantity: data.quantity, 
      warehouse_name: data.warehouse?.name 
    }
  })
  
  // Validate after reducing
  await validateStockThreshold(params.itemId, params.quantity, 'OUT')
  
  return data
}
