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
  if (profile?.role !== 'admin' && profile?.role !== 'general_affair') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // 1. Fetch group with template
    const { data: group, error: groupError } = await supabase
      .from('stock_opname_groups')
      .select('template_id, template:stock_opname_templates(warehouse_id, warehouse:warehouses(id, name), items:stock_opname_template_items(item_id, item:items(id, name)))')
      .eq('id', groupId)
      .single()

    if (groupError) throw groupError

    const template = group?.template as any
    const warehouseId: string | null = template?.warehouse_id ?? null
    const warehouseName: string = template?.warehouse?.name ?? '—'

    // Template items as source of truth; fallback to all active items if no template
    let itemsList: { id: string; name: string }[] = []
    if (template?.items?.length) {
      itemsList = template.items.map((ti: any) => ({ id: ti.item_id, name: ti.item?.name ?? ti.item_id }))
    } else {
      const { data: allItems } = await supabase.from('items').select('id, name').eq('status', 'active')
      itemsList = allItems ?? []
    }

    // 2. Fetch recorded entries for this group
    const { data: recorded, error: recordedError } = await supabase
      .from('stock_opname_group_items')
      .select('item_id, warehouse_id')
      .eq('group_id', groupId)

    if (recordedError) throw recordedError

    const recordedList = recorded || []
    const recordedSet = new Set(recordedList.map(r => r.item_id))

    // 3. Compute unrecorded items scoped to template warehouse
    const unrecordedItems: { item_name: string; warehouse_name: string }[] = []
    for (const item of itemsList) {
      if (!recordedSet.has(item.id)) {
        unrecordedItems.push({ item_name: item.name, warehouse_name: warehouseName })
      }
    }

    const recordedCount = recordedList.length
    const unrecordedCount = unrecordedItems.length
    const totalCount = itemsList.length

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
