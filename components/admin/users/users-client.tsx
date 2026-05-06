'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, ShieldCheck, User, Briefcase, MoreHorizontal } from 'lucide-react'
import { DataTable } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UsersDialogs } from './sub-components/users-dialogs'
import { useUsersManager } from '@/hooks/admin/use-users-manager'
import { formatDate } from '@/lib/utils'
import type { Profile } from '@/types/database'

export function UsersClient() {
  const { state, handlers, queries, mutations } = useUsersManager()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editUser, setEditUser] = useState<Profile | null>(null)
  const [deleteUser, setDeleteUser] = useState<Profile | null>(null)

  const openCreate = () => {
    setEditUser(null)
    setDialogOpen(true)
  }

  const openEdit = (user: Profile) => {
    setEditUser(user)
    setDialogOpen(true)
  }

  return (
    <>
      <DataTable
        columns={[
          { key: 'full_name', header: 'Nama' },
          {
            key: 'role', header: 'Role',
            render: (v) => (
              <Badge
                variant={v === 'admin' ? 'default' : v === 'general_affair' ? 'outline' : 'secondary'}
                className="gap-1 text-xs"
              >
                {v === 'admin' ? <ShieldCheck size={11} /> : v === 'general_affair' ? <Briefcase size={11} /> : <User size={11} />}
                {v === 'admin' ? 'Admin' : v === 'general_affair' ? 'General Affair' : 'User'}
              </Badge>
            ),
          },
          { key: 'created_at', header: 'Bergabung', render: (v) => formatDate(v as string) },
          {
            key: 'actions', header: '', className: 'w-16 text-right',
            render: (_, row) => (
              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger 
                    render={<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" />}
                  >
                    <MoreHorizontal size={16} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => openEdit(row)}>
                      <Pencil size={14} className="mr-2 text-muted-foreground" /> Edit User
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setDeleteUser(row)} className="text-destructive focus:text-destructive focus:bg-red-50">
                      <Trash2 size={14} className="mr-2" /> Hapus User
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ),
          },
        ]}
        data={queries.data?.data ?? []}
        isLoading={queries.isLoading}
        page={state.page}
        pageSize={state.PAGE_SIZE}
        totalCount={queries.data?.count ?? 0}
        onPageChange={handlers.setPage}
        onBulkDelete={(ids) => mutations.bulkDelete.mutate(ids)}
        searchValue={state.search}
        onSearchChange={(v) => { handlers.setSearch(v); handlers.setPage(1) }}
        searchPlaceholder="Cari user..."
        filters={
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filter Role</Label>
              <Select value={state.roleFilter} onValueChange={(v) => { handlers.setRoleFilter(v); handlers.setPage(1) }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Semua Role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Role</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="general_affair">General Affair</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        }
        actions={<Button size="sm" onClick={openCreate}><Plus size={14} className="mr-1.5" /> Tambah User</Button>}
        emptyText="Belum ada user"
      />

      <UsersDialogs 
        editUser={editUser}
        deleteUser={deleteUser}
        dialogOpen={dialogOpen}
        setDialogOpen={setDialogOpen}
        setDeleteUser={setDeleteUser}
        onCreate={(values) => mutations.create.mutate(values, { onSuccess: () => setDialogOpen(false) })}
        onEdit={(values) => mutations.edit.mutate({ id: editUser!.id, values }, { onSuccess: () => setDialogOpen(false) })}
        onDelete={() => mutations.delete.mutate(deleteUser!.id, { onSuccess: () => setDeleteUser(null) })}
        isCreating={mutations.create.isPending}
        isEditing={mutations.edit.isPending}
        isDeleting={mutations.delete.isPending}
      />
    </>
  )
}
