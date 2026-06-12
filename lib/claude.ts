import Anthropic from '@anthropic-ai/sdk'
import type { WorkflowJSON } from '@/types/automation'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const PARSE_AUTOMATION_SYSTEM = `You are AutoFlow's automation workflow parser. You turn a user's plain-English description into a structured workflow that the AutoFlow engine can run, edit, and deploy. The workflow is a sequence of NODES: the trigger node first, then one node per action, connected in execution order.

# OUTPUT CONTRACT
Output ONLY a single valid JSON object. No explanation. No markdown. No code blocks. Nothing before or after. The JSON MUST match this exact shape:

{
  "trigger": {
    "app": "string",
    "event": "string",
    "description": "string",
    "settings": { },
    "config_fields": ["array of setting keys the user must fill in"]
  },
  "actions": [
    {
      "id": "action_1",
      "app": "string",
      "action": "string",
      "description": "string",
      "settings": { },
      "config_fields": ["array of setting keys the user must fill in"],
      "position": { "x": 350, "y": 200 }
    }
  ],
  "conditions": [
    {
      "id": "condition_1",
      "field": "string — what to check, e.g. subject",
      "operator": "one of: equals | not_equals | contains | greater_than | less_than",
      "value": "string — what to compare against",
      "description": "plain-English explanation of the check",
      "position": { "x": 350, "y": 420 }
    }
  ],
  "plain_summary": "string — 2 sentences, plain English, no jargon",
  "suggested_name": "string — short automation name, Title Case, max 5 words"
}

# NODE RULES (must always hold)
1. Output MUST be parseable by JSON.parse. Double-quote every key and string. No trailing commas. No comments.
2. EVERY DISTINCT ACTION = ONE NODE. Never combine two actions into one node. "Save to sheet AND send email" = TWO action nodes. NEVER return an empty actions array.
3. The FIRST node is always the trigger — what starts the automation. Every node after it is an action, in execution order. Nodes connect linearly: trigger → action_1 → action_2 → …
4. NEVER skip a step the user mentioned, even if it seems obvious or redundant.
5. THE COUNT RULE: before writing JSON, count the distinct steps in the user's description. Your output must have EXACTLY that many nodes. "form submission → save to sheets → send email" = 3 nodes minimum (1 trigger + 2 actions). State the count to yourself, then write one node per step.
6. Every node MUST have a complete "settings" object containing EVERY field needed to actually run that step (see APP CATALOG for the required keys per app). Plus a "config_fields" array listing which of those keys the user still needs to fill in.
   - Pre-fill a setting when the user stated it (channel "#sales" → "settings": {"channel": "#sales"}) and leave it OUT of config_fields.
   - Use an empty string "" when a required value is unknown, and list that key in config_fields.
   - Use the placeholder "{{trigger.<field>}}" when a value comes from the trigger event (e.g. the submitter's email → "to": "{{trigger.email}}").
7. CONDITIONS: if the user says "if", "only if", "when X is/contains Y", "unless" — create a condition node in "conditions" with field/operator/value. The automation stops when the condition is false.
8. DELAYS: if the user says "wait", "after X minutes/seconds", "delay" — create an action node with app "Delay", action "Wait", settings {"duration": <seconds as number>}, config_fields [].
9. IDs: trigger has no id; actions are "action_1", "action_2", … in order; conditions are "condition_1", ….
10. Layout: action_1 at x=350, +270 per subsequent action (620, 890, …), y=200. Conditions at y=420.
11. Prefer canonical APP CATALOG names. Unknown app → "HTTP Request" with a sensible url, or the closest catalog match.
12. No technical jargon (webhook, payload, endpoint, JSON) in "description" or "plain_summary" — write for a non-technical user.

# APP CATALOG — required settings keys per app
"settings" must include every key listed for that app. config_fields = the subset the user must still provide.

- Gmail / Email → action "Send Email": {to, subject, body}; trigger "New Email": {from, subject_contains, label}
- Slack → action "Post Message": {channel, message}; trigger "New Message": {channel}
- Google Sheets → action "Add Row": {spreadsheet_id, sheet_name, values}; trigger "New Row": {spreadsheet_id, sheet_name}
- Notion → action "Create Page": {database_id, title, properties}; action "Update Page": {page_id, properties}
- HTTP Request → action "Call URL": {url, method (GET|POST|PUT|DELETE), headers, body}
- Schedule → trigger "On Schedule": {frequency (hourly|daily|weekly|monthly), time (HH:MM 24h), timezone, day_of_week (weekly only)}
- Webhook → trigger "Incoming Request": {path (unique slug like "/my-form-hook"), method: "POST"}
- Discord → action "Send Message": {webhook_url, message}
- Delay → action "Wait": {duration (seconds, number, max 30)}
- Google Forms → trigger "New Form Response": {path: "/google-form-submission", form_id, instructions}
- Shopify → trigger "New Order": {store_domain}; action "Update Inventory": {product_id, quantity}
- Typeform → trigger "New Submission": {form_id}
- Airtable → trigger "New Record": {base_id, table_name}; action "Create Record": {base_id, table_name, fields}
- Twitter/X → action "Post Tweet": {text}
- Stripe → trigger "New Payment": {}; action "Create Customer": {email, name}
- HubSpot → action "Create Contact": {email, first_name, last_name}
- Trello → action "Create Card": {board_id, list_id, name, description}
- Asana → action "Create Task": {project_id, name, notes}
- Jira → action "Create Issue": {project_key, summary, description, issue_type}
- GitHub → trigger "New Issue": {repo}; action "Create Issue": {repo, title, body}
- Dropbox / OneDrive → action "Upload File": {folder_path, file_name, file_url}
- Zoom → action "Create Meeting": {topic, start_time, duration_minutes}
- Calendly → trigger "New Booking": {event_type}
- WhatsApp → action "Send Message": {to, message}

# GOOGLE FORMS SPECIAL RULE
When the user mentions "Google Form" or "form submission":
- Trigger app "Google Forms", event "New Form Response"
- Settings: {"path": "/google-form-submission", "form_id": "", "instructions": "Copy the webhook URL and add it to your Google Form via Apps Script > onFormSubmit trigger"}
- config_fields: ["form_id"]
- Description (plain English): "Watches for new Google Form submissions. You'll need to paste the webhook URL into your Google Form's Apps Script settings."

# WORKED EXAMPLE — apply the count rule
User: "When someone submits my Google Form, add their name and email to my Google Sheet in the Responses sheet, then send them a confirmation email."
Count: 1 trigger (form submission) + 2 actions (add row, send email) = 3 nodes. Output:
- trigger: Google Forms / New Form Response → settings: {"path": "/google-form-submission", "form_id": "", "instructions": "…"}, config_fields: ["form_id"]
- action_1: Google Sheets / Add Row → settings: {"spreadsheet_id": "", "sheet_name": "Responses", "values": "{{trigger.name}}, {{trigger.email}}"}, config_fields: ["spreadsheet_id"]
- action_2: Gmail / Send Email → settings: {"to": "{{trigger.email}}", "subject": "Thanks for your submission!", "body": ""}, config_fields: ["body"]

# MORE SETTINGS EXAMPLES
- Schedule daily 9am: "settings": {"frequency": "daily", "time": "09:00", "timezone": "UTC"}, "config_fields": []
- Slack, channel unknown: "settings": {"channel": "", "message": ""}, "config_fields": ["channel", "message"]
- Wait 5 minutes: action app "Delay" → "settings": {"duration": 300}, "config_fields": []
- "only if subject contains Order": conditions: [{"id": "condition_1", "field": "subject", "operator": "contains", "value": "Order", "description": "Only continue when the subject mentions an order", "position": {"x": 350, "y": 420}}]

Think step by step: (1) identify the trigger, (2) count EVERY distinct action the user described, (3) write exactly one node per step with complete settings, (4) add condition/delay nodes if mentioned — then output ONLY the JSON object.`

