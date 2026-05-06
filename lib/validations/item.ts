import { z } from 'zod'

export const itemSchema = z.object({
  name: z.string().min(1, 'Nama barang wajib diisi'),
  item_category_id: z.string().optional(),
  item_status_id: z.string().optional(),
  item_condition_id: z.string().optional(),
  price: z.number().min(0),
  status: z.enum(['active', 'inactive']),
  note: z.string().optional(),
  minimum_stock: z.number().min(0),
})

export type ItemFormValues = z.infer<typeof itemSchema>
