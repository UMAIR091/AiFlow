/** Verify the canvas route renders for an authenticated user (bypasses the browser). */
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

const url = env.NEXT_PUBLIC_SUPABASE_URL
const ref = new URL(url).hostname.split('.')[0]
const supabase = createClient(url, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// 1) Sign in to get a real session.
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'test@autoflow.dev', password: 'autoflow-test-1234',
})
if (error) { console.error('❌ sign-in failed:', error.message); process.exit(1) }
console.log('✓ signed in as', data.user.email)

// 2) Build the @supabase/ssr auth cookie (base64- prefixed JSON of the session).
const session = data.session
const cookieName = `sb-${ref}-auth-token`
const cookieVal = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64')
const cookie = `${cookieName}=${cookieVal}`

// 3) Find an automation id for this user.
const { data: autos } = await supabase.from('automations')
  .select('id,name').eq('user_id', data.user.id).order('created_at', { ascending: false }).limit(1)
const id = autos?.[0]?.id
if (!id) { console.error('❌ no automation found; run seed-automation.mjs'); process.exit(1) }
console.log('✓ automation:', autos[0].name, id)

// 4) Hit the canvas route with the session cookie.
const base = 'http://localhost:3000'
const targets = [
  `/builder/canvas?id=${id}`,
  `/dashboard`,
]
for (const path of targets) {
  const t0 = Date.now()
  try {
    const r = await fetch(base + path, { headers: { cookie }, redirect: 'manual' })
    const body = await r.text()
    const ms = Date.now() - t0
    const hasCanvas = /react-flow|reactflow|AutoFlow/i.test(body)
    console.log(`${path}\n  status=${r.status} ${ms}ms loc=${r.headers.get('location') || '-'} bytes=${body.length} canvasMarkup=${hasCanvas}`)
    if (r.status >= 500) console.log('  ⨯ first 300 chars:', body.replace(/\s+/g, ' ').slice(0, 300))
  } catch (e) {
    console.log(`${path}\n  ERR ${e.name} ${e.message}`)
  }
}
