// types/database.ts
export type Role = 'admin' | 'user' | 'general_affair'
export type LoanStatus = 'pending' | 'approved' | 'rejected' | 'returned' | 'cancelled'
export type ItemStatus_Status = 'active' | 'inactive'

export interface Profile {
  id: string
  full_name: string
  avatar_url: string | null
  phone: string | null
  role: Role
  created_at: string
  updated_at: string
}

export interface CompanySettings {
  id: string
  name: string
  logo_url: string | null
  address: string | null
  phone: string | null
  email: string | null
  is_wa_enabled: boolean
  wa_message_format: string | null
  updated_at: string
}

export interface ItemStatus {
  id: string
  name: string
  note: string | null
  created_at: string
}

export interface ItemCondition {
  id: string
  name: string
  note: string | null
  created_at: string
}

export interface ItemCategory {
  id: string
  name: string
  created_by: string | null
  created_at: string
}

export interface Warehouse {
  id: string
  name: string
  note: string | null
  created_by: string | null
  created_at: string
}

export interface Item {
  id: string
  item_category_id: string | null
  item_status_id: string | null
  item_condition_id: string | null
  name: string
  price: number
  status: ItemStatus_Status
  note: string | null
  minimum_stock: number
  created_by: string | null
  created_at: string
  // joined fields
  item_category?: ItemCategory
  item_status?: ItemStatus
  item_condition?: ItemCondition
}

export interface StockIn {
  id: string
  item_id: string
  warehouse_id: string
  quantity: number
  date: string
  note: string | null
  created_by: string | null
  created_at: string
  // joined
  item?: Item
  warehouse?: Warehouse
}

export interface StockOut {
  id: string
  item_id: string
  warehouse_id: string
  quantity: number
  date: string
  note: string | null
  created_by: string | null
  created_at: string
  // joined
  item?: Item
  warehouse?: Warehouse
}

export interface StockLedger {
  id: string
  item_id: string
  item_name: string
  minimum_stock: number
  price: number
  category_name: string | null
  status_name: string | null
  condition_name: string | null
  warehouse_id: string
  warehouse_name: string
  total_in: number
  total_out: number
  current_stock: number
  is_low_stock: boolean
}

export interface ItemLoan {
  id: string
  item_id: string
  warehouse_id: string
  requested_by: string
  actioned_by: string | null
  quantity: number
  purpose: string
  loan_date: string
  return_date: string | null
  actual_return_date: string | null
  status: LoanStatus
  rejection_note: string | null
  note: string | null
  created_at: string
  updated_at: string
  // joined
  item?: Item
  warehouse?: Warehouse
  requester?: Profile
  actioner?: Profile
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  totalPages: number
}
