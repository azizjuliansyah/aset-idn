// Layout navigation config — role-based menu items
import {
  LayoutDashboard,
  Users,
  Settings,
  Tag,
  CheckCircle,
  Warehouse,
  FolderOpen,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
} from 'lucide-react'

export interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  roles?: ('admin' | 'user')[]
  badge?: string
}

export interface NavGroup {
  title: string
  items: NavItem[]
  roles?: ('admin' | 'user')[]
}

export const navGroups: NavGroup[] = [
  {
    title: 'Utama',
    items: [
      {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: 'Administrasi',
    roles: ['admin'],
    items: [
      {
        title: 'Manajemen User',
        href: '/dashboard/admin/users',
        icon: Users,
        roles: ['admin'],
      },
      {
        title: 'Status Barang',
        href: '/dashboard/admin/item-status',
        icon: CheckCircle,
        roles: ['admin'],
      },
      {
        title: 'Kondisi Barang',
        href: '/dashboard/admin/item-condition',
        icon: Tag,
        roles: ['admin'],
      },
      {
        title: 'Pengaturan',
        href: '/dashboard/admin/settings',
        icon: Settings,
        roles: ['admin'],
      },
    ],
  },
  {
    title: 'Gudang',
    items: [
      {
        title: 'Gudang',
        href: '/dashboard/warehouse',
        icon: Warehouse,
      },
      {
        title: 'Kategori Barang',
        href: '/dashboard/item-category',
        icon: FolderOpen,
      },
      {
        title: 'Barang',
        href: '/dashboard/items',
        icon: Package,
      },
    ],
  },
  {
    title: 'Transaksi',
    items: [
      {
        title: 'Barang Masuk',
        href: '/dashboard/stock-in',
        icon: ArrowDownToLine,
      },
      {
        title: 'Barang Keluar',
        href: '/dashboard/stock-out',
        icon: ArrowUpFromLine,
      },
      {
        title: 'Stok Ledger',
        href: '/dashboard/stock-ledger',
        icon: BarChart3,
      },
    ],
  },
]
