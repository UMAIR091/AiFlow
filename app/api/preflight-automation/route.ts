import { NextRequest, NextResponse } from 'next/server'
import { anthropic, PREFLIGHT_SYSTEM } from '@/lib/claude'

export interface PreflightField {
  key: string
  label: string
  hint: string
  required: boolean
  default: string
}

export interface PreflightConnection {
  app: string
  needs: string
}

export interface PreflightResult {
  apps: string[]
  /** Plain-English step descriptions, in execution order. */
  steps: string[]
  /** What credential/connection each app requires. */
  connections: PreflightConnection[]
  fields: PreflightField[]
  summary: string
}

function extractJson(text: string): unknown {
  let cleaned = text.replace(/```(?:json)?/gi, '').trim()
  const first = cleaned.indexOf('{')
  const last = cleaned.lastIndexOf('}')
  if (first !== -1 && last !== -1 && last > first) {
    cleaned = cleaned.slice(first, last + 1)
  }
  return JSON.parse(cleaned)
}

export async function POST(req: NextRequest) {
  let body: { description?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const { description } = body
  if (!description?.trim()) {
    return NextResponse.json({ error: 'No description provided.' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI service not configured.' }, { status: 500 })
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',   // Fast + cheap for pre-flight analysis
      max_tokens: 1536,
      temperature: 0,                        // deterministic structured output
      system: [{ type: 'text', text: PREFLIGHT_SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: `Automation description: ${description}` }],
    })

    const text = message.content[0]?.type === 'text' ? message.content[0].text : ''
    const raw = extractJson(text) as Record<string, unknown>

    const result: PreflightResult = {
      apps: Array.isArray(raw.apps) ? raw.apps.map(String) : [],
      steps: Array.isArray(raw.steps) ? raw.steps.map(String) : [],
      connections: Array.isArray(raw.connections)
        ? raw.connections.map((c: unknown) => {
            const conn = (c ?? {}) as Record<string, unknown>
            return { app: String(conn.app || ''), needs: String(conn.needs || '') }
          }).filter(c => c.app)
        : [],
      fields: Array.isArray(raw.fields)
        ? raw.fields.map((f: unknown) => {
            const field = (f ?? {}) as Record<string, unknown>
            return {
              key: String(field.key || 'field'),
              label: String(field.label || 'Value'),
              hint: String(field.hint || ''),
              required: field.required !== false,
              default: String(field.default ?? ''),
            }
          })
        : [],
      summary: String(raw.summary || 'Your automation is ready to build.'),
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('preflight-automation error:', err)
    return NextResponse.json(
      { error: 'Could not analyze your automation. Please try again.' },
      { status: 502 }
    )
  }
}
