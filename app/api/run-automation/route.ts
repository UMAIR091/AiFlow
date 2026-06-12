import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient as createClient } from '@/lib/supabase/route'
import type { WorkflowJSON, RunLogEntry, AutomationCondition } from '@/types/automation'

type Connections = Record<string, { api_key?: string; access_token?: string; metadata?: Record<string, unknown> }>
type StepResult = { success: boolean; message: string; data?: unknown }

// ─── Config helpers ───────────────────────────────────────────────────────────

/** Read the first non-empty value among several setting keys (snake_case + camelCase tolerated). */
function pick(settings: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    const v = settings[key]
    if (v !== undefined && v !== null && v !== '') return v
  }
  return undefined
}

/**
 * Required config per app. Each inner array is a group of equivalent keys —
 * at least one key in each group must be filled for the step to run.
 */
const REQUIRED_FIELDS: Record<string, string[][]> = {
  slack: [['channel'], ['message']],
  gmail: [['to']],
  email: [['to']],
  'google sheets': [['spreadsheet_id', 'spreadsheetId']],
  notion: [['database_id', 'databaseId']],
  discord: [['webhook_url', 'webhookUrl', 'channel_id']],
  'http request': [['url']],
  delay: [['duration']],
}

/** Returns the missing field name, or null when all required config is present. */
function findMissingField(app: string, settings: Record<string, unknown>): string | null {
  const groups = REQUIRED_FIELDS[app.toLowerCase()]
  if (!groups) return null
  for (const group of groups) {
    if (pick(settings, ...group) === undefined) return group[0]
  }
  return null
}

/**
 * Replace "{{trigger.field}}" placeholders in string settings with live values
 * from the trigger context (webhook payload / trigger settings). Unresolvable
 * placeholders are left intact so the step's own validation reports them.
 */
function resolvePlaceholders(
  settings: Record<string, unknown>,
  context: Record<string, unknown>
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(settings)) {
    resolved[k] = typeof v === 'string'
      ? v.replace(/\{\{\s*trigger\.([\w.-]+)\s*\}\}/g, (match, field) => {
          const key = Object.keys(context).find(c => c.toLowerCase() === String(field).toLowerCase())
          return key !== undefined ? String(context[key]) : match
        })
      : v
  }
  return resolved
}

// ─── Condition evaluation ─────────────────────────────────────────────────────

function evaluateCondition(
  cond: AutomationCondition,
  context: Record<string, unknown>
): { pass: boolean; note: string } {
  const field = String(cond.field ?? '')
  // Case-insensitive lookup in the trigger/event context.
  const key = Object.keys(context).find(k => k.toLowerCase() === field.toLowerCase())
  const actual = key !== undefined ? context[key] : undefined

  if (actual === undefined) {
    // Manual runs have no live event payload — don't block the user.
    return { pass: true, note: `No live data for "${field}" in this run — condition check skipped.` }
  }

  const a = String(actual)
  const b = String(cond.value ?? '')
  const numA = Number(a)
  const numB = Number(b)
  const bothNumeric = !Number.isNaN(numA) && !Number.isNaN(numB) && a.trim() !== '' && b.trim() !== ''

  let pass: boolean
  switch (cond.operator) {
    case 'not_equals': pass = a.toLowerCase() !== b.toLowerCase(); break
    case 'contains': pass = a.toLowerCase().includes(b.toLowerCase()); break
    case 'greater_than': pass = bothNumeric ? numA > numB : a > b; break
    case 'less_than': pass = bothNumeric ? numA < numB : a < b; break
    case 'equals':
    default: pass = a.toLowerCase() === b.toLowerCase(); break
  }
  return { pass, note: `"${field}" (${a}) ${cond.operator} "${b}" → ${pass}` }
}

// ─── App executors ────────────────────────────────────────────────────────────

