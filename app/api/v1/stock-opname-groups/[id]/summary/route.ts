import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
const serverError = (msg: string) => NextResponse.json({ error: msg }, { status: 500 })

/**
 * GET /api/v1/stock-opname-groups/[id]/summary
 * Calculates stock opname coverage statistics across all warehouses
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  // Admin role check
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // 1. Fetch all active items
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('id, name')
      .eq('status', 'active')

    if (itemsError) throw itemsError

    // 2. Fetch all warehouses
    const { data: warehouses, error: warehousesError } = await supabase
      .from('warehouses')
      .select('id, name')

    if (warehousesError) throw warehousesError

    // 3. Fetch all recorded stock opname items in this group
    const { data: recorded, error: recordedError } = await supabase
      .from('stock_opname_group_items')
      .select('item_id, warehouse_id')
      .eq('group_id', groupId)

    if (recordedError) throw recordedError

    const itemsList = items || []
    const warehousesList = warehouses || []
    const recordedList = recorded || []

    // Build a lookup set of recorded items: `${item_id}_${warehouse_id}`
    const recordedKeys = new Set(recordedList.map(r => `${r.item_id}_${r.warehouse_id}`))

    // 4. Generate all unrecorded combinations
    const unrecordedItems: { item_name: string; warehouse_name: string }[] = []
    
    for (const warehouse of warehousesList) {
      for (const item of itemsList) {
        const key = `${item.id}_${warehouse.id}`
        if (!recordedKeys.has(key)) {
          unrecordedItems.push({
            item_name: item.name,
            warehouse_name: warehouse.name
          })
        }
      }
    }

    const recordedCount = recordedList.length
    const unrecordedCount = unrecordedItems.length
    const totalCount = itemsList.length * warehousesList.length

    return NextResponse.json({
      success: true,
      summary: {
        recordedCount,
        unrecordedCount,
        totalCount,
        unrecordedItems
      }
    })
  } catch (err: any) {
    console.error('[API] Unexpected Error in Group Summary:', err)
    return serverError(err.message || 'Internal Server Error')
  }
}
