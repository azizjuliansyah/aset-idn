'use client'

import { useState, useRef, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Loader2,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Download,
  X,
  RefreshCw,
  Info,
  HelpCircle,
  Pencil
} from 'lucide-react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { Combobox } from '@/components/ui/combobox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { StockOpnameEntryDialog } from './stock-opname-entry-dialog'

interface StockOpnameImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: string
  groupName: string
}

interface ParsedRow {
  item_name: string
  warehouse_name: string
  actual_stock: string
  note: string
  isValid: boolean
  validationError?: string
  system_stock?: number | null
  diff_category_id?: string | null
  diff_category_name?: string
  isDuplicate?: boolean
  existingRecord?: {
    id: string
    actual_stock: number
    diff_category_name: string | null
    note: string | null
  } | null
}

interface ImportSummary {
  imported: number
  updated: number
  failed: number
}

interface ServerError {
  row: number
  message: string
}

function validateRowData(
  itemName: string,
  warehouseName: string,
  actualStock: string,
  dbItems?: { id: string; name: string }[],
  dbWarehouses?: { id: string; name: string }[],
  systemStock?: number | null,
  diffCategoryId?: string | null,
  diffCategoryName?: string,
  dbCategories?: { id: string; name: string }[]
): { isValid: boolean; validationError: string } {
  let isValid = true
  let validationError = ''

  const trimmedItemName = itemName.trim()
  const trimmedWarehouseName = warehouseName.trim()

  if (!trimmedItemName) {
    isValid = false
    validationError = 'Nama Barang kosong'
  } else if (!trimmedWarehouseName) {
    isValid = false
    validationError = 'Nama Gudang kosong'
  } else if (actualStock.trim() === '') {
    isValid = false
    validationError = 'Stok Fisik kosong'
  } else {
    const parsedStock = parseInt(actualStock.trim())
    if (isNaN(parsedStock) || parsedStock < 0) {
      isValid = false
      validationError = 'Stok Fisik harus berupa angka >= 0'
    } else if (dbItems && dbItems.length > 0 && !dbItems.some(item => item.name.toLowerCase().trim() === trimmedItemName.toLowerCase())) {
      isValid = false
      validationError = 'Barang tidak terdaftar'
    } else if (dbWarehouses && dbWarehouses.length > 0 && !dbWarehouses.some(wh => wh.name.toLowerCase().trim() === trimmedWarehouseName.toLowerCase())) {
      isValid = false
      validationError = 'Gudang tidak terdaftar'
    } else {
      // Check category name validation if specified in CSV
      if (diffCategoryName && diffCategoryName.trim()) {
        const hasCategory = dbCategories?.some(
          cat => cat.name.toLowerCase().trim() === diffCategoryName.toLowerCase().trim()
        )
        if (dbCategories && dbCategories.length > 0 && !hasCategory) {
          isValid = false
          validationError = 'Kategori Selisih tidak terdaftar'
        }
      }

      // Check if discrepancy category is needed
      if (systemStock !== undefined && systemStock !== null) {
        const diff = parsedStock - systemStock
        if (diff !== 0 && !diffCategoryId) {
          isValid = false
          validationError = 'Kategori Selisih wajib diisi jika terdapat selisih stok'
        }
      }
    }
  }

  return { isValid, validationError }
}

