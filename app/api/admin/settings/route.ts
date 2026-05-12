import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createActivityLog } from '@/lib/logger'

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { id, ...updateData } = body

  const { error } = await supabase
    .from('company_settings')
    .update({
      ...updateData,
      wa_message_format: updateData.wa_message_format ?? null,
      wa_group_id: updateData.wa_group_id ?? null,
      wa_group_message_format: updateData.wa_group_message_format ?? null,
      wa_stock_low_group_id: updateData.wa_stock_low_group_id ?? null,
      wa_stock_low_group_names: updateData.wa_stock_low_group_names ?? null,
      wa_stock_low_message_format: updateData.wa_stock_low_message_format ?? null,
      wa_return_message_format: updateData.wa_return_message_format ?? null,
      wa_number_key: updateData.wa_number_key ?? null,
      wa_api_key: updateData.wa_api_key ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await createActivityLog({
    action: 'UPDATE',
    entityType: 'SETTING',
    entityId: id,
    details: updateData
  })

  return NextResponse.json({ success: true })
}
