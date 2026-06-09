/** Verify AutoFlow tables exist and report their columns + RLS status. */
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const env = {}
for (const line of readFileSync(join(__dir, '..', '.env.local'), 'utf8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('=')
  if (eq !== -1) env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim()
}

const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]

async function q(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}` },
    body: JSON.stringify({ query }),
  })
  return res.json()
}

const tables = await q(`
  select t.tablename,
         (select count(*) from information_schema.columns c
            where c.table_name = t.tablename and c.table_schema = 'public') as columns,
         t.rowsecurity as rls
  from pg_tables t
  where t.schemaname = 'public'
    and t.tablename in ('connections','automations','runs','generated_sites')
  order by t.tablename;
`)

const policies = await q(`
  select tablename, count(*) as policies
  from pg_policies where schemaname = 'public'
  group by tablename order by tablename;
`)

console.log('\n📋  AutoFlow tables in public schema:\n')
const polMap = Object.fromEntries((policies || []).map(p => [p.tablename, p.policies]))
const expected = ['automations', 'connections', 'generated_sites', 'runs']
for (const name of expected) {
  const row = (tables || []).find(t => t.tablename === name)
  if (row) {
    console.log(`  ✓ ${name.padEnd(16)} ${row.columns} cols   RLS: ${row.rls ? 'on' : 'OFF'}   policies: ${polMap[name] ?? 0}`)
  } else {
    console.log(`  ✗ ${name.padEnd(16)} MISSING`)
  }
}
console.log()
