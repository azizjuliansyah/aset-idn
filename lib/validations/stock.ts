import { z } from 'zod'

export const stockTransactionSchema = z.object({
  item_id: z.string().min(1, 'Barang wajib dipilih'),
  warehouse_id: z.string().min(1, 'Gudang wajib dipilih'),
  quantity: z.number().min(1, 'Jumlah minimal 1'),
  date: z.string().min(1, 'Tanggal wajib diisi'),
  note: z.string().optional(),
})
export type StockTransactionFormValues = z.infer<typeof stockTransactionSchema>


export const stockTransferSchema = z.object({
  from_warehouse_id: z.string().min(1, 'Gudang asal wajib dipilih'),
  to_warehouse_id: z.string().min(1, 'Gudang tujuan wajib dipilih'),
  items: z.array(z.object({
    item_id: z.string().min(1),
    quantity: z.number().min(1, 'Jumlah minimal 1'),
  })).min(1, 'Pilih minimal 1 barang'),
  note: z.string().optional(),
}).refine((data) => data.from_warehouse_id !== data.to_warehouse_id, {
  message: 'Gudang asal dan tujuan tidak boleh sama',
  path: ['to_warehouse_id'],
})

export type StockTransferFormValues = z.infer<typeof stockTransferSchema>
