import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Item } from '@/types/database'

export function useActiveItems() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['items_active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select('id, name')
        .eq('status', 'active')
        .order('name')
      
      if (error) throw error
      return (data ?? []) as Item[]
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
