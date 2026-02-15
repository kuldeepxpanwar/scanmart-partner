import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request: { headers: request.headers } })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  
  // 🟢 ChatGPT Logic: Agar user Login par hai aur Logged IN hai -> Dashboard bhejo
  if (url.pathname === '/login' && user) {
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // 🔴 ChatGPT Logic: Agar user Dashboard par hai aur Logged OUT hai -> Login bhejo
  if (url.pathname.startsWith('/dashboard') && !user) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return response
}

// ✅ Config Matcher (ChatGPT Recommended)
export const config = {
  matcher: [
    /*
     * Sirf in 2 paths par middleware chalega.
     * Baaki sab (images, api, favicon) ko ignore karega.
     */
    '/login',
    '/dashboard/:path*',
  ],
}