export function StockOpnameImportDialog({
  open,
  onOpenChange,
  groupId,
  groupName
}: StockOpnameImportDialogProps) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload')
  const [importResult, setImportResult] = useState<{
    success: boolean
    summary: ImportSummary
    errors: ServerError[]
  } | null>(null)

  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null)
  const [editingRowData, setEditingRowData] = useState<ParsedRow | null>(null)

  const [dbItems, setDbItems] = useState<{ id: string; name: string }[]>([])
  const [dbWarehouses, setDbWarehouses] = useState<{ id: string; name: string }[]>([])
  const [dbCategories, setDbCategories] = useState<{ id: string; name: string }[]>([])
  const [isLoadingDbData, setIsLoadingDbData] = useState(false)

  const [systemStock, setSystemStock] = useState<number | null>(null)
  const [isLoadingStock, setIsLoadingStock] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    if (open) {
      const fetchData = async () => {
        setIsLoadingDbData(true)
        try {
          const [itemsRes, whRes, catRes] = await Promise.all([
            supabase.from('items').select('id, name').order('name'),
            supabase.from('warehouses').select('id, name').order('name'),
            supabase.from('stock_opname_diff_categories').select('id, name').order('name')
          ])

          setDbItems(itemsRes.data || [])
          setDbWarehouses(whRes.data || [])
          setDbCategories(catRes.data || [])
        } catch (error) {
          console.error('Gagal mengambil data barang/gudang/kategori untuk validasi:', error)
        } finally {
          setIsLoadingDbData(false)
        }
      }
      fetchData()
    } else {
      setDbItems([])
      setDbWarehouses([])
      setDbCategories([])
    }
  }, [open])

  // Fetch system stock when item_name or warehouse_name changes in the editing state
  useEffect(() => {
    const fetchSystemStock = async () => {
      if (editingRowIndex !== null && editingRowData) {
        const currentItem = dbItems.find(
          item => item.name.toLowerCase().trim() === editingRowData.item_name.toLowerCase().trim()
        )
        const currentWarehouse = dbWarehouses.find(
          wh => wh.name.toLowerCase().trim() === editingRowData.warehouse_name.toLowerCase().trim()
        )

        if (currentItem && currentWarehouse) {
          setIsLoadingStock(true)
          try {
            const { data } = await supabase
              .from('stock_ledger')
              .select('current_stock')
              .eq('item_id', currentItem.id)
              .eq('warehouse_id', currentWarehouse.id)
              .single()

            setSystemStock(data?.current_stock ?? 0)
          } catch (e) {
            setSystemStock(0)
          } finally {
            setIsLoadingStock(false)
          }
        } else {
          setSystemStock(null)
        }
      } else {
        setSystemStock(null)
      }
    }
    fetchSystemStock()
  }, [editingRowIndex, editingRowData?.item_name, editingRowData?.warehouse_name, dbItems, dbWarehouses, supabase])

  // Smart localized CSV Parser (detects comma or semicolon delimiter)
  const parseCSV = (text: string): string[][] => {
    const firstLine = text.split(/\r?\n/)[0] || ''
    const commaCount = (firstLine.match(/,/g) || []).length
    const semicolonCount = (firstLine.match(/;/g) || []).length
    const delimiter = semicolonCount > commaCount ? ';' : ','

    const lines: string[][] = []
    let row = ['']
    let inQuotes = false

    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      const nextChar = text[i + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          row[row.length - 1] += '"'
          i++ // skip next quote
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === delimiter && !inQuotes) {
        row.push('')
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++ // skip next newline
        }
        lines.push(row)
        row = ['']
      } else {
        row[row.length - 1] += char
      }
    }
    if (row.length > 1 || row[0] !== '') {
      lines.push(row)
    }
    return lines
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Format berkas tidak didukung. Harap pilih berkas .csv')
      return
    }

    setFile(selectedFile)

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string
        const parsed = parseCSV(text)

        if (parsed.length <= 1) {
          toast.error('Berkas CSV kosong atau tidak memiliki baris data')
          return
        }

        // Validate headers roughly, columns should be: 
        // 0: Barang / Nama Barang
        // 1: Gudang / Nama Gudang
        // 2: Stok Fisik
        // 3: Catatan (Optional)
        const headers = parsed[0].map(h => h.toLowerCase().trim())

        // Remove header row
        const dataRows = parsed.slice(1)
        const mappedRows: ParsedRow[] = dataRows
          .filter(row => row.length > 0 && row.some(cell => cell.trim() !== ''))
          .map((row) => {
            const item_name = row[0]?.trim() || ''
            const warehouse_name = row[1]?.trim() || ''
            const actual_stock = row[2]?.trim() || ''
            const note = row[3]?.trim() || ''
            const diff_category_name = row[4]?.trim() || ''

            const categoryMatch = dbCategories.find(
              c => c.name.toLowerCase().trim() === diff_category_name.toLowerCase().trim()
            )
            const diff_category_id = categoryMatch ? categoryMatch.id : null

            // Simple client-side validation (initial phase)
            const { isValid, validationError } = validateRowData(
              item_name,
              warehouse_name,
              actual_stock,
              dbItems,
              dbWarehouses,
              null,
              diff_category_id,
              diff_category_name,
              dbCategories
            )

            return {
              item_name,
              warehouse_name,
              actual_stock,
              note,
              diff_category_id,
              diff_category_name,
              isValid,
              validationError
            }
          })

        // Fetch system stocks for valid rows
        try {
          const itemIds = mappedRows.filter(r => r.isValid).map(r => dbItems.find(i => i.name.toLowerCase().trim() === r.item_name.toLowerCase().trim())?.id).filter(Boolean) as string[]
          const whIds = mappedRows.filter(r => r.isValid).map(r => dbWarehouses.find(w => w.name.toLowerCase().trim() === r.warehouse_name.toLowerCase().trim())?.id).filter(Boolean) as string[]

          if (itemIds.length > 0 && whIds.length > 0) {
            const uniqueItemIds = [...new Set(itemIds)]
            const uniqueWhIds = [...new Set(whIds)]

            const [stockRes, opnameRes] = await Promise.all([
              supabase
                .from('stock_ledger')
                .select('item_id, warehouse_id, current_stock')
                .in('item_id', uniqueItemIds)
                .in('warehouse_id', uniqueWhIds),
              supabase
                .from('stock_opnames')
                .select(`
                  id,
                  item_id,
                  warehouse_id,
                  actual_stock,
                  note,
                  diff_category:stock_opname_diff_categories(name)
                `)
                .eq('group_id', groupId)
                .in('item_id', uniqueItemIds)
                .in('warehouse_id', uniqueWhIds)
            ])

            const stockData = stockRes.data
            const opnameData = opnameRes.data

            if (stockData) {
              mappedRows.forEach(row => {
                if (row.isValid) {
                  const itemId = dbItems.find(i => i.name.toLowerCase().trim() === row.item_name.toLowerCase().trim())?.id
                  const whId = dbWarehouses.find(w => w.name.toLowerCase().trim() === row.warehouse_name.toLowerCase().trim())?.id
                  const stockMatch = stockData.find(s => s.item_id === itemId && s.warehouse_id === whId)
                  const system_stock = stockMatch ? stockMatch.current_stock : 0
                  row.system_stock = system_stock

                  // Check if duplicate / existing in database opname list
                  const opnameMatch = opnameData?.find(o => o.item_id === itemId && o.warehouse_id === whId)
                  if (opnameMatch) {
                    row.isDuplicate = true
                    row.existingRecord = {
                      id: opnameMatch.id,
                      actual_stock: opnameMatch.actual_stock,
                      note: opnameMatch.note,
                      diff_category_name: (opnameMatch.diff_category as any)?.name || null
                    }
                  } else {
                    row.isDuplicate = false
                    row.existingRecord = null
                  }

                  // Re-validate now that system stock is known
                  const { isValid, validationError } = validateRowData(
                    row.item_name,
                    row.warehouse_name,
                    row.actual_stock,
                    dbItems,
                    dbWarehouses,
                    system_stock,
                    row.diff_category_id,
                    row.diff_category_name,
                    dbCategories
                  )
                  row.isValid = isValid
                  row.validationError = validationError
                }
              })
            }
          }
        } catch (e) {
          console.error('Failed to fetch system stocks or existing records', e)
        }

        setParsedRows(mappedRows)
        setStep('preview')
      } catch (err) {
        toast.error('Gagal membaca berkas CSV. Periksa format penulisan.')
        console.error(err)
      }
    }
    reader.readAsText(selectedFile)
  }

  const handleDownloadTemplate = () => {
    // Generate simple, beautiful standard template CSV
    const csvContent = "\uFEFFBarang,Gudang,Stok Fisik,Catatan,Kategori Selisih\nASUS VivoBook 14,Gudang Utama,12,Hilang di rak A,Hilang\nLogitech B100 Mouse,Gudang Utama,50,Aman,\nSemen Tiga Roda,Gudang Bahan Baku,100,Rusak basah,Rusak\n"
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', 'Template_Stock_Opname.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Template CSV berhasil diunduh')
  }

  const handleStartImport = async () => {
    // Filter only valid rows
    const validRows = parsedRows.filter(r => r.isValid)

    if (validRows.length === 0) {
      toast.error('Tidak ada baris data valid untuk diimpor')
      return
    }

    setIsImporting(true)

    try {
      const response = await fetch(`/api/v1/stock-opname-groups/${groupId}/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rows: validRows.map(r => ({
            item_name: r.item_name,
            warehouse_name: r.warehouse_name,
            actual_stock: r.actual_stock,
            note: r.note,
            diff_category_id: r.diff_category_id
          }))
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Terjadi kesalahan saat mengimpor')
      }

      setImportResult({
        success: true,
        summary: data.summary,
        errors: data.errors || []
      })

      // Invalidate queries so that main table updates
      queryClient.invalidateQueries({ queryKey: ['stock-opname-group', groupId] })
      queryClient.invalidateQueries({ queryKey: ['stock-opname-entries', groupId] })

      setStep('result')
      toast.success('Proses import selesai!')
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengimpor data ke server')
      console.error(err)
    } finally {
      setIsImporting(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setParsedRows([])
    setImportResult(null)
    setStep('upload')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClose = () => {
    handleReset()
    onOpenChange(false)
  }

  const handleStartEdit = (index: number, row: ParsedRow) => {
    setEditingRowIndex(index)
    setEditingRowData({ ...row })
  }

  const handleSaveRowOverride = async (values: {
    item_id: string
    item_name: string
    warehouse_id: string
    warehouse_name: string
    actual_stock: number
    note?: string
    system_stock?: number
    diff_category_id?: string | null
  }) => {
    if (editingRowIndex === null) return

    const catObj = dbCategories.find(c => c.id === values.diff_category_id)

    const { isValid, validationError } = validateRowData(
      values.item_name,
      values.warehouse_name,
      String(values.actual_stock),
      dbItems,
      dbWarehouses,
      values.system_stock,
      values.diff_category_id,
      catObj?.name || '',
      dbCategories
    )

    let isDuplicate = false
    let existingRecord = null

    try {
      const { data: opnameData } = await supabase
        .from('stock_opnames')
        .select(`
          id,
          actual_stock,
          note,
          diff_category:stock_opname_diff_categories(name)
        `)
        .eq('group_id', groupId)
        .eq('item_id', values.item_id)
        .eq('warehouse_id', values.warehouse_id)
        .maybeSingle()

      if (opnameData) {
        isDuplicate = true
        existingRecord = {
          id: opnameData.id,
          actual_stock: opnameData.actual_stock,
          note: opnameData.note,
          diff_category_name: (opnameData.diff_category as any)?.name || null
        }
      }
    } catch (e) {
      console.error('Failed to check duplicate during save override', e)
    }

    const updatedRows = [...parsedRows]
    updatedRows[editingRowIndex] = {
      item_name: values.item_name,
      warehouse_name: values.warehouse_name,
      actual_stock: String(values.actual_stock),
      note: values.note || '',
      isValid,
      validationError,
      system_stock: values.system_stock ?? null,
      diff_category_id: values.diff_category_id || null,
      diff_category_name: catObj?.name || undefined,
      isDuplicate,
      existingRecord
    }

    setParsedRows(updatedRows)
    setEditingRowIndex(null)
    setEditingRowData(null)
    toast.success(`Baris ${editingRowIndex + 1} berhasil diperbarui dan divalidasi!`)
  }

  const validCount = parsedRows.filter(r => r.isValid).length
  const invalidCount = parsedRows.filter(r => !r.isValid).length

  const itemObj = dbItems.find(i => i.name.toLowerCase().trim() === editingRowData?.item_name.toLowerCase().trim())
  const whObj = dbWarehouses.find(w => w.name.toLowerCase().trim() === editingRowData?.warehouse_name.toLowerCase().trim())

  const entryInitialData = editingRowData ? {
    item_id: itemObj?.id || '',
    warehouse_id: whObj?.id || '',
    actual_stock: parseInt(editingRowData.actual_stock) || 0,
    note: editingRowData.note || '',
    system_stock: editingRowData.system_stock ?? null,
    diff_category_id: editingRowData.diff_category_id || null
  } : undefined

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className={`sm:max-w-4xl max-h-[90vh] flex flex-col p-6 transition-all duration-300`}>
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            Import CSV — {groupName}
          </DialogTitle>
        </DialogHeader>

        {/* STEP 1: UPLOAD */}
        {step === 'upload' && (
          <div className="flex-1 overflow-y-auto pb-4 space-y-4">

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                className="cursor-pointer border-emerald-200 hover:bg-emerald-50 text-emerald-700 font-medium"
              >
                <Download className="mr-2 h-4 w-4" /> Download Template CSV
              </Button>

              <Tooltip>
                <TooltipTrigger
                  render={
                    <button type="button" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-blue-600 transition-colors">
                      <HelpCircle className="h-5 w-5" />
                    </button>
                  }
                />
                <TooltipContent side="right" align="start" className="max-w-[280px] sm:max-w-sm p-3 bg-blue-900 text-blue-50 border-blue-800">
                  <p className="font-semibold mb-1 text-blue-100">Petunjuk Penggunaan</p>
                  <p className="text-xs leading-relaxed opacity-90">
                    Silakan unduh template CSV terlebih dahulu. Pencocokan nama barang dan nama gudang akan dilakukan secara otomatis (*case-insensitive*).
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>



            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-muted-foreground/30 hover:border-emerald-500 rounded-xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer bg-muted/20 hover:bg-emerald-50/10 transition-all group"
            >
              <div className="p-4 rounded-full bg-background border shadow-sm group-hover:scale-105 transition-all">
                <Upload className="h-6 w-6 text-muted-foreground group-hover:text-emerald-600" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold">Pilih berkas CSV untuk diimpor</p>
                <p className="text-xs text-muted-foreground">Klik di sini untuk menelusuri komputer Anda</p>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv"
                className="hidden"
              />
            </div>
          </div>
        )}

        {/* STEP 2: PREVIEW */}
        {step === 'preview' && (
          <div className="flex-1 overflow-hidden flex flex-col py-4 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b pb-3">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Nama Berkas: <span className="font-semibold text-foreground">{file?.name}</span></p>
                <div className="flex flex-wrap gap-2 mt-1">
                  <Badge variant="success" className="text-[10px] font-medium">{validCount} Siap Impor</Badge>
                  <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 text-[10px] font-medium border-blue-200">
                    {parsedRows.filter(r => r.isValid && !r.isDuplicate).length} Baru
                  </Badge>
                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400 text-[10px] font-medium border-amber-200">
                    {parsedRows.filter(r => r.isValid && r.isDuplicate).length} Memperbarui
                  </Badge>
                  {invalidCount > 0 && (
                    <Badge variant="destructive" className="text-[10px] font-medium">{invalidCount} Eror (Akan Diabaikan)</Badge>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleReset} className="h-8 text-xs cursor-pointer hover:bg-muted">
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Pilih Ulang
              </Button>
            </div>

            <div className="flex-1 overflow-auto border rounded-lg bg-card">
              <Table>
                <TableHeader className="bg-muted/40 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-12 text-center">No</TableHead>
                    <TableHead>Barang</TableHead>
                    <TableHead>Gudang</TableHead>
                    <TableHead className="w-24 text-right">Stok Sistem</TableHead>
                    <TableHead className="w-24 text-right">Stok Fisik</TableHead>
                    <TableHead className="w-24 text-right">Selisih</TableHead>
                    <TableHead className="w-32">Kategori Selisih</TableHead>
                    <TableHead>Catatan</TableHead>
                    <TableHead className="w-24 text-center">Tipe</TableHead>
                    <TableHead className="w-28 text-center">Status</TableHead>
                    <TableHead className="w-16 text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((row, index) => (
                    <TableRow key={index} className={row.isValid ? '' : 'bg-red-50/20 hover:bg-red-50/30'}>
                      <TableCell className="text-center font-medium text-xs text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-semibold text-xs max-w-[150px] truncate">{row.item_name || '—'}</TableCell>
                      <TableCell className="text-xs max-w-[120px] truncate">{row.warehouse_name || '—'}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{row.system_stock !== undefined && row.system_stock !== null ? row.system_stock : '—'}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{row.actual_stock !== '' ? row.actual_stock : '—'}</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {row.system_stock !== undefined && row.system_stock !== null && row.actual_stock !== '' ? (
                          (() => {
                            const diff = parseInt(row.actual_stock) - row.system_stock
                            return (
                              <span className={diff > 0 ? 'text-green-600 font-bold' : diff < 0 ? 'text-red-600 font-bold' : 'text-muted-foreground'}>
                                {diff > 0 ? `+${diff}` : diff}
                              </span>
                            )
                          })()
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-amber-700 max-w-[120px] truncate" title={row.diff_category_name || undefined}>
                        {row.diff_category_name || '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{row.note || '—'}</TableCell>
                      <TableCell className="text-center">
                        {row.isValid ? (
                          row.isDuplicate ? (
                            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900 text-[10px] py-0.5 font-medium">
                              Memperbarui
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900 text-[10px] py-0.5 font-medium">
                              Tambah Baru
                            </Badge>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.isValid ? (
                          row.isDuplicate ? (
                            <div className="flex flex-col items-center gap-1">
                              <Badge variant="success" className="text-[10px] py-0.5">Valid</Badge>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger
                                    render={
                                      <span className="inline-flex cursor-help items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                                        <HelpCircle size={9} /> Akan Update
                                      </span>
                                    }
                                  />
                                  <TooltipContent side="top" className="max-w-[220px] p-2 text-[10px] leading-snug bg-zinc-950 text-white shadow-xl rounded-md">
                                    Barang ini sudah ada dalam sesi opname di database. Mengimpor baris ini akan memperbarui data fisik menjadi {row.actual_stock} unit.
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          ) : (
                            <Badge variant="success" className="text-[10px] py-0.5">Valid</Badge>
                          )
                        ) : (
                          <Badge variant="destructive" className="text-[10px] py-0.5 truncate max-w-[120px]" title={row.validationError}>
                            {row.validationError}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                          onClick={() => handleStartEdit(index, row)}
                          title="Edit Baris"
                        >
                          <Pencil size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* STEP 3: RESULT */}
        {step === 'result' && importResult && (
          <div className="flex-1 overflow-y-auto py-4 space-y-6">
            <div className="flex flex-col items-center justify-center text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold">Import Selesai!</h3>
                <p className="text-sm text-muted-foreground">Proses sinkronisasi dengan database telah dirampungkan.</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="border rounded-xl p-4 bg-muted/10 text-center space-y-1 border-emerald-100">
                <p className="text-[10px] text-emerald-600 uppercase font-bold tracking-wider">Item Baru</p>
                <p className="text-2xl font-bold text-emerald-700">{importResult.summary.imported}</p>
              </div>
              <div className="border rounded-xl p-4 bg-muted/10 text-center space-y-1 border-blue-100">
                <p className="text-[10px] text-blue-600 uppercase font-bold tracking-wider">Diperbarui</p>
                <p className="text-2xl font-bold text-blue-700">{importResult.summary.updated}</p>
              </div>
              <div className="border rounded-xl p-4 bg-muted/10 text-center space-y-1 border-red-100">
                <p className="text-[10px] text-red-600 uppercase font-bold tracking-wider">Gagal</p>
                <p className="text-2xl font-bold text-red-700">{importResult.summary.failed + importResult.errors.length}</p>
              </div>
            </div>

            {/* Server side line errors report */}
            {importResult.errors.length > 0 && (
              <div className="space-y-2 border rounded-xl p-4 bg-red-50/10 border-red-100">
                <p className="text-xs font-bold text-red-700 flex items-center gap-1">
                  <AlertCircle size={14} /> Daftar Kesalahan Baris (Server-side):
                </p>
                <div className="max-h-[150px] overflow-y-auto divide-y text-xs">
                  {importResult.errors.map((err, i) => (
                    <div key={i} className="py-2 flex justify-between gap-4 text-red-600">
                      <span className="font-semibold min-w-[70px]">Baris {err.row}:</span>
                      <span className="flex-1 text-right">{err.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="border-t pt-4">
          {step === 'upload' && (
            <Button variant="outline" onClick={handleClose} className="cursor-pointer">
              Batal
            </Button>
          )}

          {step === 'preview' && (
            <div className="flex w-full justify-between items-center">
              <Button variant="outline" onClick={handleReset} disabled={isImporting} className="cursor-pointer">
                Batal
              </Button>
              <Button
                onClick={handleStartImport}
                disabled={isImporting || validCount === 0}
                className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengimpor...
                  </>
                ) : (
                  `Mulai Impor (${validCount} Item)`
                )}
              </Button>
            </div>
          )}

          {step === 'result' && (
            <Button onClick={handleClose} className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
              Selesai & Tutup
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Reusable StockOpnameEntryDialog for editing imported CSV row */}
      {editingRowIndex !== null && (
        <StockOpnameEntryDialog
          open={editingRowIndex !== null}
          onOpenChange={(open) => {
            if (!open) {
              setEditingRowIndex(null)
              setEditingRowData(null)
            }
          }}
          groupId={groupId}
          initialData={entryInitialData}
          onSubmitOverride={handleSaveRowOverride}
          titleOverride={`Edit Baris ${editingRowIndex !== null ? editingRowIndex + 1 : ''}`}
        />
      )}
    </Dialog>
  )
}
