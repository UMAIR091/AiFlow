import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage() {
  const supabase = createClient()

  // The (app) layout + middleware already validated the user with getUser().
  // Read the id from the session cookie here (local, no network round-trip)
  // instead of a third getUser() call.
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) redirect('/auth')

  const since = new Date(Date.now() - 86400000).toISOString()

  // All three are independent: RLS scopes `runs` to the user's own automations,
  // so it doesn't need the automations result first. Run them in one parallel
  // round-trip instead of three sequential ones.
  const [automationsRes, runsRes, subscriptionRes] = await Promise.all([
    supabase
      .from('automations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('runs')
      .select('id, status, started_at')
      .gte('started_at', since),
    supabase
      .from('subscriptions')
      .select('status, plan')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  const automations = automationsRes.data ?? []
  const runs = runsRes.data ?? []
  const subscription = subscriptionRes.data

  const stats = {
    total: automations.length,
    active: automations.filter(a => a.status === 'active').length,
    runsToday: runs.length,
  }

  // Free users (no active paid subscription) see an upgrade banner.
  const hasActiveSubscription = subscription?.status === 'active' && subscription?.plan !== 'free'

  return (
    <DashboardClient
      automations={automations}
      stats={stats}
      hasActiveSubscription={hasActiveSubscription}
    />
  )
}
