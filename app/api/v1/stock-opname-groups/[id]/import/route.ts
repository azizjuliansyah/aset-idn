import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
const badRequest = (msg: string) => NextResponse.json({ error: msg }, { status: 400 })
const serverError = (msg: string) => NextResponse.json({ error: msg }, { status: 500 })

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  try {
    // Check group status
    const { data: group, error: groupError } = await supabase
      .from('stock_opname_groups')
      .select('status')
      .eq('id', groupId)
      .single()

    if (groupError || !group) {
      return badRequest('Grup stock opname tidak ditemukan')
    }

    if (group.status !== 'draft') {
      return badRequest('Grup opname sudah selesai, tidak dapat mengimpor data barang lagi')
    }

    const body = await request.json()
    const { rows } = body

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return badRequest('Data baris kosong atau tidak valid')
    }

    // 1. Fetch all items
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('id, name')

    if (itemsError) return serverError(`Gagal memuat daftar barang: ${itemsError.message}`)

    const itemMap = new Map<string, string>()
    items.forEach(item => {
      itemMap.set(item.name.toLowerCase().trim(), item.id)
    })

    // 2. Fetch all warehouses
    const { data: warehouses, error: whError } = await supabase
      .from('warehouses')
      .select('id, name')

    if (whError) return serverError(`Gagal memuat daftar gudang: ${whError.message}`)

    const whMap = new Map<string, string>()
    warehouses.forEach(wh => {
      whMap.set(wh.name.toLowerCase().trim(), wh.id)
    })

    // 3. Fetch current stock from stock ledger for all items and warehouses
    const { data: stockLedger, error: ledgerError } = await supabase
      .from('stock_ledger')
      .select('item_id, warehouse_id, current_stock')

    if (ledgerError) return serverError(`Gagal memuat ledger stok: ${ledgerError.message}`)

    const systemStockMap = new Map<string, number>()
    stockLedger.forEach(ledger => {
      systemStockMap.set(`${ledger.item_id}_${ledger.warehouse_id}`, ledger.current_stock)
    })

    // 4. Fetch existing entries in this group to know whether to insert or update
    const { data: existingEntries, error: entriesError } = await supabase
      .from('stock_opnames')
      .select('id, item_id, warehouse_id')
      .eq('group_id', groupId)

    if (entriesError) return serverError(`Gagal memuat entri opname: ${entriesError.message}`)

    const existingEntriesMap = new Map<string, string>() // `${itemId}_${whId}` -> entryId
    existingEntries.forEach(entry => {
      existingEntriesMap.set(`${entry.item_id}_${entry.warehouse_id}`, entry.id)
    })

    const newEntries: any[] = []
    const updateEntries: any[] = []
    const errors: Array<{ row: number; message: string }> = []

    let rowNum = 1 // Row 1 is header usually, so rows start from index 0 -> rowNum 2
    for (const row of rows) {
      rowNum++
      const rawItemName = row.item_name || ''
      const rawWhName = row.warehouse_name || ''
      const rawActualStock = row.actual_stock
      const note = row.note || ''

      if (!rawItemName.trim()) {
        errors.push({ row: rowNum, message: 'Nama barang kosong' })
        continue
      }
      if (!rawWhName.trim()) {
        errors.push({ row: rowNum, message: 'Nama gudang kosong' })
        continue
      }
      
      const actualStock = parseInt(String(rawActualStock))
      if (isNaN(actualStock) || actualStock < 0) {
        errors.push({ row: rowNum, message: `Stok fisik tidak valid: "${rawActualStock}". Harus berupa angka non-negatif.` })
        continue
      }

      const itemId = itemMap.get(rawItemName.toLowerCase().trim())
      if (!itemId) {
        errors.push({ row: rowNum, message: `Barang "${rawItemName}" tidak ditemukan di sistem` })
        continue
      }

      const warehouseId = whMap.get(rawWhName.toLowerCase().trim())
      if (!warehouseId) {
        errors.push({ row: rowNum, message: `Gudang "${rawWhName}" tidak ditemukan di sistem` })
        continue
      }

      const key = `${itemId}_${warehouseId}`
      const systemStock = systemStockMap.get(key) ?? 0
      const existingEntryId = existingEntriesMap.get(key)

      if (existingEntryId) {
        updateEntries.push({
          id: existingEntryId,
          actual_stock: actualStock,
          note: note,
          diff_category_id: row.diff_category_id || null
        })
      } else {
        newEntries.push({
          group_id: groupId,
          item_id: itemId,
          warehouse_id: warehouseId,
          system_stock: systemStock,
          actual_stock: actualStock,
          note: note,
          created_by: user.id,
          diff_category_id: row.diff_category_id || null
        })
      }
    }

    let importedCount = 0
    let updatedCount = 0

    // Perform database insertions
    if (newEntries.length > 0) {
      const { error: insertError } = await supabase
        .from('stock_opnames')
        .insert(newEntries)

      if (insertError) {
        return serverError(`Gagal mengimpor entri baru: ${insertError.message}`)
      }
      importedCount = newEntries.length
    }

    // Perform database updates
    if (updateEntries.length > 0) {
      const updatePromises = updateEntries.map(entry => 
        supabase
          .from('stock_opnames')
          .update({
            actual_stock: entry.actual_stock,
            note: entry.note,
            diff_category_id: entry.diff_category_id
          })
          .eq('id', entry.id)
      )

      const results = await Promise.all(updatePromises)
      const failedUpdate = results.find(r => r.error)
      if (failedUpdate) {
        return serverError(`Gagal memperbarui beberapa entri: ${failedUpdate.error?.message}`)
      }
      updatedCount = updateEntries.length
    }

    return NextResponse.json({
      success: true,
      summary: {
        imported: importedCount,
        updated: updatedCount,
        failed: errors.length
      },
      errors
    })

  } catch (err: any) {
    console.error('[API] Stock Opname Import Error:', err)
    return serverError(err.message || 'Terjadi kesalahan internal')
  }
}
