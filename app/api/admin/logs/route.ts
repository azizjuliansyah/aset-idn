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
  const userId = searchParams.get('user_id') ?? 'all'
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')
  const days = searchParams.get('days') ?? 'all'
 
  let q = supabase
    .from('activity_logs')
    .select('*, user:profiles(full_name, role)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)
 
  if (action !== 'all') q = q.eq('action', action)
  if (entityType !== 'all') q = q.eq('entity_type', entityType)
  if (userId !== 'all') q = q.eq('user_id', userId)
  
  if (days !== 'all' && days !== 'custom') {
    const date = new Date()
    date.setDate(date.getDate() - parseInt(days))
    q = q.gte('created_at', date.toISOString())
  } else {
    if (startDate) {
      q = q.gte('created_at', `${startDate}T00:00:00`)
    }
    
    if (endDate) {
      q = q.lte('created_at', `${endDate}T23:59:59`)
    }
  }
  
  if (search) {
    const s = `%${search}%`
    
    // First, find profiles that match the search term to get their IDs
    const { data: matchedProfiles } = await supabase
      .from('profiles')
      .select('id')
      .ilike('full_name', s)
    
    const matchedUserIds = matchedProfiles?.map(p => p.id) || []
    
    // Build the OR conditions
    let orConditions = [
      `action.ilike.${s}`,
      `entity_type.ilike.${s}`,
      `details->>name.ilike.${s}`,
      `details->>item_name.ilike.${s}`,
      `details->>purpose.ilike.${s}`,
      `details->>note.ilike.${s}`,
      `details->>full_name.ilike.${s}`,
      `entity_id.eq.${search}` // Also try exact match for ID if it's a UUID
    ]

    // If we found matching users, include them in the OR filter
    if (matchedUserIds.length > 0) {
      orConditions.push(`user_id.in.(${matchedUserIds.join(',')})`)
    }

    q = q.or(orConditions.join(','))
  }

  const { data, count, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, count })
}
