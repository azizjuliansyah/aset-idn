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
  ClipboardList,
  History,
  ShieldCheck,
  ClipboardCheck,
} from 'lucide-react'

export type AppRole = 'admin' | 'user' | 'general_affair'

export interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  roles?: AppRole[]
  badge?: string
}

export interface NavGroup {
  title: string
  items: NavItem[]
  roles?: AppRole[]
}

export const navGroups: NavGroup[] = [
  {
    title: 'Utama',
    roles: ['admin', 'general_affair'],
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
        title: 'Pengaturan',
        href: '/dashboard/admin/settings',
        icon: Settings,
        roles: ['admin'],
      },
    ],
  },
  {
    title: 'Gudang',
    roles: ['general_affair'],
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
    roles: ['general_affair'],
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
    ],
  },
  {
    title: 'Peminjaman',
    roles: ['user'], // Only user role can request items
    items: [
      {
        title: 'Pinjam Barang',
        href: '/dashboard/loans',
        icon: ClipboardList,
      },
      {
        title: 'Riwayat Pinjam',
        href: '/dashboard/loans/history',
        icon: History,
      },
    ],
  },
  {
    title: 'Peminjaman (GA)',
    roles: ['general_affair'],
    items: [
      {
        title: 'Kelola Peminjaman',
        href: '/dashboard/ga/loans',
        icon: ShieldCheck,
      },
      {
        title: 'Riwayat Peminjaman',
        href: '/dashboard/ga/loans/history',
        icon: ClipboardCheck,
      },
    ],
  },
  {
    title: 'Master Data',
    roles: ['general_affair'],
    items: [
      {
        title: 'Status Barang',
        href: '/dashboard/admin/item-status',
        icon: CheckCircle,
      },
      {
        title: 'Kondisi Barang',
        href: '/dashboard/admin/item-condition',
        icon: Tag,
      },
    ],
  },
]
