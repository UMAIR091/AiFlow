import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient as createClient } from '@/lib/supabase/route'
import type { WorkflowJSON } from '@/types/automation'

function isLocalUrl(url: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(url || '')
}

const LOCAL_N8N_WARNING =
  "⚠️ Your n8n URL points to localhost. A localhost address only works while n8n is running on this same computer — " +
  'it won\'t be reachable once AutoFlow is deployed online. For a permanent setup, use n8n Cloud (n8n.io/cloud) or a public URL.'

function toN8nNode(id: string, type: string, name: string, position: [number, number], params: Record<string, unknown>) {
  return {
    id,
    name,
    type,
    typeVersion: 1,
    position,
    parameters: params,
  }
}

function workflowToN8n(workflow: WorkflowJSON) {
  const nodes = []
  const connections: Record<string, unknown> = {}

  // Trigger node
  const triggerApp = workflow.trigger.app.toLowerCase()
  let triggerType = 'n8n-nodes-base.webhook'
  if (triggerApp === 'schedule') triggerType = 'n8n-nodes-base.scheduleTrigger'
  if (triggerApp === 'gmail') triggerType = 'n8n-nodes-base.gmailTrigger'

  nodes.push(toN8nNode('trigger', triggerType, workflow.trigger.event, [0, 100], workflow.trigger.settings))

  // Action nodes
  let prev = 'trigger'
  for (const action of workflow.actions) {
    const app = action.app.toLowerCase()
    let nodeType = 'n8n-nodes-base.httpRequest'
    if (app === 'gmail') nodeType = 'n8n-nodes-base.gmail'
    if (app === 'slack') nodeType = 'n8n-nodes-base.slack'
    if (app === 'notion') nodeType = 'n8n-nodes-base.notion'
    if (app === 'google sheets') nodeType = 'n8n-nodes-base.googleSheets'

    nodes.push(toN8nNode(
      action.id,
      nodeType,
      `${action.app}: ${action.action}`,
      [action.position.x, action.position.y],
      action.settings
    ))

    connections[prev] = { main: [[{ node: action.id, type: 'main', index: 0 }]] }
    prev = action.id
  }

  return { name: 'AutoFlow Import', nodes, connections, active: false }
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { workflow } = await req.json() as { workflow: WorkflowJSON }
  const n8nWorkflow = workflowToN8n(workflow)

  // Read the user's stored n8n connection (base_url in metadata, api_key in column).
  const { data: conn } = await supabase
    .from('connections')
    .select('api_key, metadata')
    .eq('user_id', user.id)
    .eq('platform', 'n8n')
    .maybeSingle()

  if (!conn) {
    return NextResponse.json(
      { error: "You haven't connected n8n yet. Go to Connect Accounts first." },
      { status: 400 }
    )
  }

  const baseUrl = ((conn.metadata as Record<string, unknown> | null)?.base_url as string || '').replace(/\/+$/, '')
  const apiKey = conn.api_key as string | null

  if (!baseUrl) {
    return NextResponse.json(
      { error: 'n8n URL is missing. Update your n8n connection with the correct URL.' },
      { status: 400 }
    )
  }

  const local = isLocalUrl(baseUrl)

  // Deploy with a 5s timeout so a wrong/unreachable URL doesn't hang the request.
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  let res: Response
  try {
    res = await fetch(`${baseUrl}/api/v1/workflows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': apiKey || '',
      },
      body: JSON.stringify(n8nWorkflow),
      signal: controller.signal,
    })
  } catch (err) {
    console.error('deploy-n8n network error:', err)
    return NextResponse.json(
      {
        error: 'Could not reach your n8n instance. Make sure n8n is running and the URL is correct.',
        ...(local ? { warning: LOCAL_N8N_WARNING } : {}),
      },
      { status: 502 }
    )
  } finally {
    clearTimeout(timeout)
  }

  if (res.status === 401 || res.status === 403) {
    return NextResponse.json(
      { error: 'n8n API key is invalid. Check your n8n connection settings.' },
      { status: 401 }
    )
  }

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: `n8n returned an error: ${err.slice(0, 200)}` }, { status: 400 })
  }

  const data = await res.json()
  return NextResponse.json({
    success: true,
    workflow_id: data.id,
    workflow_url: `${baseUrl}/workflow/${data.id}`,
  })
}
