import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient as createClient } from '@/lib/supabase/route'
import type { WorkflowJSON, RunLogEntry } from '@/types/automation'

// ─── App executors ────────────────────────────────────────────────────────────

async function executeStep(
  app: string,
  action: string,
  settings: Record<string, unknown>,
  connections: Record<string, { api_key?: string; access_token?: string; metadata?: Record<string, unknown> }>
): Promise<{ success: boolean; message: string; data?: unknown }> {
  const appLower = app.toLowerCase()

  // ── Slack ──────────────────────────────────────────────────────────────────
  if (appLower === 'slack') {
    const token = connections['slack']?.api_key || connections['slack']?.access_token
    if (!token) return { success: false, message: 'Slack not connected. Go to Connections to link your Slack bot token.' }
    try {
      const channel = (settings.channel as string) || '#general'
      const text = (settings.message as string) || 'AutoFlow automation ran.'
      const res = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, text }),
      })
      const data = await res.json()
      if (!data.ok) return { success: false, message: `Slack error: ${data.error}` }
      return { success: true, message: `Message sent to ${channel}`, data }
    } catch {
      return { success: false, message: 'Could not reach Slack. Check your bot token.' }
    }
  }

  // ── Gmail / Email (via Resend) ─────────────────────────────────────────────
  if (appLower === 'gmail' || appLower === 'email') {
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) return { success: false, message: 'Email sending not configured. Add RESEND_API_KEY to your environment.' }
    const to = (settings.to as string) || ''
    if (!to) return { success: false, message: 'No recipient email address. Fill in the "to" field in the Gmail step.' }
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || 'AutoFlow <noreply@autoflow.app>',
          to: [to],
          subject: (settings.subject as string) || 'Notification from AutoFlow',
          html: `<p>${((settings.body as string) || 'Your automation ran successfully.').replace(/\n/g, '<br>')}</p>`,
        }),
      })
      const data = await res.json()
      if (!res.ok) return { success: false, message: `Email error: ${data.message || 'Unknown error'}` }
      return { success: true, message: `Email sent to ${to}`, data }
    } catch {
      return { success: false, message: 'Could not send email. Check your Resend API key.' }
    }
  }

  // ── Google Sheets ──────────────────────────────────────────────────────────
  if (appLower === 'google sheets') {
    const token = connections['google_sheets']?.access_token
    if (!token) return { success: false, message: 'Google Sheets not connected. Go to Connections to link Google Sheets.' }
    const spreadsheetId = (settings.spreadsheet_id as string) || ''
    const sheetName = (settings.sheet_name as string) || 'Sheet1'
    if (!spreadsheetId) return { success: false, message: 'No spreadsheet ID. Fill in the spreadsheet ID in the Google Sheets step.' }
    try {
      const values = settings.values
        ? (Array.isArray(settings.values) ? settings.values : [[settings.values]])
        : [[new Date().toISOString(), 'AutoFlow entry']]
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ values }),
        }
      )
      const data = await res.json()
      if (!res.ok) return { success: false, message: `Google Sheets error: ${data.error?.message || 'Unknown error'}` }
      return { success: true, message: `Row added to "${sheetName}"`, data }
    } catch {
      return { success: false, message: 'Could not reach Google Sheets. Check your access token.' }
    }
  }

  // ── Notion ─────────────────────────────────────────────────────────────────
  if (appLower === 'notion') {
    const token = connections['notion']?.api_key
    if (!token) return { success: false, message: 'Notion not connected. Go to Connections to link Notion.' }
    const databaseId = (settings.database_id as string) || ''
    if (!databaseId) return { success: false, message: 'No database ID. Fill in the database ID in the Notion step.' }
    try {
      const res = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28',
        },
        body: JSON.stringify({
          parent: { database_id: databaseId },
          properties: {
            title: { title: [{ text: { content: (settings.title as string) || 'AutoFlow Entry' } }] },
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) return { success: false, message: `Notion error: ${data.message || 'Unknown error'}` }
      return { success: true, message: `Page created in Notion database`, data }
    } catch {
      return { success: false, message: 'Could not reach Notion. Check your API key.' }
    }
  }

  // ── Discord ────────────────────────────────────────────────────────────────
  if (appLower === 'discord') {
    const token = connections['discord']?.api_key
    if (!token) return { success: false, message: 'Discord not connected. Go to Connections to link Discord.' }
    const channelId = (settings.channel_id as string) || ''
    if (!channelId) return { success: false, message: 'No channel ID. Fill in the channel ID in the Discord step.' }
    try {
      const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: (settings.message as string) || 'AutoFlow automation ran.' }),
      })
      if (!res.ok) return { success: false, message: `Discord error: ${res.status}` }
      return { success: true, message: `Message sent to Discord channel`, data: {} }
    } catch {
      return { success: false, message: 'Could not reach Discord. Check your bot token.' }
    }
  }

  // ── HTTP Request ───────────────────────────────────────────────────────────
  if (appLower === 'http request') {
    const url = settings.url as string
    if (!url) return { success: false, message: 'No URL specified for HTTP Request step.' }
    try {
      const res = await fetch(url, {
        method: (settings.method as string) || 'GET',
        headers: settings.headers ? (settings.headers as Record<string, string>) : {},
        body: settings.body ? JSON.stringify(settings.body) : undefined,
      })
      return { success: res.ok, message: `HTTP ${res.status} from ${url}`, data: { status: res.status } }
    } catch {
      return { success: false, message: `Could not reach ${url}. Check the URL.` }
    }
  }

  // ── Schedule / Webhook (passive triggers) ─────────────────────────────────
  if (['schedule', 'webhook', 'google forms'].includes(appLower)) {
    return { success: true, message: `${app}: trigger acknowledged` }
  }

  // ── Default simulation ─────────────────────────────────────────────────────
  return {
    success: true,
    message: `${app} — "${action}" completed (simulated — real integration coming soon)`,
    data: {},
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json() as { automation_id: string; workflow: WorkflowJSON; simulated?: boolean }
  const { automation_id, workflow, simulated = false } = body

  // Load user connections
  const { data: connRows } = await supabase
    .from('connections')
    .select('platform, api_key, access_token, metadata')
    .eq('user_id', user.id)

  const connections: Record<string, { api_key?: string; access_token?: string; metadata?: Record<string, unknown> }> = {}
  for (const c of connRows ?? []) {
    connections[c.platform] = {
      api_key: c.api_key ?? undefined,
      access_token: c.access_token ?? undefined,
      metadata: (c.metadata as Record<string, unknown>) ?? {},
    }
  }

  // Create run record
  const { data: run } = await supabase.from('runs').insert({
    automation_id,
    status: 'running',
    log: [],
    started_at: new Date().toISOString(),
  }).select().single()

  if (!run) return NextResponse.json({ error: 'Could not create run record.' }, { status: 500 })

  const log: RunLogEntry[] = []

  const addLog = async (entry: RunLogEntry) => {
    log.push(entry)
    await supabase.from('runs').update({ log }).eq('id', run.id)
  }

  await supabase.from('automations').update({ status: 'running' }).eq('id', automation_id)

  // Log trigger
  await addLog({
    step: 'Trigger',
    status: 'success',
    message: `Trigger: ${workflow.trigger.app} — ${workflow.trigger.event}`,
    timestamp: new Date().toISOString(),
  })

  let allPassed = true

  for (const action of workflow.actions) {
    await addLog({
      step: action.id,
      status: 'running',
      message: `Starting: ${action.app} — ${action.action}`,
      timestamp: new Date().toISOString(),
    })

    const result = simulated
      ? { success: true, message: `${action.app} — "${action.action}" (simulated run)`, data: {} }
      : await executeStep(action.app, action.action, action.settings, connections)

    await addLog({
      step: action.id,
      status: result.success ? 'success' : 'failed',
      message: result.message,
      timestamp: new Date().toISOString(),
      data: result.data,
    })

    if (!result.success) { allPassed = false; break }
  }

  const finalStatus = allPassed ? 'success' : 'failed'

  await supabase.from('runs').update({
    status: finalStatus,
    finished_at: new Date().toISOString(),
  }).eq('id', run.id)

  await supabase.from('automations').update({
    status: 'active',
    last_run: new Date().toISOString(),
  }).eq('id', automation_id)

  return NextResponse.json({ run_id: run.id, status: finalStatus, log })
}
