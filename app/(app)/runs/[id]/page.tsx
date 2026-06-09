import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { RunsClient } from './RunsClient'
import type { AutomationRun, Automation } from '@/types/automation'

export default async function RunsPage({ params }: { params: { id: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  // Fetch the automation (ownership verified via RLS)
  const { data: automation, error: autoError } = await supabase
    .from('automations')
    .select('*')
    .eq('id', params.id)
    .single()

  if (autoError || !automation) redirect('/dashboard')

  // Fetch the 50 most recent runs, newest first
  const { data: runs } = await supabase
    .from('runs')
    .select('*')
    .eq('automation_id', params.id)
    .order('started_at', { ascending: false })
    .limit(50)

  return (
    <RunsClient
      automation={automation as Automation}
      runs={(runs ?? []) as AutomationRun[]}
    />
  )
}
