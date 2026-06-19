import { z } from 'zod'

const preprocessNumber = (val: unknown) => {
  if (val === '' || val === null || val === undefined) return 0
  const num = Number(val)
  return isNaN(num) ? 0 : num
}

export interface ItemFormValues {
  name: string
  item_category_id?: string | number | null
  item_status_id?: string | null
  item_condition_id?: string | null
  price: number
  status: 'active' | 'inactive'
  description?: string | null
  minimum_stock: number
}

export const itemSchema = z.object({
  name: z.string().min(1, 'Nama barang wajib diisi'),
  item_category_id: z.union([z.string(), z.number()]).optional().nullable(),
  item_status_id: z.string().optional().nullable(),
  item_condition_id: z.string().optional().nullable(),
  price: z.preprocess(
    preprocessNumber,
    z.number({ message: 'Harga harus berupa angka' }).min(0, 'Harga tidak boleh kurang dari 0').default(0)
  ),
  status: z.enum(['active', 'inactive']),
  description: z.string().optional().nullable(),
  minimum_stock: z.preprocess(
    preprocessNumber,
    z.number({ message: 'Stok minimum harus berupa angka' }).min(0, 'Stok minimum tidak boleh kurang dari 0').default(0)
  ),
}) as unknown as z.ZodType<ItemFormValues, ItemFormValues>
