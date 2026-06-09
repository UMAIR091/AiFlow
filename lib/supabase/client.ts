'use client'
import { createBrowserClient } from '@supabase/ssr'

/**
 * Browser-side Supabase client.
 * Uses @supabase/ssr so the auth session cookie is shared with the server
 * and the user's JWT is attached to every request (required for RLS inserts).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
