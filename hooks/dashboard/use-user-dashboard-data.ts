'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { LoanWithJoins } from '@/types/database'

export interface UserDashboardStats {
  activeLoans: number
  itemsBorrowed: number
  totalHistory: number
}

export function useUserDashboardData() {
  const supabase = createClient()

  const statsQuery = useQuery({
    queryKey: ['user_dashboard_stats'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Unauthorized')

      const [active, history] = await Promise.all([
        supabase
          .from('loan_requests')
          .select('id, loan_items(quantity)')
          .eq('requested_by', user.id)
          .in('status', ['pending', 'approved']),
        supabase
          .from('loan_requests')
          .select('id', { count: 'exact', head: true })
          .eq('requested_by', user.id)
          .in('status', ['returned', 'rejected', 'cancelled']),
      ])

      const activeLoans = active.data?.length ?? 0
      const itemsBorrowed = active.data?.reduce((acc, loan) => {
        const loanItems = loan.loan_items as any[]
        return acc + (loanItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) ?? 0)
      }, 0) ?? 0

      return {
        activeLoans,
        itemsBorrowed,
        totalHistory: history.count ?? 0,
      } as UserDashboardStats
    },
  })

  const recentLoansQuery = useQuery({
    queryKey: ['user_dashboard_recent'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Unauthorized')

      const { data, error } = await supabase
        .from('loan_requests')
        .select(`
          *,
          items:loan_items(
            *,
            item:items(id, name),
            warehouse:warehouses(id, name)
          )
        `)
        .eq('requested_by', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error
      return data as LoanWithJoins[]
    },
  })

  return {
    queries: {
      stats: statsQuery,
      recent: recentLoansQuery,
    }
  }
}
