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
  wa_group_id: string | null
  wa_group_names: string | null
  wa_group_message_format: string | null
  wa_stock_low_group_id: string | null
  wa_stock_low_group_names: string | null
  wa_stock_low_message_format: string | null
  wa_return_message_format: string | null
  wa_return_group_id: string | null
  wa_return_group_names: string | null
  wa_return_group_message_format: string | null
  wa_return_finished_message_format: string | null
  wa_return_finished_group_message_format: string | null
  wa_overdue_message_format: string | null
  wa_overdue_group_id: string | null
  wa_overdue_group_names: string | null
  wa_overdue_group_message_format: string | null
  wa_overdue_cron_time: string | null
  wa_number_key: string | null
  wa_api_key: string | null
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
  is_default: boolean
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
  transfer_id: string | null
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
  transfer_id: string | null
  warehouse?: Warehouse
}

export interface StockTransfer {
  id: string
  item_id: string
  from_warehouse_id: string
  to_warehouse_id: string
  quantity: number
  date: string
  note: string | null
  created_by: string | null
  created_at: string
  // joined
  item?: Item
  from?: Warehouse
  to?: Warehouse
  creator?: Profile
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

export interface StockOpnameGroup {
  id: string
  name: string
  description: string | null
  status: 'draft' | 'completed'
  created_by: string
  created_at: string
  updated_at: string
  // joined
  creator?: Profile
}

export interface StockOpname {
  id: string
  group_id: string
  item_id: string
  warehouse_id: string
  system_stock: number
  actual_stock: number
  difference: number
  note: string | null
  created_by: string
  created_at: string
  // joined
  item?: Item
  warehouse?: Warehouse
}

export interface LoanRequest {
  id: string
  requested_by: string
  actioned_by: string | null
  status: LoanStatus
  purpose: string
  loan_date: string
  return_date: string | null
  actual_return_date: string | null
  rejection_note: string | null
  note: string | null
  created_by: string | null
  atas_nama: string | null
  is_by_ga: boolean
  created_at: string
  updated_at: string
  // joined
  items?: (LoanItem & { item: Item; warehouse: Warehouse | null })[]
  requester?: Profile
  actioner?: Profile
}

export interface LoanItem {
  id: string
  loan_request_id: string
  item_id: string
  warehouse_id: string | null
  quantity: number
  status: 'pending' | 'approved' | 'rejected' | 'no_stock'
  // joined
  item?: Item
  warehouse?: Warehouse
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  totalPages: number
}

export type LoanWithJoins = Omit<LoanRequest, 'items' | 'requester' | 'actioner'> & {
  items: (LoanItem & { 
    item: Item; 
    warehouse: Warehouse | null;
    returned_quantity: number;
    returns?: { 
      id: string; 
      quantity: number; 
      note: string; 
      returned_at: string; 
      actioned_by: string;
    }[]
  })[]
  requester: Profile
  actioner: Profile | null
}
