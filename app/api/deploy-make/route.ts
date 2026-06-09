import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient as createClient } from '@/lib/supabase/route'
import type { WorkflowJSON } from '@/types/automation'

function workflowToMake(workflow: WorkflowJSON) {
  const modules = []
  let order = 1

  modules.push({
    id: order++,
    module: `${workflow.trigger.app.toLowerCase()}:TriggerWatch`,
    version: 1,
    parameters: workflow.trigger.settings,
    mapper: {},
    metadata: { designer: { x: 0, y: 0 } },
  })

  for (const action of workflow.actions) {
    modules.push({
      id: order++,
      module: `${action.app.toLowerCase().replace(/\s+/g, '-')}:ActionCreate`,
      version: 1,
      parameters: action.settings,
      mapper: {},
      metadata: { designer: { x: action.position.x, y: action.position.y } },
    })
  }

  return {
    name: workflow.suggested_name || 'AutoFlow Import',
    flow: modules,
    metadata: { instant: false, version: 1 },
  }
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { workflow } = await req.json() as { workflow: WorkflowJSON }

  // Read user's saved Make.com connection from Supabase
  const { data: conn } = await supabase
    .from('connections')
    .select('api_key, metadata')
    .eq('user_id', user.id)
    .eq('platform', 'make')
    .maybeSingle()

  if (!conn) {
    return NextResponse.json(
      { error: "You haven't connected Make.com yet. Go to Connect Accounts first." },
      { status: 400 }
    )
  }

  const apiKey = conn.api_key as string | null
  const teamId = (conn.metadata as Record<string, unknown> | null)?.team_id as string | null

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Make.com API key is missing. Update your Make.com connection.' },
      { status: 400 }
    )
  }

  if (!teamId) {
    return NextResponse.json(
      { error: 'Make.com Team ID is missing. Update your Make.com connection.' },
      { status: 400 }
    )
  }

  const makeScenario = workflowToMake(workflow)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  let res: Response
  try {
    res = await fetch(`https://eu1.make.com/api/v2/scenarios?teamId=${teamId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${apiKey}`,
      },
      body: JSON.stringify({ blueprint: JSON.stringify(makeScenario) }),
      signal: controller.signal,
    })
  } catch (err) {
    console.error('deploy-make network error:', err)
    return NextResponse.json(
      { error: 'Could not reach Make.com. Check your internet connection and try again.' },
      { status: 502 }
    )
  } finally {
    clearTimeout(timeout)
  }

  if (res.status === 401 || res.status === 403) {
    return NextResponse.json(
      { error: 'Make.com API key is invalid. Check your Make.com connection settings.' },
      { status: 401 }
    )
  }

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json(
      { error: `Make.com returned an error: ${err.slice(0, 200)}` },
      { status: 400 }
    )
  }

  const data = await res.json()
  return NextResponse.json({
    success: true,
    scenario_id: data.scenario?.id,
    scenario_url: data.scenario?.id
      ? `https://www.make.com/en/scenarios/${data.scenario.id}/edit`
      : null,
  })
}
