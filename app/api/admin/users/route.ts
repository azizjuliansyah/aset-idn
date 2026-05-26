import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// GET /api/admin/users
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
  const role = searchParams.get('role') ?? 'all'

  let q = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (search) q = q.ilike('full_name', `%${search}%`)
  if (role !== 'all') q = q.eq('role', role)

  const { data, count, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch emails from auth.users via adminClient
  let mappedData = data
  try {
    const adminClient = await createAdminClient()
    const { data: authData, error: listError } = await adminClient.auth.admin.listUsers()
    if (!listError && authData?.users) {
      mappedData = data.map((p: any) => {
        const authUser = authData.users.find((u: any) => u.id === p.id)
        return {
          ...p,
          email: authUser?.email || ''
        }
      })
    }
  } catch (err) {
    console.error('[API Admin Users GET] Failed to fetch auth users:', err)
  }

  return NextResponse.json({ data: mappedData, count })
}

// POST /api/admin/users
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { email, password, full_name, role, phone } = body

  const adminClient = await createAdminClient()

  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: { full_name, role, phone },
  })

  if (createError) return NextResponse.json({ error: createError.message }, { status: 400 })

  // Confirm the user's email safely via database RPC
  if (newUser.user) {
    const { error: confirmError } = await adminClient.rpc('confirm_user_email', {
      user_id: newUser.user.id
    })
    if (confirmError) {
      console.error('[API Admin Users] Error confirming user email via RPC:', confirmError)
    }
  }

  // Update profile details (role and phone) in profiles table
  if (newUser.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        role,
        phone: phone || null,
      })
      .eq('id', newUser.user.id)

    if (profileError) {
      console.error('[API Admin Users] Error updating profile details:', profileError)
    }
  }

  return NextResponse.json({ success: true })
}

// DELETE /api/admin/users
export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { ids } = await request.json()
  if (!ids || !Array.isArray(ids)) return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 })

  const adminClient = await createAdminClient()
  
  for (const id of ids) {
    // Avoid self-deletion
    if (id === user.id) continue
    await adminClient.auth.admin.deleteUser(id)
  }

  return NextResponse.json({ success: true })
}
