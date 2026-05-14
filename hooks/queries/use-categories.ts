import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { ItemCategory } from '@/types/database'

export function useCategories() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['item_category_all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('item_category')
        .select('id, name')
        .order('name')
      
      if (error) throw error
      return (data ?? []) as ItemCategory[]
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
}
