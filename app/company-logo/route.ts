import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('company_settings')
    .select('logo_url')
    .single()

  if (error || !data?.logo_url) {
    return new Response(null, { status: 404 })
  }

  return Response.redirect(data.logo_url)
}
