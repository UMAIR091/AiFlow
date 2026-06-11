import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: automations } = await supabase
    .from('automations')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const { data: runs } = await supabase
    .from('runs')
    .select('id, automation_id, status, started_at')
    .in('automation_id', automations?.map(a => a.id) ?? [])
    .gte('started_at', new Date(Date.now() - 86400000).toISOString())

  const stats = {
    total: automations?.length ?? 0,
    active: automations?.filter(a => a.status === 'active').length ?? 0,
    runsToday: runs?.length ?? 0,
  }

  // Free users (no active paid subscription) see an upgrade banner.
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, plan')
    .eq('user_id', user.id)
    .maybeSingle()

  const hasActiveSubscription = subscription?.status === 'active' && subscription?.plan !== 'free'

  return (
    <DashboardClient
      automations={automations ?? []}
      stats={stats}
      hasActiveSubscription={hasActiveSubscription}
    />
  )
}
