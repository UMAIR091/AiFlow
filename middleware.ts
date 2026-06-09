import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Refreshes the Supabase auth session on every matched request and writes the
 * updated cookies onto the response. Without this, server-side reads of the
 * session can go stale and authenticated DB writes fail RLS checks.
 */
export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: { headers: req.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Write to both the request (for downstream) and the response (for the browser).
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          res = NextResponse.next({ request: { headers: req.headers } })
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Touch the user to trigger a token refresh + cookie write when needed.
  await supabase.auth.getUser()

  return res
}

export const config = {
  // Run on app pages so the session cookie stays fresh. Skips static assets and API routes.
  matcher: ['/dashboard/:path*', '/builder/:path*', '/connect/:path*', '/generate-site/:path*', '/runs/:path*'],
}
