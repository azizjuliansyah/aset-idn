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
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    // We query against the view we created: stock_opname_entries_view
    let query = supabase
      .from('stock_opname_entries_view')
      .select('*', { count: 'exact' })
      .eq('group_id', groupId)

    // Search by item name
    if (search) {
      query = query.ilike('item_name', `%${search}%`)
    }

    // Warehouse filter
    if (warehouseId && warehouseId !== 'all') {
      query = query.eq('warehouse_id', warehouseId)
    }

    // Category filter
    if (categoryId && categoryId !== 'all') {
      query = query.eq('item_category_id', categoryId)
    }

    // Discrepancy filter
    if (filterType && filterType !== 'all') {
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

    // Date filters
    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      // Add 1 day to include the entire end date (if it's just YYYY-MM-DD)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      query = query.lte('created_at', end.toISOString())
    }

    // Apply pagination
    query = query.range(from, to).order('created_at', { ascending: false })

    const { data, error, count } = await query

    if (error) {
      console.error('[API] Entries Fetch Error:', error)
      return serverError(error.message)
    }

    // Format the response back to what the frontend expects 
    // to minimize frontend refactoring (nested objects)
    const formattedData = data.map((row: any) => ({
      id: row.id,
      group_id: row.group_id,
      item_id: row.item_id,
      warehouse_id: row.warehouse_id,
      system_stock: row.system_stock,
      actual_stock: row.actual_stock,
      physical_stock: row.actual_stock, // For backward compatibility
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
      }
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
