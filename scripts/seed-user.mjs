/** Create (or reset) a confirmed test user via the Supabase admin API. */
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createClient } from '@supabase/supabase-js'

const __dir = dirname(fileURLToPath(import.meta.url))
const env = {}
for (const line of readFileSync(join(__dir, '..', '.env.local'), 'utf8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('=')
  if (eq !== -1) env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim()
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const EMAIL = 'test@autoflow.dev'
const PASSWORD = 'autoflow-test-1234'

// Remove any existing user with this email first (idempotent).
const { data: list } = await admin.auth.admin.listUsers()
const existing = list?.users?.find(u => u.email === EMAIL)
if (existing) {
  await admin.auth.admin.deleteUser(existing.id)
  console.log('Removed existing test user.')
}

const { data, error } = await admin.auth.admin.createUser({
  email: EMAIL,
  password: PASSWORD,
  email_confirm: true,
})

if (error) {
  console.error('❌ Failed to create test user:', error.message)
  process.exit(1)
}

console.log('✓ Test user ready')
console.log('  email   :', EMAIL)
console.log('  password:', PASSWORD)
console.log('  id      :', data.user.id)
