import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
const serverError = (msg: string) => NextResponse.json({ error: msg }, { status: 500 })

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params
  const { searchParams } = new URL(request.url)
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  try {
    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // Filters
    const search = searchParams.get('search')
    const warehouseId = searchParams.get('warehouse_id')
    const categoryId = searchParams.get('category_id')
    const filterType = searchParams.get('filter_type')

    if (!warehouseId || warehouseId === 'all') {
      return NextResponse.json({ error: 'Gudang harus dipilih' }, { status: 400 })
    }

    // Get group status to check if it's draft or finalized
    const { data: group } = await supabase
      .from('stock_opname_groups')
      .select('status')
      .eq('id', groupId)
      .single()

    const isDraft = group?.status === 'draft'

    // If draft and filterType is all or unrecorded, we query active items and merge
    if (isDraft && (filterType === 'all' || filterType === 'unrecorded' || !filterType)) {
      // 1. Get recorded item IDs in this group and warehouse
      const { data: recordedEntries } = await supabase
        .from('stock_opname_group_items')
        .select('item_id')
        .eq('group_id', groupId)
        .eq('warehouse_id', warehouseId)

      const recordedItemIds = recordedEntries?.map(r => r.item_id) || []

      // 2. Query items
      let itemsQuery = supabase
        .from('items')
        .select('id, name, item_category_id, category:item_category(name)', { count: 'exact' })
        .eq('status', 'active')

      if (search) {
        itemsQuery = itemsQuery.ilike('name', `%${search}%`)
      }

      if (categoryId && categoryId !== 'all') {
        itemsQuery = itemsQuery.eq('item_category_id', categoryId)
      }

      if (filterType === 'unrecorded' && recordedItemIds.length > 0) {
        // Exclude recorded items
        itemsQuery = itemsQuery.not('id', 'in', `(${recordedItemIds.join(',')})`)
      }

      // Order items alphabetically
      itemsQuery = itemsQuery.range(from, to).order('name', { ascending: true })

      const { data: items, error: itemsError, count } = await itemsQuery

      if (itemsError) {
        console.error('[API] Items Query Error:', itemsError)
        return serverError(itemsError.message)
      }

      const itemIds = items?.map(it => it.id) || []
      let entriesMap: Record<string, any> = {}
      let ledgerMap: Record<string, number> = {}

      if (itemIds.length > 0) {
        // Fetch opname entries for these items
        const { data: entries } = await supabase
          .from('stock_opname_group_items')
          .select('id, item_id, system_stock, actual_stock, difference, note, diff_category_id, created_at, created_by, diff_category:stock_opname_diff_categories(id, name)')
          .eq('group_id', groupId)
          .eq('warehouse_id', warehouseId)
          .in('item_id', itemIds)

        entries?.forEach(e => {
          entriesMap[e.item_id] = e
        })

        // Fetch current stock from ledger for these items
        const { data: ledger } = await supabase
          .from('stock_ledger')
          .select('item_id, current_stock')
          .eq('warehouse_id', warehouseId)
          .in('item_id', itemIds)

        ledger?.forEach(l => {
          ledgerMap[l.item_id] = l.current_stock
        })
      }

      // 3. Format the data
      const formattedData = (items || []).map((item: any) => {
        const entry = entriesMap[item.id]
        const currentStock = ledgerMap[item.id] ?? 0

        if (entry) {
          return {
            id: entry.id,
            group_id: groupId,
            item_id: item.id,
            warehouse_id: warehouseId,
            system_stock: entry.system_stock,
            current_system_stock: currentStock,
            actual_stock: entry.actual_stock,
            physical_stock: entry.actual_stock,
            difference: entry.difference,
            note: entry.note,
            created_at: entry.created_at,
            diff_category_id: entry.diff_category_id,
            diff_category: entry.diff_category,
            item: {
              id: item.id,
              name: item.name,
              item_category_id: item.item_category_id,
              category: item.category
            },
            warehouse: {
              id: warehouseId,
              name: ''
            },
            is_recorded: true
          }
        } else {
          return {
            id: null,
            group_id: groupId,
            item_id: item.id,
            warehouse_id: warehouseId,
            system_stock: currentStock,
            current_system_stock: currentStock,
            actual_stock: null,
            physical_stock: null,
            difference: null,
            note: '',
            created_at: null,
            diff_category_id: null,
            diff_category: null,
            item: {
              id: item.id,
              name: item.name,
              item_category_id: item.item_category_id,
              category: item.category
            },
            warehouse: {
              id: warehouseId,
              name: ''
            },
            is_recorded: false
          }
        }
      })

      return NextResponse.json({
        data: formattedData,
        metadata: {
          totalCount: count || 0,
          page,
          pageSize,
          totalPages: Math.ceil((count || 0) / pageSize)
        }
      })
    }

    // Otherwise, we query from the entries view (for finalized group, or if filterType is discrepancy/recorded)
    let query = supabase
      .from('stock_opname_entries_view')
      .select('*', { count: 'exact' })
      .eq('group_id', groupId)
      .eq('warehouse_id', warehouseId)

    // Search by item name
    if (search) {
      query = query.ilike('item_name', `%${search}%`)
    }

    // Category filter
    if (categoryId && categoryId !== 'all') {
      query = query.eq('item_category_id', categoryId)
    }

    // Discrepancy filter
    if (filterType && filterType !== 'all' && filterType !== 'recorded') {
      if (filterType === 'discrepancy') {
        query = query.neq('difference', 0)
      } else if (filterType === 'match') {
        query = query.eq('difference', 0)
      } else if (filterType === 'discrepancy_plus') {
        query = query.gt('difference', 0)
      } else if (filterType === 'discrepancy_minus') {
        query = query.lt('difference', 0)
      }
    }

    // Apply pagination
    query = query.range(from, to).order('created_at', { ascending: false })

    const { data, error, count } = await query

    if (error) {
      console.error('[API] Entries Fetch Error:', error)
      return serverError(error.message)
    }

    const formattedData = (data || []).map((row: any) => ({
      id: row.id,
      group_id: row.group_id,
      item_id: row.item_id,
      warehouse_id: row.warehouse_id,
      system_stock: row.system_stock,
      current_system_stock: row.current_system_stock,
      actual_stock: row.actual_stock,
      physical_stock: row.actual_stock,
      difference: row.difference,
      note: row.note,
      created_at: row.created_at,
      diff_category_id: row.diff_category_id,
      diff_category: row.diff_category_id ? {
        id: row.diff_category_id,
        name: row.diff_category_name
      } : null,
      item: {
        id: row.item_id,
        name: row.item_name,
        item_category_id: row.item_category_id,
        category: { name: row.category_name }
      },
      warehouse: {
        id: row.warehouse_id,
        name: row.warehouse_name
      },
      is_recorded: true
    }))

    return NextResponse.json({
      data: formattedData,
      metadata: {
        totalCount: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      }
    })
  } catch (err: any) {
    console.error('[API] Unexpected Error in Entries GET:', err)
    return serverError(err.message || 'Internal Server Error')
  }
}
