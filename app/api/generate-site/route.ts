import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient as createClient } from '@/lib/supabase/route'
import { anthropic, GENERATE_SITE_SYSTEM } from '@/lib/claude'
import type { WorkflowJSON, SiteStyle } from '@/types/automation'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { automation_id, workflow, style } = await req.json() as {
    automation_id: string
    workflow: WorkflowJSON
    style: SiteStyle
  }

  const styleDesc = {
    'form-tool': 'a clean single-page form tool where users submit data and get results',
    'landing-page': 'a marketing landing page explaining and showcasing this automation',
    'full-web-app': 'a full web application dashboard with multiple sections and interactive elements',
  }[style]

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: GENERATE_SITE_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Generate ${styleDesc} for this automation:

Name: ${workflow.suggested_name}
Summary: ${workflow.plain_summary}
Trigger: ${workflow.trigger.app} — ${workflow.trigger.event}
Actions: ${workflow.actions.map(a => `${a.app}: ${a.action}`).join(', ')}

Style: ${style}`,
        },
      ],
    })

    const siteCode = message.content[0].type === 'text' ? message.content[0].text : ''

    // Save to database
    const { data: site } = await supabase.from('generated_sites').insert({
      user_id: user.id,
      automation_id,
      site_code: siteCode,
      deploy_url: null,
    }).select().single()

    return NextResponse.json({ site_id: site?.id, site_code: siteCode })
  } catch (err) {
    console.error('generate-site error:', err)
    return NextResponse.json({ error: 'Could not generate website. Please try again.' }, { status: 500 })
  }
}
