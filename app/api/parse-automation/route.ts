import { NextRequest, NextResponse } from 'next/server'
import { anthropic, PARSE_AUTOMATION_SYSTEM, fillSmartDefaults } from '@/lib/claude'
import { normalizeWorkflow, lintWorkflow } from '@/lib/workflow-validator'
import type { WorkflowJSON } from '@/types/automation'

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

const SYSTEM = [
  {
    type: 'text' as const,
    text: PARSE_AUTOMATION_SYSTEM,
    // System prompt is large and static → cache it to cut latency/cost.
    cache_control: { type: 'ephemeral' as const },
  },
]

/** One Claude call → parsed object. Throws SyntaxError if the output isn't valid JSON. */
async function callClaude(description: string, langNote: string, strictNote = ''): Promise<unknown> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096, // headroom: a truncated workflow is invalid JSON
    temperature: 0, // deterministic structured output
    system: SYSTEM,
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

/**
 * Self-repair pass: show the model its own (normalized) output plus the exact
 * problems the linter found, and ask for a corrected version.
 */
async function callClaudeRepair(
  description: string,
  langNote: string,
  previous: WorkflowJSON,
  issues: string[]
): Promise<unknown> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    temperature: 0,
    system: SYSTEM,
    messages: [
      { role: 'user', content: `${langNote}\n\nAutomation description: ${description}` },
      { role: 'assistant', content: JSON.stringify(previous) },
      {
        role: 'user',
        content:
          `Your workflow has problems. An automated checker compared it against the user's description and found:\n\n` +
          issues.map(i => `- ${i}`).join('\n') +
          `\n\nFix every problem and return the COMPLETE corrected workflow as ONLY a single valid JSON object — same shape as before, no prose, no code fences. Keep everything that was already correct.`,
      },
    ],
  })
  const text = message.content[0]?.type === 'text' ? message.content[0].text : ''
  return extractJson(text)
}

export async function POST(req: NextRequest) {
  let body: { description?: string; language?: string; answers?: Record<string, string> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request. Please try again.' }, { status: 400 })
  }

  const { description, language = 'en', answers = {} } = body

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

  // ── Pass 1: generate (with one JSON-format retry) ──────────────────────────
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

  // ── Pass 2: normalize deterministically, then lint against the description ──
  let workflow = normalizeWorkflow(raw, description)
  let issues = lintWorkflow(workflow, description)
  let repaired = false

  // ── Pass 3: self-repair when the linter caught real gaps ───────────────────
  if (issues.length > 0) {
    try {
      const fixedRaw = await callClaudeRepair(description, langNote, workflow, issues)
      const fixed = normalizeWorkflow(fixedRaw, description)
      const fixedIssues = lintWorkflow(fixed, description)
      // Only adopt the repair if it didn't make things worse.
      if (fixedIssues.length < issues.length || (fixedIssues.length === issues.length && fixed.actions.length >= workflow.actions.length)) {
        workflow = fixed
        issues = fixedIssues
        repaired = true
      }
    } catch (err) {
      console.error('parse-automation repair pass failed (keeping original):', err)
    }
  }

  // ── Pass 4: fill empty settings from the user's preflight answers ──────────
  workflow = fillSmartDefaults(workflow, answers)

  return NextResponse.json({
    workflow,
    quality: { repaired, remaining_issues: issues },
  })
}
