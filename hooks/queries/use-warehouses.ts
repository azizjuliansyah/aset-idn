import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Warehouse } from '@/types/database'

export function useWarehouses() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['warehouses_all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('id, name')
        .order('name')
      
      if (error) throw error
      return (data ?? []) as Warehouse[]
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
