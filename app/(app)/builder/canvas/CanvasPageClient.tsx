'use client'
import { useState } from 'react'
import { Monitor } from 'lucide-react'
import { AutoFlowCanvas } from '@/components/canvas/AutoFlowCanvas'
import { createClient } from '@/lib/supabase/client'
import type { Automation, WorkflowJSON } from '@/types/automation'

interface Props { automation: Automation }

export function CanvasPageClient({ automation: initial }: Props) {
  const supabase = createClient()
  const [automation, setAutomation] = useState(initial)

  /**
   * Persist the edited workflow to Supabase.
   * Returns true on success so the toolbar can show accurate save feedback.
   */
  async function handleSave(workflow: WorkflowJSON): Promise<boolean> {
    const { data, error } = await supabase
      .from('automations')
      .update({
        workflow_json: workflow,
        name: workflow.suggested_name || automation.name,
        description: workflow.plain_summary ?? automation.description,
      })
      .eq('id', automation.id)
      .select()
      .single()

    if (error || !data) {
      console.error('Failed to save canvas changes:', error)
      return false
    }

    setAutomation(data)
    return true
  }

  return (
    <>
      {/* The canvas needs room to breathe — on phones, point people to desktop instead. */}
      <div className="md:hidden flex flex-col items-center justify-center h-[calc(100vh-64px)] px-8 text-center">
        <div className="w-14 h-14 bg-surface border border-border rounded-2xl flex items-center justify-center mb-5">
          <Monitor className="w-7 h-7 text-accent" />
        </div>
        <h2 className="text-lg font-bold text-white mb-2">Desktop recommended</h2>
        <p className="text-sm text-muted max-w-xs">
          The canvas builder works best on desktop. Please open AutoFlow on a larger screen.
        </p>
      </div>

      <div className="hidden md:block h-[calc(100vh-64px)] w-full">
        <AutoFlowCanvas
          workflow={automation.workflow_json}
          automation={automation}
          onSave={handleSave}
        />
      </div>
    </>
  )
}
