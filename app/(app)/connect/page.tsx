import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ConnectClient } from './ConnectClient'

export default async function ConnectPage() {
  const supabase = createClient()

  // Layout + middleware already validated via getUser(); read the id locally.
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) redirect('/auth')

  const { data: connections } = await supabase
    .from('connections')
    .select('platform')
    .eq('user_id', user.id)

  const connMap: Record<string, boolean> = {}
  for (const c of connections ?? []) connMap[c.platform] = true

  return <ConnectClient connections={connMap} />
}
