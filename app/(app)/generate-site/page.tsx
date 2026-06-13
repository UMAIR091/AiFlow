import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GenerateSiteClient } from './GenerateSiteClient'

interface Props {
  searchParams: { automation_id?: string }
}

export default async function GenerateSitePage({ searchParams }: Props) {
  const supabase = createClient()

  // Layout + middleware already validated via getUser(); read the id locally.
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) redirect('/auth')

  const { data: automations } = await supabase
    .from('automations')
    .select('id, name, workflow_json, description')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <GenerateSiteClient
      automations={automations ?? []}
      selectedId={searchParams.automation_id}
    />
  )
}
