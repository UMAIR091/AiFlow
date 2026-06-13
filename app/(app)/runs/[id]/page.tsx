import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RunsClient } from './RunsClient'
import type { AutomationRun, Automation } from '@/types/automation'

export default async function RunsPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  // Layout + middleware already validated via getUser(); read the id locally.
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) redirect('/auth')

  // Both queries key off params.id only (ownership enforced by RLS), so they
  // run in one parallel round-trip instead of two sequential ones.
  const [automationRes, runsRes] = await Promise.all([
    supabase.from('automations').select('*').eq('id', params.id).single(),
    supabase
      .from('runs')
      .select('*')
      .eq('automation_id', params.id)
      .order('started_at', { ascending: false })
      .limit(50),
  ])

  const automation = automationRes.data
  if (automationRes.error || !automation) redirect('/dashboard')

  return (
    <RunsClient
      automation={automation as Automation}
      runs={(runsRes.data ?? []) as AutomationRun[]}
    />
  )
}
