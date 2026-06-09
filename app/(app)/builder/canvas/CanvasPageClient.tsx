'use client'
import { useState } from 'react'
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
    <div className="h-[calc(100vh-64px)] w-full">
      <AutoFlowCanvas
        workflow={automation.workflow_json}
        automation={automation}
        onSave={handleSave}
      />
    </div>
  )
}
