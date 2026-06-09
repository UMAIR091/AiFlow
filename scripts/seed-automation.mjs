/** Insert a demo automation (Schedule → Gmail → Slack) for the test user. */
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
const { data: list } = await admin.auth.admin.listUsers()
const user = list?.users?.find(u => u.email === EMAIL)
if (!user) { console.error('❌ test user not found; run seed-user.mjs first'); process.exit(1) }

const workflow_json = {
  suggested_name: 'Daily Gmail digest to Slack',
  plain_summary: 'Every morning, find new emails in Gmail and post a summary to Slack.',
  trigger: {
    app: 'Schedule',
    event: 'Every day at 9:00 AM',
    description: 'Runs daily at 9 AM',
    settings: { time: '09:00', frequency: 'daily' },
    config_fields: ['time', 'frequency'],
  },
  actions: [
    {
      id: 'act_gmail',
      app: 'Gmail',
      action: 'Search emails',
      description: 'Find new emails from the last 24 hours',
      settings: { from: '', label: 'inbox', subject_contains: '' },
      config_fields: ['from', 'label', 'subject_contains'],
      position: { x: 360, y: 200 },
    },
    {
      id: 'act_slack',
      app: 'Slack',
      action: 'Send message',
      description: 'Post the email summary to a channel',
      settings: { channel: '#general', message: 'You have new emails 📬' },
      config_fields: ['channel', 'message'],
      position: { x: 660, y: 200 },
    },
  ],
}

const { data, error } = await admin.from('automations').insert({
  user_id: user.id,
  name: workflow_json.suggested_name,
  description: workflow_json.plain_summary,
  workflow_json,
  status: 'paused',
}).select().single()

if (error) { console.error('❌ insert failed:', error.message); process.exit(1) }
console.log('✓ Automation seeded')
console.log('  id  :', data.id)
console.log('  url :', `/builder/canvas?id=${data.id}`)
