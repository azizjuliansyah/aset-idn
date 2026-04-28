import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function authError() { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

// GET /api/v1/profile
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return authError()

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// PATCH /api/v1/profile
export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return authError()

  const body = await request.json()
  const { full_name } = body

  const { data, error } = await supabase
    .from('profiles')
    .update({ full_name, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data })
}
