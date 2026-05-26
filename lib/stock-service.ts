import { createAdminClient } from './supabase/server'

/**
 * Resolves a warehouse ID, falling back to the default warehouse or first available if null/undefined.
 */
async function resolveWarehouseId(adminClient: any, warehouseId?: string | null): Promise<string> {
  if (warehouseId) {
    return warehouseId
  }

  // 1. Try to find the default warehouse
  const { data: defaultWh } = await adminClient
    .from('warehouses')
    .select('id')
    .eq('is_default', true)
    .maybeSingle()

  if (defaultWh?.id) {
    return defaultWh.id
  }

  // 2. Try to find the first available warehouse
  const { data: firstWh } = await adminClient
    .from('warehouses')
    .select('id')
    .limit(1)
    .maybeSingle()

  if (firstWh?.id) {
    return firstWh.id
  }

  throw new Error('Tidak ada gudang terdaftar dalam sistem.')
}

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
 * Records a stock increase.
 * Activity logging and threshold validation are handled automatically by database triggers.
 */
export async function addStock(params: {
  itemId: string,
  warehouseId?: string | null,
  quantity: number,
  note?: string,
  userId: string
}) {
  const adminClient = createAdminClient()
  const resolvedWarehouseId = await resolveWarehouseId(adminClient, params.warehouseId)
  
  const { data, error } = await adminClient.from('stock_in').insert({
    item_id: params.itemId,
    warehouse_id: resolvedWarehouseId,
    quantity: params.quantity,
    note: params.note,
    created_by: params.userId
  }).select('*, item:item_id(name), warehouse:warehouse_id(name)').single()
  
  if (error) throw error
  
  // Trigger WhatsApp dispatcher to process any queued alerts immediately in the background
  triggerWAQueueDispatcher()

  return data
}

/**
 * Records a stock decrease.
 * Activity logging and threshold validation are handled automatically by database triggers.
 */
export async function reduceStock(params: {
  itemId: string,
  warehouseId?: string | null,
  quantity: number,
  note?: string,
  userId: string
}) {
  const adminClient = createAdminClient()
  const resolvedWarehouseId = await resolveWarehouseId(adminClient, params.warehouseId)
  
  const { data, error } = await adminClient.from('stock_out').insert({
    item_id: params.itemId,
    warehouse_id: resolvedWarehouseId,
    quantity: params.quantity,
    note: params.note,
    created_by: params.userId
  }).select('*, item:item_id(name), warehouse:warehouse_id(name)').single()
  
  if (error) throw error
  
  // Trigger WhatsApp dispatcher to process any queued alerts immediately in the background
  triggerWAQueueDispatcher()

  return data
}

/**
 * Moves stock from one warehouse to another.
 * Activity logging and threshold validation are handled automatically by database triggers.
 */
export async function transferStock(params: {
  itemId: string,
  fromWarehouseId: string,
  toWarehouseId: string,
  quantity: number,
  note?: string,
  userId: string
}) {
  const adminClient = createAdminClient()
  
  // 1. Create Master Transfer
  const { data: transfer, error: transferError } = await adminClient.from('stock_transfers').insert({
    item_id: params.itemId,
    from_warehouse_id: params.fromWarehouseId,
    to_warehouse_id: params.toWarehouseId,
    quantity: params.quantity,
    note: params.note,
    created_by: params.userId
  }).select('*, item:item_id(name), from:from_warehouse_id(name), to:to_warehouse_id(name)').single()
  
  if (transferError) throw transferError
  
  // 2. Reduce from source (OUT)
  await adminClient.from('stock_out').insert({
    item_id: params.itemId,
    warehouse_id: params.fromWarehouseId,
    quantity: params.quantity,
    note: `[TRANSFER] Ke ${transfer.to?.name}${params.note ? ` - ${params.note}` : ''}`,
    created_by: params.userId,
    transfer_id: transfer.id
  })
  
  // 3. Add to destination (IN)
  await adminClient.from('stock_in').insert({
    item_id: params.itemId,
    warehouse_id: params.toWarehouseId,
    quantity: params.quantity,
    note: `[TRANSFER] Dari ${transfer.from?.name}${params.note ? ` - ${params.note}` : ''}`,
    created_by: params.userId,
    transfer_id: transfer.id
  })
  
  // Trigger WhatsApp dispatcher to process any queued alerts immediately in the background
  triggerWAQueueDispatcher()

  return transfer
}

/**
 * Helper function to trigger the WhatsApp dispatcher asynchronously.
 */
export function triggerWAQueueDispatcher() {
  const cronSecret = process.env.CRON_SECRET || ''
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const dispatcherUrl = `${baseUrl}/api/v1/webhooks/whatsapp-dispatcher?secret=${cronSecret}`
  
  fetch(dispatcherUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-cron-secret': cronSecret
    }
  }).catch(err => {
    console.error('[StockService] Background dispatcher trigger failed:', err)
  })
}
