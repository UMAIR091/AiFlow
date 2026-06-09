import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Generic webhook receiver. Any automation with a Webhook trigger
 * whose settings.path matches this URL segment will be fired automatically.
 *
 * Example: a workflow with trigger.settings.path = "/google-form-submission"
 * is triggered by a POST to /api/webhook/google-form-submission
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { path: string } }
) {
  const triggerPath = `/${params.path}`

  // Use the service role key so we can query across all users' automations.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Parse incoming payload (be lenient — could be JSON, form data, or empty)
  let payload: Record<string, unknown> = {}
  try {
    const contentType = req.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      payload = await req.json()
    } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      formData.forEach((value, key) => {
        payload[key] = value
      })
    }
  } catch {
    // Payload parsing failed — proceed with empty payload
  }

  // Find active automations whose webhook path matches
  const { data: automations, error } = await supabase
    .from('automations')
    .select('id, user_id, workflow_json')
    .eq('status', 'active')

  if (error || !automations?.length) {
    return NextResponse.json({ received: true, triggered: 0 })
  }

  // Filter to automations whose trigger path matches
  const matching = automations.filter(a => {
    try {
      const wf = a.workflow_json as { trigger?: { app?: string; settings?: { path?: string } } }
      const triggerApp = wf?.trigger?.app?.toLowerCase() ?? ''
      const settingsPath = wf?.trigger?.settings?.path ?? ''
      return (
        (triggerApp === 'webhook' || triggerApp === 'google forms') &&
        settingsPath === triggerPath
      )
    } catch {
      return false
    }
  })

  if (!matching.length) {
    return NextResponse.json({ received: true, triggered: 0, message: `No active automation found for path ${triggerPath}` })
  }

  // Fire each matching automation in the background
  const triggered: string[] = []
  for (const automation of matching) {
    try {
      // Merge incoming payload into each action's settings as {{trigger_data}}
      const workflow = automation.workflow_json as Record<string, unknown>
      const enrichedWorkflow = injectPayload(workflow, payload)

      // Call run-automation — use absolute URL for internal fetch
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${req.headers.get('host')}`
      fetch(`${baseUrl}/api/run-automation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          automation_id: automation.id,
          workflow: enrichedWorkflow,
          simulated: false,
          // Pass user auth via service-key workaround — run-automation needs user_id
          _webhook_user_id: automation.user_id,
        }),
      }).catch(err => console.error('webhook trigger run error:', err))

      triggered.push(automation.id)
    } catch (err) {
      console.error('webhook trigger error for automation', automation.id, err)
    }
  }

  return NextResponse.json({
    received: true,
    triggered: triggered.length,
    automation_ids: triggered,
  })
}

// Also accept GET (for testing/verification)
export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string } }
) {
  return NextResponse.json({
    ok: true,
    message: `Webhook endpoint /${params.path} is active. Send a POST request to trigger automations.`,
  })
}

/**
 * Replace empty string values in action settings with data from the webhook payload.
 * This lets Google Form field values flow into email bodies, sheet rows, etc.
 */
function injectPayload(
  workflow: Record<string, unknown>,
  payload: Record<string, unknown>
): Record<string, unknown> {
  if (!Object.keys(payload).length) return workflow

  try {
    // Deep clone via JSON
    const clone = JSON.parse(JSON.stringify(workflow)) as {
      actions?: Array<{ settings?: Record<string, unknown> }>
    }

    const payloadSummary = Object.entries(payload)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')

    for (const action of clone.actions ?? []) {
      if (!action.settings) continue
      for (const [key, val] of Object.entries(action.settings)) {
        // If a setting is empty or contains a placeholder, inject payload data
        if (val === '' || val === null) {
          if (key === 'body' || key === 'message' || key === 'content' || key === 'notes') {
            action.settings[key] = `Form submission received:\n${payloadSummary}`
          } else if (key === 'values') {
            action.settings[key] = Object.values(payload).join(', ')
          } else if (payload[key] !== undefined) {
            action.settings[key] = payload[key]
          }
        }
      }
    }

    return clone as Record<string, unknown>
  } catch {
    return workflow
  }
}
