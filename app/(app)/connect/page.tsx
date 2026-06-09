import { createClient } from '@/lib/supabase/server'
import { ConnectClient } from './ConnectClient'

export default async function ConnectPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: connections } = await supabase
    .from('connections')
    .select('*')
    .eq('user_id', user!.id)

  const connMap: Record<string, boolean> = {}
  for (const c of connections ?? []) connMap[c.platform] = true

  return <ConnectClient connections={connMap} />
}