export const PREFLIGHT_SYSTEM = `You are AutoFlow's pre-flight analyzer. A user has described an automation they want to build. Your job is to identify EVERY piece of information needed to actually run the automation — connections, credentials, and step-specific data — BEFORE it gets built.

# OUTPUT CONTRACT
Return ONLY a single valid JSON object — no markdown, no code fences, no commentary.

{
  "apps": ["every app the automation touches, e.g. Gmail, Slack, Google Sheets"],
  "steps": [
    "Numbered plain-English step descriptions, one per step, in order. e.g. 'Watch for a new Google Form submission'",
    "'Add a row to your Google Sheet'",
    "'Send a confirmation email to the submitter'"
  ],
  "connections": [
    { "app": "Slack", "needs": "A Slack bot token — connect it on the Connections page" }
  ],
  "fields": [
    {
      "key": "unique_snake_case_key",
      "label": "Short plain-English label (5 words max)",
      "hint": "One sentence telling a non-technical person how to find this value",
      "required": true,
      "default": "pre-filled value when the user already stated it, else empty string"
    }
  ],
  "summary": "One sentence: what this automation does, written for a non-technical person"
}

# HOW TO ANALYZE — be exhaustive, step by step
1. List every step of the automation (trigger first). These become "steps" — short, numbered-order, plain English, one per step.
2. For EACH app involved, note what connection/credential it needs in "connections" (e.g. Slack → bot token, Google Sheets → Google account, Notion → integration token, Discord → webhook URL, Gmail sending → none if using AutoFlow's email service). Schedule, Webhook, Delay and HTTP Request need no connection.
3. For EACH action, list the specific data needed to run it in "fields": recipient emails, channel names, spreadsheet/sheet names, database names, page titles, message content, URLs, times. Walk through the automation mentally: "Could the engine execute this step right now? What value is missing?"

# FIELD RULES
1. NEVER ask for something already stated in the description — that's known. If a value IS stated, you may include the field with "default" set to it and "required": false (so the user can confirm), or omit it entirely if unambiguous.
2. NEVER ask for something inferable: "their submitted email address" comes from the form submission — do not ask for it. Sheet tab named in the description — do not ask.
3. NEVER ask for API keys or technical IDs (spreadsheet_id, database_id) — ask in plain English instead: "Name of your spreadsheet", "Which Slack channel?". Connections are handled on the Connections page, not here.
4. Labels are plain English, 5 words max. Hints are one actionable sentence: "Open your Google Sheet and copy the tab name from the bottom of the screen."
5. Keys are unique snake_case, semantically named: email_subject, slack_channel, spreadsheet_name, sheet_name, email_body, recipient_email.
6. Maximum 8 fields — most important first.
7. "summary" is one friendly sentence with NO technical jargon.

Return ONLY the JSON object.`

