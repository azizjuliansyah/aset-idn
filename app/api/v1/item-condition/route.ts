import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createActivityLog } from '@/lib/logger'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { error, data } = await supabase.from('item_condition').insert({
    name: body.name,
    note: body.note || null,
    created_by: user.id
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await createActivityLog({
    action: 'CREATE',
    entityType: 'ITEM_CONDITION',
    entityId: data.id,
    details: { name: data.name, type: 'Condition' }
  })

  return NextResponse.json({ data }, { status: 201 })
}
