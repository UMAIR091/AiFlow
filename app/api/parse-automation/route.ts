import { NextRequest, NextResponse } from 'next/server'
import { anthropic, PARSE_AUTOMATION_SYSTEM } from '@/lib/claude'
import type { WorkflowJSON, AutomationAction } from '@/types/automation'

/** Pull the first valid JSON object out of the model's text, tolerating fences/prose. */
function extractJson(text: string): unknown {
  // Strip markdown fences first.
  let cleaned = text.replace(/```(?:json)?/gi, '').trim()
  // If there's surrounding prose, grab the outermost { ... }.
  const first = cleaned.indexOf('{')
  const last = cleaned.lastIndexOf('}')
  if (first !== -1 && last !== -1 && last > first) {
    cleaned = cleaned.slice(first, last + 1)
  }
  return JSON.parse(cleaned)
}

/** One Claude call → parsed object. Throws SyntaxError if the output isn't valid JSON. */
async function callClaude(description: string, langNote: string, strictNote = ''): Promise<unknown> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    // System prompt is large and static → cache it to cut latency/cost on repeat calls.
    system: [
      {
        type: 'text',
        text: PARSE_AUTOMATION_SYSTEM,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `${langNote}${strictNote}\n\nAutomation description: ${description}`,
      },
    ],
  })
  const text = message.content[0]?.type === 'text' ? message.content[0].text : ''
  return extractJson(text)
}

/** Coerce whatever the model returned into a valid, complete WorkflowJSON. */
function normalizeWorkflow(raw: unknown, description: string): WorkflowJSON {
  const w = (raw ?? {}) as Record<string, unknown>

  // --- Trigger ---
  const rawTrigger = (w.trigger ?? {}) as Record<string, unknown>
  const trigger = {
    app: String(rawTrigger.app || 'Schedule'),
    event: String(rawTrigger.event || 'On Schedule'),
    description: String(rawTrigger.description || 'Starts this automation'),
    settings: (rawTrigger.settings && typeof rawTrigger.settings === 'object'
      ? rawTrigger.settings
      : {}) as Record<string, unknown>,
    config_fields: Array.isArray(rawTrigger.config_fields)
      ? rawTrigger.config_fields.map(String)
      : [],
  }

  // --- Actions ---
  let rawActions = Array.isArray(w.actions) ? w.actions : []

  // HARD RULE: never allow an empty actions array — synthesize a sensible default.
  if (rawActions.length === 0) {
    rawActions = [
      {
        app: 'Slack',
        action: 'Post Message',
        description: `Notify about: ${description.slice(0, 80)}`,
        settings: { channel: '', message: '' },
        config_fields: ['channel', 'message'],
      },
    ]
  }

  const actions: AutomationAction[] = rawActions.map((a, i) => {
    const action = (a ?? {}) as Record<string, unknown>
    return {
      id: String(action.id || `action_${i + 1}`),
      app: String(action.app || 'HTTP Request'),
      action: String(action.action || 'Call URL'),
      description: String(action.description || ''),
      settings: (action.settings && typeof action.settings === 'object'
        ? action.settings
        : {}) as Record<string, unknown>,
      config_fields: Array.isArray(action.config_fields)
        ? action.config_fields.map(String)
        : [],
      position:
        action.position && typeof action.position === 'object'
          ? (action.position as { x: number; y: number })
          : { x: 350 + i * 270, y: 200 },
    }
  })

  // --- Conditions (passthrough, best-effort) ---
  const conditions = Array.isArray(w.conditions)
    ? (w.conditions as WorkflowJSON['conditions'])
    : []

  return {
    trigger,
    actions,
    conditions,
    plain_summary: String(w.plain_summary || 'This automation runs the steps you described.'),
    suggested_name: String(w.suggested_name || 'New Automation'),
  }
}

export async function POST(req: NextRequest) {
  let body: { description?: string; language?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request. Please try again.' }, { status: 400 })
  }

  const { description, language = 'en' } = body

  if (!description?.trim()) {
    return NextResponse.json(
      { error: 'Please describe what you want to automate first.' },
      { status: 400 }
    )
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'The AI service is not configured yet. Add your Anthropic API key to continue.' },
      { status: 500 }
    )
  }

  const langNote =
    language !== 'en'
      ? `The user wrote in ${language}. Understand their intent but always return JSON in English. `
      : ''

  // Attempt 1, then one retry with a stronger "JSON only" nudge if parsing fails.
  let raw: unknown
  try {
    raw = await callClaude(description, langNote)
  } catch (err) {
    if (err instanceof SyntaxError) {
      try {
        raw = await callClaude(
          description,
          langNote,
          'IMPORTANT: Your previous attempt was not valid JSON. Return ONLY a single valid JSON object — no prose, no code fences. '
        )
      } catch (retryErr) {
        if (retryErr instanceof SyntaxError) {
          return NextResponse.json(
            {
              error:
                'The AI had trouble structuring your automation. Try rephrasing it more simply — for example, "When X happens, do Y".',
            },
            { status: 502 }
          )
        }
        console.error('parse-automation retry error:', retryErr)
        return NextResponse.json(
          { error: 'The AI service is temporarily unavailable. Please try again in a moment.' },
          { status: 502 }
        )
      }
    } else {
      // Non-parse error = upstream/network/auth issue with Anthropic.
      console.error('parse-automation error:', err)
      const msg =
        err instanceof Error && /api key|authentication|401/i.test(err.message)
          ? 'The AI service rejected the request. Check that your Anthropic API key is valid.'
          : 'The AI service is temporarily unavailable. Please try again in a moment.'
      return NextResponse.json({ error: msg }, { status: 502 })
    }
  }

  const workflow = normalizeWorkflow(raw, description)
  return NextResponse.json({ workflow })
}
