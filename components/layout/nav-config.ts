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
  Activity,
  Building2,
  Smartphone,
  Repeat,
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
    roles: ['admin', 'general_affair', 'user'],
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
        title: 'Log Aktivitas',
        href: '/dashboard/admin/logs',
        icon: Activity,
        roles: ['admin'],
      },
    ],
  },
  {
    title: 'Master Data',
    roles: ['admin'],
    items: [
      {
        title: 'Gudang',
        href: '/dashboard/warehouse',
        icon: Warehouse,
        roles: ['admin'],
      },
      {
        title: 'Kategori Barang',
        href: '/dashboard/item-category',
        icon: FolderOpen,
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
        title: 'Kategori Selisih',
        href: '/dashboard/admin/stock-opname-diff-category',
        icon: ClipboardList,
        roles: ['admin'],
      },
    ],
  },
  {
    title: 'Gudang',
    roles: ['general_affair'],
    items: [
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
      {
        title: 'Pindah Barang',
        href: '/dashboard/stock-transfer',
        icon: Repeat,
      },
      {
        title: 'Stock Opname',
        href: '/dashboard/stock-opname',
        icon: ClipboardCheck,
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
    title: 'Peminjaman',
    roles: ['general_affair'],
    items: [
      {
        title: 'Request Peminjaman',
        href: '/dashboard/ga/loans/requests',
        icon: ShieldCheck,
      },
      {
        title: 'Kelola Peminjaman',
        href: '/dashboard/ga/loans/manage',
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
    title: 'Peminjaman',
    roles: ['admin'],
    items: [
      {
        title: 'Riwayat Peminjaman',
        href: '/dashboard/ga/loans/history',
        icon: ClipboardCheck,
        roles: ['admin'],
      },
    ],
  },
  {
    title: 'Pengaturan',
    roles: ['admin'],
    items: [
      {
        title: 'Informasi Umum',
        href: '/dashboard/admin/settings/general',
        icon: Building2,
      },
      {
        title: 'WhatsApp',
        href: '/dashboard/admin/settings/whatsapp',
        icon: Smartphone,
      },
    ],
  },
]
