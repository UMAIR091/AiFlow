import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Route Handler Supabase client (for /app/api/* routes).
 * The cookie store is writable here, so refreshed sessions are persisted.
 */
export function createRouteClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore if called in a context where cookies are read-only.
          }
        },
      },
    }
  )
}
