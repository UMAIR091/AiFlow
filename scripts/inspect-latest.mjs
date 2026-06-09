/** Inspect the most recently saved automation's workflow_json. */
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

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data, error } = await admin
  .from('automations')
  .select('id, name, description, status, platform, workflow_json, created_at')
  .order('created_at', { ascending: false })
  .limit(1)
  .single()

if (error) { console.error('❌', error.message); process.exit(1) }

const w = data.workflow_json
console.log('\n📦 Latest saved automation')
console.log('  id        :', data.id)
console.log('  name      :', data.name)
console.log('  status    :', data.status, '| platform:', data.platform)
console.log('  summary   :', data.description)
console.log('\n  TRIGGER:')
console.log('    app/event   :', w.trigger?.app, '—', w.trigger?.event)
console.log('    settings    :', JSON.stringify(w.trigger?.settings))
console.log('    config_fields:', JSON.stringify(w.trigger?.config_fields))
console.log('\n  ACTIONS (' + (w.actions?.length ?? 0) + '):')
for (const a of w.actions ?? []) {
  console.log(`    [${a.id}] ${a.app} — ${a.action}`)
  console.log('       settings     :', JSON.stringify(a.settings))
  console.log('       config_fields:', JSON.stringify(a.config_fields))
}

// Validation checks for Fix 2
const checks = {
  'has >=1 action': (w.actions?.length ?? 0) >= 1,
  'trigger has config_fields array': Array.isArray(w.trigger?.config_fields),
  'every action has settings object': (w.actions ?? []).every(a => a.settings && typeof a.settings === 'object'),
  'every action has config_fields array': (w.actions ?? []).every(a => Array.isArray(a.config_fields)),
  'has suggested_name': !!w.suggested_name,
  'has plain_summary': !!w.plain_summary,
}
console.log('\n  ✅ Fix-2 validation:')
for (const [k, v] of Object.entries(checks)) console.log(`    ${v ? '✓' : '✗'} ${k}`)