async function executeStep(
  app: string,
  action: string,
  settings: Record<string, unknown>,
  connections: Connections
): Promise<StepResult> {
  const appLower = app.toLowerCase()

  // Validate required config before touching any API.
  const missing = findMissingField(app, settings)
  if (missing) {
    return { success: false, message: `Missing required field: ${missing} for ${app}` }
  }

  // ── Delay ──────────────────────────────────────────────────────────────────
  if (appLower === 'delay') {
    const requested = Number(pick(settings, 'duration', 'duration_seconds')) || 0
    const seconds = Math.min(Math.max(requested, 0), 30) // hard cap: 30s
    await new Promise(resolve => setTimeout(resolve, seconds * 1000))
    const capped = requested > 30 ? ` (capped from ${requested}s to 30s)` : ''
    return { success: true, message: `Waited ${seconds} seconds${capped}`, data: { waited_seconds: seconds } }
  }

  // ── Slack ──────────────────────────────────────────────────────────────────
  if (appLower === 'slack') {
    const token = connections['slack']?.api_key || connections['slack']?.access_token
    if (!token) return { success: false, message: 'Slack not connected. Go to Connections to link your Slack bot token.' }
    try {
      const channel = String(pick(settings, 'channel'))
      const text = String(pick(settings, 'message', 'text'))
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
    const to = String(pick(settings, 'to'))
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || 'AutoFlow <noreply@autoflow.app>',
          to: [to],
          subject: String(pick(settings, 'subject') ?? 'Notification from AutoFlow'),
          html: `<p>${String(pick(settings, 'body', 'message') ?? 'Your automation ran successfully.').replace(/\n/g, '<br>')}</p>`,
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
    const spreadsheetId = String(pick(settings, 'spreadsheet_id', 'spreadsheetId'))
    const sheetName = String(pick(settings, 'sheet_name', 'sheetName') ?? 'Sheet1')
    try {
      const rawValues = pick(settings, 'values')
      const values = rawValues
        ? (Array.isArray(rawValues) ? (Array.isArray(rawValues[0]) ? rawValues : [rawValues]) : [String(rawValues).split(',').map(s => s.trim())])
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
    const databaseId = String(pick(settings, 'database_id', 'databaseId'))
    try {
      const extraProps = pick(settings, 'properties')
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
            title: { title: [{ text: { content: String(pick(settings, 'title') ?? 'AutoFlow Entry') } }] },
            ...(extraProps && typeof extraProps === 'object' ? (extraProps as Record<string, unknown>) : {}),
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
    const message = String(pick(settings, 'message', 'content') ?? 'AutoFlow automation ran.')
    const webhookUrl = pick(settings, 'webhook_url', 'webhookUrl')

    // Preferred: post straight to a Discord webhook URL (no auth needed).
    if (webhookUrl) {
      try {
        const res = await fetch(String(webhookUrl), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: message }),
        })
        if (!res.ok) return { success: false, message: `Discord webhook error: HTTP ${res.status}` }
        return { success: true, message: 'Message sent to Discord', data: { status: res.status } }
      } catch {
        return { success: false, message: 'Could not reach the Discord webhook URL. Check the URL.' }
      }
    }

    // Fallback: bot token + channel id from connections.
    const token = connections['discord']?.api_key
    if (!token) return { success: false, message: 'Discord not connected. Provide a webhook URL in the step, or link a bot token in Connections.' }
    const channelId = String(pick(settings, 'channel_id', 'channelId'))
    try {
      const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message }),
      })
      if (!res.ok) return { success: false, message: `Discord error: ${res.status}` }
      return { success: true, message: `Message sent to Discord channel`, data: {} }
    } catch {
      return { success: false, message: 'Could not reach Discord. Check your bot token.' }
    }
  }

  // ── HTTP Request ───────────────────────────────────────────────────────────
  if (appLower === 'http request') {
    const url = String(pick(settings, 'url'))
    try {
      const method = String(pick(settings, 'method') ?? 'GET').toUpperCase()
      const headers = pick(settings, 'headers')
      const body = pick(settings, 'body')
      const res = await fetch(url, {
        method,
        headers: headers && typeof headers === 'object' ? (headers as Record<string, string>) : {},
        body: body !== undefined && method !== 'GET'
          ? (typeof body === 'string' ? body : JSON.stringify(body))
          : undefined,
      })
      return { success: res.ok, message: `HTTP ${res.status} from ${url}`, data: { status: res.status } }
    } catch {
      return { success: false, message: `Could not reach ${url}. Check the URL.` }
    }
  }

  // ── Schedule / Webhook / Google Forms (passive triggers) ──────────────────
  if (['schedule', 'webhook', 'google forms'].includes(appLower)) {
    return { success: true, message: `${app}: trigger acknowledged` }
  }

  // ── Default simulation for not-yet-integrated apps ─────────────────────────
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

  const body = await req.json() as {
    automation_id: string
    workflow: WorkflowJSON
    simulated?: boolean
    /** Live event payload when triggered by a webhook — used for condition checks. */
    trigger_data?: Record<string, unknown>
  }
  const { automation_id, workflow, simulated = false, trigger_data = {} } = body

  // Load user connections
  const { data: connRows } = await supabase
    .from('connections')
    .select('platform, api_key, access_token, metadata')
    .eq('user_id', user.id)

  const connections: Connections = {}
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

  // ── Conditions: if any evaluates to false, skip all remaining steps ─────────
  const context: Record<string, unknown> = { ...workflow.trigger.settings, ...trigger_data }
  let conditionStopped = false

  for (const cond of workflow.conditions ?? []) {
    const { pass, note } = evaluateCondition(cond, context)
    await addLog({
      step: cond.id || 'Condition',
      status: 'success',
      message: pass ? `Condition passed: ${note}` : 'Condition was false — automation stopped.',
      timestamp: new Date().toISOString(),
      data: { pass, note },
    })
    if (!pass) { conditionStopped = true; break }
  }

  // ── Actions: run all steps, keep going past failures ──────────────────────
  let successCount = 0
  const failedSteps: string[] = []

  if (!conditionStopped) {
    for (const action of workflow.actions) {
      const stepName = `${action.app} — ${action.action}`
      await addLog({
        step: action.id,
        status: 'running',
        message: `Starting: ${stepName}`,
        timestamp: new Date().toISOString(),
      })

      const started = Date.now()
      const result: StepResult = simulated
        ? { success: true, message: `${stepName} (simulated run)`, data: {} }
        : await executeStep(action.app, action.action, resolvePlaceholders(action.settings, context), connections)
      const duration = Date.now() - started

      await addLog({
        step: action.id,
        status: result.success ? 'success' : 'failed',
        message: result.message,
        timestamp: new Date().toISOString(),
        duration,
        data: result.data,
      })

      if (result.success) successCount++
      else failedSteps.push(stepName)
      // Continue running remaining steps even after a failure.
    }
  }

  // Failed only if EVERY executed step failed; partial success counts as success.
  const totalRun = successCount + failedSteps.length
  const finalStatus = totalRun > 0 && successCount === 0 ? 'failed' : 'success'
  const note = failedSteps.length > 0 && successCount > 0
    ? `Completed with issues — ${failedSteps.length} of ${totalRun} steps failed: ${failedSteps.join(', ')}`
    : undefined

  if (note) {
    await addLog({
      step: 'Summary',
      status: 'success',
      message: note,
      timestamp: new Date().toISOString(),
    })
  }

  await supabase.from('runs').update({
    status: finalStatus,
    finished_at: new Date().toISOString(),
  }).eq('id', run.id)

  await supabase.from('automations').update({
    status: finalStatus === 'failed' ? 'error' : 'active',
    last_run: new Date().toISOString(),
  }).eq('id', automation_id)

  return NextResponse.json({ run_id: run.id, status: finalStatus, log, ...(note ? { note } : {}) })
}
