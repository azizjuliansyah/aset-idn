import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('[Middleware] Missing environment variables')
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (e) {
    console.error('[Middleware] Auth error:', e)
  }

  const { pathname } = request.nextUrl
  const isAuthPage = pathname.startsWith('/login')
  const isApiRoute = pathname.startsWith('/api')
  const isDashboard = !isAuthPage && !isApiRoute && pathname !== '/'

  // Debug logging
  console.log(`[Proxy] Path: ${pathname}, Method: ${request.method}, User: ${user ? 'Yes' : 'No'}`)

  // Skip redirect for API routes or OPTIONS requests to avoid breaking CORS/Preflight
  if (isApiRoute || request.method === 'OPTIONS') {
    return supabaseResponse
  }

  if (!user && isDashboard) {
    console.log(`[Proxy] Redirecting to /login from ${pathname}`)
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const response = NextResponse.redirect(url)
    // IMPORTANT: Forward cookies to the redirect response
    supabaseResponse.cookies.getAll().forEach(c => response.cookies.set(c.name, c.value))
    return response
  }

  if (user && (isAuthPage || pathname === '/')) {
    // Prevent redirect loop if redirected back to login due to missing profile
    if (request.nextUrl.searchParams.get('error') === 'no_profile') {
      return supabaseResponse
    }

    console.log(`[Proxy] Redirecting to /dashboard from ${pathname}`)
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    const response = NextResponse.redirect(url)
    // IMPORTANT: Forward cookies to the redirect response
    supabaseResponse.cookies.getAll().forEach(c => response.cookies.set(c.name, c.value))
    return response
  }

  return supabaseResponse
}
