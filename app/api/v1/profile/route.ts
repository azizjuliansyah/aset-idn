import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createActivityLog } from '@/lib/logger'

function authError() { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

// GET /api/v1/profile
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return authError()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, phone, created_at')
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
  const { full_name, phone } = body

  const { data, error } = await supabase
    .from('profiles')
    .update({ 
      full_name, 
      phone: phone || null,
      updated_at: new Date().toISOString() 
    })
    .eq('id', user.id)
    .select('id, full_name, phone, role, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await createActivityLog({
    action: 'UPDATE',
    entityType: 'USER',
    entityId: user.id,
    details: { full_name, phone }
  })

  return NextResponse.json({ data })
}
