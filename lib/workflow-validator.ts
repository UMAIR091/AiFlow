import type { WorkflowJSON, AutomationAction, AutomationCondition } from '@/types/automation'

/**
 * The deterministic half of the automation builder.
 *
 * The AI proposes a workflow; this module makes it trustworthy:
 *  - canonicalizeApp: maps whatever name the model used onto our app registry
 *  - normalizeWorkflow: coerces the raw model output into a complete, runnable
 *    WorkflowJSON (every required settings key present, ids unique, positions sane)
 *  - lintWorkflow: compares the workflow against the user's own words and
 *    reports what the AI missed, so a repair pass can fix it
 */

interface AppSpec {
  /** Lowercase exact-match aliases that should map to this canonical name. */
  aliases: string[]
  /** Settings keys expected when this app is the trigger. */
  triggerSettings?: string[]
  /** Settings keys expected when this app is an action. */
  actionSettings?: string[]
}

export const APP_REGISTRY: Record<string, AppSpec> = {
  Manual: { aliases: ['manual trigger', 'manual run', 'run button'], triggerSettings: [] },
  Schedule: { aliases: ['cron', 'timer', 'scheduler'], triggerSettings: ['frequency', 'time'] },
  Webhook: { aliases: ['incoming webhook', 'http trigger'], triggerSettings: ['path', 'method'] },
  'Google Forms': { aliases: ['google form', 'gform'], triggerSettings: ['path', 'form_id', 'instructions'] },
  Gmail: {
    aliases: ['email', 'e-mail', 'mail'],
    triggerSettings: ['from', 'subject_contains', 'label'],
    actionSettings: ['to', 'subject', 'body'],
  },
  Slack: { aliases: [], triggerSettings: ['channel'], actionSettings: ['channel', 'message'] },
  'Google Sheets': {
    aliases: ['google sheet', 'sheets', 'spreadsheet', 'gsheet'],
    triggerSettings: ['spreadsheet_id', 'sheet_name'],
    actionSettings: ['spreadsheet_id', 'sheet_name', 'values'],
  },
  Notion: { aliases: [], actionSettings: ['database_id', 'title', 'properties'] },
  Discord: { aliases: [], actionSettings: ['webhook_url', 'message'] },
  'HTTP Request': { aliases: ['http', 'api call', 'call url', 'rest api'], actionSettings: ['url', 'method', 'headers', 'body'] },
  Delay: { aliases: ['wait', 'pause', 'sleep'], actionSettings: ['duration'] },
  // Long tail — canonical naming only; the engine simulates these for now.
  Shopify: { aliases: [] },
  Typeform: { aliases: [] },
  Airtable: { aliases: [] },
  'Twitter/X': { aliases: ['twitter', 'x'] },
  Stripe: { aliases: [] },
  HubSpot: { aliases: [] },
  Trello: { aliases: [] },
  Asana: { aliases: [] },
  Jira: { aliases: [] },
  GitHub: { aliases: [] },
  Dropbox: { aliases: [] },
  OneDrive: { aliases: [] },
  Zoom: { aliases: [] },
  Calendly: { aliases: [] },
  WhatsApp: { aliases: [] },
}

/** Map any app name the model produced onto a canonical registry name. */
export function canonicalizeApp(name: string): string {
  const n = String(name || '').trim()
  if (!n) return 'HTTP Request'
  const lower = n.toLowerCase()
  for (const [canonical, spec] of Object.entries(APP_REGISTRY)) {
    if (canonical.toLowerCase() === lower || spec.aliases.includes(lower)) return canonical
  }
  return n // unknown apps stay as-is; the engine runs them in simulation mode
}

/** Ensure a node carries every expected settings key; recompute config_fields from what's still empty. */
function completeNode<T extends { settings: Record<string, unknown>; config_fields: string[] }>(
  node: T,
  expectedKeys: string[]
): T {
  const settings: Record<string, unknown> = { ...node.settings }
  for (const key of expectedKeys) {
    if (!(key in settings)) settings[key] = ''
  }
  // config_fields = keys that still need a value (expected ∪ model-listed, minus filled)
  const candidates = new Set<string>([...(node.config_fields ?? []), ...expectedKeys])
  const config_fields = Array.from(candidates).filter(k => {
    const v = settings[k]
    return v === '' || v === null || v === undefined
  })
  return { ...node, settings, config_fields }
}

