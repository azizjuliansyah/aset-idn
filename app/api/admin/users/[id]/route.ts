import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { full_name, role, phone, email, password } = body

  // Update Auth Metadata, Email and Password if provided
  const adminClient = await createAdminClient()
  const updatePayload: any = {
    user_metadata: { full_name, role, phone }
  }

  if (email) {
    updatePayload.email = email
    updatePayload.email_confirm = true
  }

  if (password) {
    updatePayload.password = password
  }

  const { data: updatedUser, error: authUpdateError } = await adminClient.auth.admin.updateUserById(id, updatePayload)
  if (authUpdateError) return NextResponse.json({ error: authUpdateError.message }, { status: 400 })

  // Ensure updated email is fully confirmed in database
  if (email && updatedUser?.user) {
    const { error: confirmError } = await adminClient.rpc('confirm_user_email', {
      user_id: updatedUser.user.id
    })
    if (confirmError) {
      console.error('[API Admin Users PATCH] Error confirming updated email:', confirmError)
    }
  }

  // Update Profiles table
  const { error } = await supabase
    .from('profiles')
    .update({ full_name, role, phone: phone || null })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (id === user.id) return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })

  const adminClient = await createAdminClient()
  const { error } = await adminClient.auth.admin.deleteUser(id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
