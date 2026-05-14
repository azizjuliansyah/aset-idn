import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createActivityLog } from '@/lib/logger'
import { addStock, reduceStock } from '@/lib/stock-service'

function authError() { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

// POST /api/v1/stock-opname-groups/[id]/finalize
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return authError()

  // 1. Fetch group and its entries
  const { data: group, error: groupError } = await supabase
    .from('stock_opname_groups')
    .select('id, name, description, status, created_by, created_at, entries:stock_opnames(id, group_id, item_id, warehouse_id, system_stock, actual_stock, note, created_at)')
    .eq('id', id)
    .single()

  if (groupError) return NextResponse.json({ error: groupError.message }, { status: 500 })
  if (group.status === 'completed') {
    return NextResponse.json({ error: 'Group sudah selesai' }, { status: 400 })
  }

  const rawEntries = group.entries || []
  if (rawEntries.length === 0) {
    return NextResponse.json({ error: 'Tidak ada item untuk difinalisasi' }, { status: 400 })
  }

  // Calculate difference for each entry
  const entries = rawEntries.map((e: any) => ({
    ...e,
    difference: e.actual_stock - e.system_stock
  }))

  try {
    // 2. Perform adjustments for each entry
    for (const entry of entries) {
      const { item_id, warehouse_id, difference, note } = entry
      
      if (!difference || difference === 0) continue

      const adjustmentNote = `[OPNAME] Penyesuaian dari group: ${group.name}${note ? ` - ${note}` : ''}`

      if (difference > 0) {
        // Stock Increase
        await addStock({
          itemId: item_id,
          warehouseId: warehouse_id,
          quantity: difference,
          note: adjustmentNote,
          userId: user.id
        })
      } else {
        // Stock Decrease
        await reduceStock({
          itemId: item_id,
          warehouseId: warehouse_id,
          quantity: Math.abs(difference),
          note: adjustmentNote,
          userId: user.id
        })
      }
    }

    // 3. Update group status
    const { error: updateError } = await supabase
      .from('stock_opname_groups')
      .update({ 
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) throw updateError

    // 4. Log activity
    await createActivityLog({
      action: 'UPDATE',
      entityType: 'STOCK_OPNAME_GROUP',
      entityId: group.id,
      details: { name: group.name, status: 'completed', message: 'Finalized opname and adjusted stock' }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[StockOpname] Finalization error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
