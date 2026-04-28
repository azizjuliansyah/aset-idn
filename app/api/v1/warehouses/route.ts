import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function paginateQuery(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') ?? '10'), 100)
  const search = searchParams.get('search') ?? ''
  return { page, pageSize, search, from: (page - 1) * pageSize, to: page * pageSize - 1 }
}

function authError() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// ──────────────────────────────────────────────
// GET /api/v1/warehouses
// ──────────────────────────────────────────────
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return authError()

  const { page, pageSize, search, from, to } = paginateQuery(request)
  let q = supabase.from('warehouses').select('*', { count: 'exact' })
    .order('created_at', { ascending: false }).range(from, to)
  if (search) q = q.ilike('name', `%${search}%`)

  const { data, count, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count, page, pageSize, totalPages: Math.ceil((count ?? 0) / pageSize) })
}

// POST /api/v1/warehouses
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return authError()

  const body = await request.json()
  const { error, data } = await supabase.from('warehouses').insert({
    name: body.name,
    note: body.note ?? null,
    created_by: user.id,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data }, { status: 201 })
}
