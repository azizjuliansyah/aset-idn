import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createActivityLog } from '@/lib/logger'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Record manual login log (since auth.users is in auth schema beyond trigger scope)
  await createActivityLog({
    action: 'LOGIN',
    entityType: 'USER',
    entityId: user.id,
    details: {
      email: user.email,
      name: user.user_metadata?.full_name || 'User'
    }
  })

  return NextResponse.json({ success: true })
}
