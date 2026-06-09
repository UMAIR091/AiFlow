/** Quick connectivity test for the publishable (anon) key. */
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

const url = env.NEXT_PUBLIC_SUPABASE_URL
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
console.log('URL :', url)
console.log('Anon:', anon.slice(0, 20) + '…', `(format: ${anon.startsWith('sb_publishable_') ? 'NEW publishable' : anon.startsWith('eyJ') ? 'legacy JWT' : 'unknown'})`)

const supabase = createClient(url, anon)

// Anonymous select — RLS should return empty (not error) if the key + connection work.
const { data, error } = await supabase.from('automations').select('id').limit(1)
if (error) {
  console.log('\n❌ Query error:', error.message, error.code ? `(${error.code})` : '')
} else {
  console.log('\n✓ Connected. Anonymous select returned', data.length, 'rows (RLS working as expected).')
}
