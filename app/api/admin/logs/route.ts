import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = parseInt(searchParams.get('pageSize') ?? '10')
  const search = searchParams.get('search') ?? ''
  const action = searchParams.get('action') ?? 'all'
  const entityType = searchParams.get('entity_type') ?? 'all'

  let q = supabase
    .from('activity_logs')
    .select('*, user:profiles(full_name, role)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (action !== 'all') q = q.eq('action', action)
  if (entityType !== 'all') q = q.eq('entity_type', entityType)
  
  if (search) {
    // Search in details or user full name if possible
    // Note: searching in jsonb might be complex, let's keep it simple for now
    q = q.or(`action.ilike.%${search}%,entity_type.ilike.%${search}%`)
  }

  const { data, count, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, count })
}
