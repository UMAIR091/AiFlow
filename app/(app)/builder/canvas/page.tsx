import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CanvasPageClient } from './CanvasPageClient'

interface Props {
  searchParams: { id?: string }
}

export default async function CanvasPage({ searchParams }: Props) {
  if (!searchParams.id) redirect('/builder')

  const supabase = createClient()
  const { data: automation } = await supabase
    .from('automations')
    .select('*')
    .eq('id', searchParams.id)
    .single()

  if (!automation) notFound()

  return <CanvasPageClient automation={automation} />
}
