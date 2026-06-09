import { createClient } from '@/lib/supabase/server'
import { GenerateSiteClient } from './GenerateSiteClient'

interface Props {
  searchParams: { automation_id?: string }
}

export default async function GenerateSitePage({ searchParams }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: automations } = await supabase
    .from('automations')
    .select('id, name, workflow_json, description')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <GenerateSiteClient
      automations={automations ?? []}
      selectedId={searchParams.automation_id}
    />
  )
}
