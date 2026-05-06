import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { ItemCondition } from '@/types/database'

export function useItemConditions() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['item_condition_all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('item_condition')
        .select('id, name')
        .order('name')
      
      if (error) throw error
      return (data ?? []) as ItemCondition[]
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}
