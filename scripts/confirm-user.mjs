/** Manually confirm a user's email via the Supabase admin API.
 *  Usage: node scripts/confirm-user.mjs someone@example.com
 *  Works around Supabase's rate-limited / unreliable default confirmation emails. */
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createClient } from '@supabase/supabase-js'

const __dir = dirname(fileURLToPath(import.meta.url))
const env = {}
for (const line of readFileSync(join(__dir, '..', '.env.local'), 'utf8').split('\n')) {
  const t = line.trim(); if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('='); if (eq !== -1) env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim()
}

const email = (process.argv[2] || '').toLowerCase()
if (!email) { console.error('Usage: node scripts/confirm-user.mjs <email>'); process.exit(1) }

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data: list, error: listErr } = await admin.auth.admin.listUsers()
if (listErr) { console.error('❌ listUsers failed:', listErr.message); process.exit(1) }

const user = list.users.find(u => u.email?.toLowerCase() === email)
if (!user) { console.error(`❌ no user found with email ${email}`); process.exit(1) }

if (user.email_confirmed_at) {
  console.log('✓ already confirmed:', email)
  process.exit(0)
}

const { error } = await admin.auth.admin.updateUserById(user.id, { email_confirm: true })
if (error) { console.error('❌ confirm failed:', error.message); process.exit(1) }

console.log('✓ email confirmed — you can now sign in')
console.log('  email:', email)
console.log('  id   :', user.id)
