/**
 * AutoFlow database migration.
 * Runs supabase/schema.sql against your Supabase project via the
 * Supabase Management API (POST /v1/projects/{ref}/database/query),
 * which executes raw SQL — the same thing the dashboard SQL editor does.
 *
 * Requires a Personal Access Token in .env.local:
 *   SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxxxxxx
 * Get one at: https://supabase.com/dashboard/account/tokens
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  const env = {}
  try {
    const lines = readFileSync(join(__dir, '..', '.env.local'), 'utf8').split('\n')
    for (const line of lines) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq === -1) continue
      env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim()
    }
  } catch {
    console.error('Could not read .env.local')
  }
  return env
}

const env = loadEnv()
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const ACCESS_TOKEN = env.SUPABASE_ACCESS_TOKEN

if (!SUPABASE_URL) {
  console.error('❌  NEXT_PUBLIC_SUPABASE_URL is missing from .env.local')
  process.exit(1)
}

// Extract project ref from the URL: https://<ref>.supabase.co
const ref = new URL(SUPABASE_URL).hostname.split('.')[0]

if (!ACCESS_TOKEN) {
  console.error(`
❌  SUPABASE_ACCESS_TOKEN is missing from .env.local

The service_role key can't run CREATE TABLE — that needs a Personal Access Token.

To get one:
  1. Go to https://supabase.com/dashboard/account/tokens
  2. Click "Generate new token", name it "autoflow-migrate", copy it (starts sbp_)
  3. Add to .env.local:
       SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxxxxxx
  4. Re-run:  node scripts/migrate.mjs
`)
  process.exit(1)
}

const sql = readFileSync(join(__dir, '..', 'supabase', 'schema.sql'), 'utf8')

console.log(`\n🚀  AutoFlow DB Migration`)
console.log(`   Project ref : ${ref}`)
console.log(`   Schema      : supabase/schema.sql (${sql.split('\n').length} lines)\n`)
console.log(`   Running full schema via Management API…`)

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${ACCESS_TOKEN}`,
  },
  body: JSON.stringify({ query: sql }),
})

const text = await res.text()
let body
try { body = JSON.parse(text) } catch { body = text }

console.log(`\n${'─'.repeat(52)}`)
if (res.ok) {
  console.log(`  🎉  Migration complete! All tables created.`)
  console.log(`${'─'.repeat(52)}\n`)
  console.log(`  Tables: connections, automations, runs, generated_sites`)
  console.log(`  Verify: https://supabase.com/dashboard/project/${ref}/editor\n`)
  console.log(`  Next: npm run dev → http://localhost:3000\n`)
} else {
  console.log(`  ❌  HTTP ${res.status}`)
  console.log(`${'─'.repeat(52)}\n`)
  console.log(typeof body === 'string' ? body : JSON.stringify(body, null, 2))
  console.log()
  process.exit(1)
}