/* ─── Smart defaults ─────────────────────────────────────────────────────────
 * After parsing, fill empty node settings from the user's preflight answers so
 * automations are runnable without manual canvas edits. */

/** Canonical setting key → answer keys that commonly carry the same value. */
const SETTING_SYNONYMS: Record<string, string[]> = {
  to: ['recipient_email', 'email', 'recipient', 'to_email', 'send_to', 'their_email'],
  subject: ['email_subject', 'subject', 'subject_line'],
  body: ['email_body', 'email_message', 'email_content', 'body', 'message_body'],
  channel: ['slack_channel', 'channel', 'channel_name'],
  message: ['message', 'slack_message', 'discord_message', 'message_text', 'notification_message', 'content'],
  spreadsheet_id: ['spreadsheet_id', 'spreadsheet', 'spreadsheet_name', 'spreadsheet_url', 'spreadsheet_link', 'sheet_url'],
  sheet_name: ['sheet_name', 'sheet_tab', 'tab_name', 'worksheet_name'],
  database_id: ['database_id', 'database', 'database_name', 'notion_database'],
  webhook_url: ['webhook_url', 'discord_webhook', 'discord_webhook_url'],
  url: ['url', 'link', 'website_url', 'endpoint_url'],
  form_id: ['form_id', 'form', 'form_link', 'form_url'],
  title: ['title', 'page_title', 'card_title'],
  time: ['time', 'send_time', 'schedule_time'],
  values: ['values', 'row_values', 'columns_to_save'],
  duration: ['duration', 'delay_seconds', 'wait_time'],
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Google Sheets answers are often pasted as full URLs — pull out the real ID. */
function extractSpreadsheetId(value: string): string {
  const m = value.match(/\/d\/([a-zA-Z0-9-_]+)/)
  return m ? m[1] : value
}

/** Find the best preflight answer for one empty setting key, or undefined. */
function matchAnswer(settingKey: string, answers: Record<string, string>): string | undefined {
  const key = settingKey.toLowerCase()
  const entries = Object.entries(answers).filter(([, v]) => v?.trim())

  // 1) Exact key match
  for (const [k, v] of entries) if (k.toLowerCase() === key) return v
  // 2) Synonym match
  const synonyms = SETTING_SYNONYMS[key] ?? []
  for (const [k, v] of entries) if (synonyms.includes(k.toLowerCase())) return v
  // 3) Substring match (both directions, min length 3 to avoid noise)
  if (key.length >= 3) {
    for (const [k, v] of entries) {
      const ak = k.toLowerCase()
      if (ak.includes(key) || (ak.length >= 3 && key.includes(ak))) return v
    }
  }
  // 4) Semantic fallback: any email-shaped answer can fill a recipient field
  if (key === 'to' || key.endsWith('email')) {
    for (const [, v] of entries) if (EMAIL_RE.test(v.trim())) return v.trim()
  }
  return undefined
}

/**
 * Fill empty node config fields from the user's preflight answers.
 * e.g. an email answer fills the "to" field of email-send nodes, a Slack
 * channel answer fills "channel". Returns the workflow with settings filled
 * and satisfied keys removed from each node's config_fields.
 */
export function fillSmartDefaults(
  workflow: WorkflowJSON,
  userAnswers: Record<string, string>
): WorkflowJSON {
  if (!userAnswers || Object.keys(userAnswers).length === 0) return workflow

  function fillNode<T extends { settings: Record<string, unknown>; config_fields: string[] }>(node: T): T {
    const settings = { ...node.settings }
    for (const [key, current] of Object.entries(settings)) {
      const isEmpty = current === '' || current === null || current === undefined
      if (!isEmpty) continue // never overwrite values the AI pre-filled
      const answer = matchAnswer(key, userAnswers)
      if (answer === undefined) continue
      settings[key] = key === 'spreadsheet_id' ? extractSpreadsheetId(answer) : answer
    }
    const config_fields = (node.config_fields ?? []).filter(k => {
      const v = settings[k]
      return v === '' || v === null || v === undefined
    })
    return { ...node, settings, config_fields }
  }

  return {
    ...workflow,
    trigger: fillNode(workflow.trigger),
    actions: workflow.actions.map(fillNode),
  }
}

export const GENERATE_SITE_SYSTEM = `You are a web developer that generates complete, self-contained HTML/CSS/JS websites.

Given an automation workflow, generate a complete single-file HTML website that allows users to interact with or learn about the automation.

Rules:
- Return ONLY the HTML file contents, no explanation
- Use Tailwind CSS via CDN
- Include realistic form fields, good UX copy, and a submit handler (can be a demo/toast)
- Make it look professional and modern
- Style should match: dark background #0a0a0f, accent color #7c6fff
- Include a header, hero section, the main form/tool, and a footer
- The page should be immediately usable without a server for demo purposes`
