/** Enable auto-confirm for signups (disable the email confirmation requirement)
 *  via the Supabase Management API. Useful in dev because Supabase's default
 *  confirmation emails are heavily rate-limited and often never arrive.
 *  Requires SUPABASE_ACCESS_TOKEN (sbp_...) in .env.local. */
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const env = {}
for (const line of readFileSync(join(__dir, '..', '.env.local'), 'utf8').split('\n')) {
  const t = line.trim(); if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('='); if (eq !== -1) env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim()
}

const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]
const token = env.SUPABASE_ACCESS_TOKEN
if (!token) { console.error('❌ SUPABASE_ACCESS_TOKEN missing from .env.local'); process.exit(1) }

const url = `https://api.supabase.com/v1/projects/${ref}/config/auth`
const res = await fetch(url, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ mailer_autoconfirm: true }),
})
const text = await res.text()
if (!res.ok) { console.error(`❌ HTTP ${res.status}:`, text.slice(0, 300)); process.exit(1) }

let body; try { body = JSON.parse(text) } catch { body = {} }
console.log('✓ auth config updated')
console.log('  mailer_autoconfirm:', body.mailer_autoconfirm)
console.log('  → new signups are now confirmed instantly (no email needed)')