/** Coerce whatever the model returned into a valid, complete WorkflowJSON. */
export function normalizeWorkflow(raw: unknown, description: string): WorkflowJSON {
  const w = (raw ?? {}) as Record<string, unknown>

  // --- Trigger ---
  const rawTrigger = (w.trigger ?? {}) as Record<string, unknown>
  const triggerApp = canonicalizeApp(String(rawTrigger.app || 'Manual'))
  let trigger = {
    app: triggerApp,
    event: String(rawTrigger.event || (triggerApp === 'Manual' ? 'Run Button Clicked' : 'Event received')),
    description: String(rawTrigger.description || 'Runs when you click the Run button.'),
    settings: (rawTrigger.settings && typeof rawTrigger.settings === 'object'
      ? rawTrigger.settings
      : {}) as Record<string, unknown>,
    config_fields: Array.isArray(rawTrigger.config_fields) ? rawTrigger.config_fields.map(String) : [],
  }
  trigger = completeNode(trigger, APP_REGISTRY[triggerApp]?.triggerSettings ?? [])

  // --- Actions ---
  let rawActions = Array.isArray(w.actions) ? w.actions : []
  if (rawActions.length === 0) {
    // Hard rule: never an empty automation — synthesize a sensible notification step.
    rawActions = [{
      app: 'Slack',
      action: 'Post Message',
      description: `Notify about: ${description.slice(0, 80)}`,
      settings: { channel: '', message: '' },
      config_fields: ['channel', 'message'],
    }]
  }

  const seenIds = new Set<string>()
  const actions: AutomationAction[] = rawActions.map((a, i) => {
    const action = (a ?? {}) as Record<string, unknown>
    const app = canonicalizeApp(String(action.app || 'HTTP Request'))
    let id = String(action.id || `action_${i + 1}`)
    while (seenIds.has(id)) id = `${id}_${i + 1}` // ids must be unique — they're React Flow node keys
    seenIds.add(id)
    const node = {
      id,
      app,
      action: String(action.action || 'Run Step'),
      description: String(action.description || ''),
      settings: (action.settings && typeof action.settings === 'object'
        ? action.settings
        : {}) as Record<string, unknown>,
      config_fields: Array.isArray(action.config_fields) ? action.config_fields.map(String) : [],
      position:
        action.position && typeof action.position === 'object' &&
        typeof (action.position as { x?: unknown }).x === 'number'
          ? (action.position as { x: number; y: number })
          : { x: 350 + i * 270, y: 200 },
    }
    return completeNode(node, APP_REGISTRY[app]?.actionSettings ?? [])
  })

  // --- Conditions ---
  const conditions: AutomationCondition[] = (Array.isArray(w.conditions) ? w.conditions : [])
    .map((c, i) => {
      const cond = (c ?? {}) as Record<string, unknown>
      return {
        id: String(cond.id || `condition_${i + 1}`),
        field: String(cond.field || ''),
        operator: String(cond.operator || 'equals'),
        value: String(cond.value ?? ''),
        description: String(cond.description || ''),
        position:
          cond.position && typeof cond.position === 'object' &&
          typeof (cond.position as { x?: unknown }).x === 'number'
            ? (cond.position as { x: number; y: number })
            : { x: 350 + i * 270, y: 420 },
      }
    })
    .filter(c => c.field || c.value)

  return {
    trigger,
    actions,
    conditions,
    plain_summary: String(w.plain_summary || 'This automation runs the steps you described.'),
    suggested_name: String(w.suggested_name || 'New Automation'),
  }
}

// ─── Lint: compare the workflow against the user's own words ──────────────────

interface KeywordExpectation {
  pattern: RegExp
  app: string
  /** 'any' = anywhere in the workflow; 'trigger' = must be the trigger app */
  role: 'any' | 'trigger'
  label: string
}

const KEYWORD_EXPECTATIONS: KeywordExpectation[] = [
  { pattern: /\b(e-?mail|gmail)\b/i, app: 'Gmail', role: 'any', label: 'email' },
  { pattern: /\bslack\b/i, app: 'Slack', role: 'any', label: 'Slack' },
  { pattern: /\b(google\s?sheets?|spread\s?sheet)\b/i, app: 'Google Sheets', role: 'any', label: 'Google Sheets' },
  { pattern: /\bnotion\b/i, app: 'Notion', role: 'any', label: 'Notion' },
  { pattern: /\bdiscord\b/i, app: 'Discord', role: 'any', label: 'Discord' },
  { pattern: /\bgoogle\s?forms?\b/i, app: 'Google Forms', role: 'trigger', label: 'a Google Form' },
  { pattern: /\b(airtable)\b/i, app: 'Airtable', role: 'any', label: 'Airtable' },
  { pattern: /\b(trello)\b/i, app: 'Trello', role: 'any', label: 'Trello' },
  { pattern: /\b(github)\b/i, app: 'GitHub', role: 'any', label: 'GitHub' },
  { pattern: /\b(shopify)\b/i, app: 'Shopify', role: 'any', label: 'Shopify' },
]

