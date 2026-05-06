import { z } from 'zod'

export const stockTransactionSchema = z.object({
  item_id: z.string().min(1, 'Barang wajib dipilih'),
  warehouse_id: z.string().min(1, 'Gudang wajib dipilih'),
  quantity: z.number().min(1, 'Jumlah minimal 1'),
  date: z.string().min(1, 'Tanggal wajib diisi'),
  note: z.string().optional(),
})

export type StockTransactionFormValues = z.infer<typeof stockTransactionSchema>
