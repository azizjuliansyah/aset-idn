import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { ItemStatus } from '@/types/database'

export function useItemStatuses() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['item_status_all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('item_status')
        .select('id, name')
        .order('name')
      
      if (error) throw error
      return (data ?? []) as ItemStatus[]
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}