const SCHEDULE_PATTERN = /\b((every|each)\s+(day|morning|evening|night|week|hour|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|daily|weekly|hourly|monthly)\b|\bat\s+\d{1,2}(:\d{2})?\s*(am|pm)\b/i
const CONDITION_PATTERN = /\bonly\s+if\b|\bunless\b|\bif\s+(the|it|there|a|an|any)\b/i
const DELAY_PATTERN = /\bwait\b|\bdelay\b|\bafter\s+\d+\s*(seconds?|minutes?|hours?)\b/i

/**
 * Returns plain-language problems with the workflow, judged against the user's
 * description. Empty array = the workflow looks faithful.
 */
export function lintWorkflow(workflow: WorkflowJSON, description: string): string[] {
  const issues: string[] = []
  const appsInWorkflow = new Set<string>([
    canonicalizeApp(workflow.trigger?.app ?? ''),
    ...workflow.actions.map(a => canonicalizeApp(a.app)),
  ])

  if (!workflow.trigger?.app) issues.push('The workflow has no trigger node.')
  if (workflow.actions.length === 0) issues.push('The workflow has no action nodes.')

  // 1) Every app the user named must appear in the workflow.
  for (const exp of KEYWORD_EXPECTATIONS) {
    if (!exp.pattern.test(description)) continue
    if (exp.role === 'trigger') {
      if (canonicalizeApp(workflow.trigger?.app ?? '') !== exp.app) {
        issues.push(`The user's description mentions ${exp.label} starting the automation, but the trigger is "${workflow.trigger?.app}" instead of ${exp.app}.`)
      }
    } else if (!appsInWorkflow.has(exp.app)) {
      issues.push(`The user's description mentions ${exp.label}, but there is no ${exp.app} node in the workflow.`)
    }
  }

  // 2) Time words ("every morning", "daily", "at 9am") need a Schedule trigger —
  //    unless an event trigger (form/webhook) is clearly the starter.
  const eventTriggers = ['Google Forms', 'Webhook', 'Typeform', 'Shopify', 'Stripe', 'Calendly', 'GitHub']
  if (
    SCHEDULE_PATTERN.test(description) &&
    canonicalizeApp(workflow.trigger?.app ?? '') !== 'Schedule' &&
    !eventTriggers.includes(canonicalizeApp(workflow.trigger?.app ?? ''))
  ) {
    issues.push('The description mentions a recurring time (e.g. "every day", "at 9am"), but the trigger is not a Schedule.')
  }

  // 3) "only if / unless / if the…" needs a condition node.
  if (CONDITION_PATTERN.test(description) && (workflow.conditions?.length ?? 0) === 0) {
    issues.push('The description contains a condition ("if/only if/unless"), but the workflow has no condition node.')
  }

  // 4) "wait / delay / after N minutes" needs a Delay node.
  if (DELAY_PATTERN.test(description) && !appsInWorkflow.has('Delay')) {
    issues.push('The description mentions waiting/delaying, but the workflow has no Delay node.')
  }

  // 5) Sequencing words suggest a minimum action count.
  const thenCount = (description.match(/\b(then|and then|after that|afterwards|next,)\b/gi) ?? []).length
  if (thenCount > 0 && workflow.actions.length < thenCount + 1) {
    issues.push(`The description chains at least ${thenCount + 1} separate actions ("then…"), but the workflow only has ${workflow.actions.length} action node(s). Each distinct task needs its own node.`)
  }

  // 6) Trigger placeholders only make sense when the trigger produces event data.
  const dataTriggers = ['Google Forms', 'Webhook', 'Typeform', 'Gmail', 'Shopify', 'Stripe', 'Airtable', 'GitHub', 'Calendly']
  const usesTriggerData = workflow.actions.some(a =>
    Object.values(a.settings).some(v => typeof v === 'string' && v.includes('{{trigger.'))
  )
  if (usesTriggerData && !dataTriggers.includes(canonicalizeApp(workflow.trigger?.app ?? ''))) {
    issues.push(`Some steps use {{trigger.…}} data, but the "${workflow.trigger?.app}" trigger produces no event data. Either use a data-producing trigger or fill those fields with literal values from the description.`)
  }

  return issues
}
