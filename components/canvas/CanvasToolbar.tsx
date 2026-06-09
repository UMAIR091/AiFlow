'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Save, Play, Globe, ExternalLink, Loader2, CheckCircle, XCircle, Plus, GitBranch } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { checkRequiredConnections } from '@/lib/connections'
import { ConnectionCheckModal } from '@/components/ui/ConnectionCheckModal'
import type { WorkflowJSON, Automation } from '@/types/automation'

interface CanvasToolbarProps {
  automation: Automation
  workflow: WorkflowJSON
  onSave: () => Promise<boolean>
  onAddAction: () => void
  onAddCondition: () => void
}

type RunState = 'idle' | 'saving' | 'running' | 'success' | 'error'

export function CanvasToolbar({ automation, workflow, onSave, onAddAction, onAddCondition }: CanvasToolbarProps) {
  const router = useRouter()
  const supabase = createClient()
  const [state, setState] = useState<RunState>('idle')
  const [message, setMessage] = useState('')
  const [deployUrl, setDeployUrl] = useState('')
  const [missingApps, setMissingApps] = useState<string[]>([])
  const [showConnectionModal, setShowConnectionModal] = useState(false)

  async function handleSave() {
    setState('saving')
    setMessage('')
    try {
      const ok = await onSave()
      if (ok) { setState('success'); setMessage('All changes saved') }
      else { setState('error'); setMessage('Could not save changes. Please try again.') }
    } catch {
      setState('error'); setMessage('Could not save changes. Please try again.')
    }
    setTimeout(() => setState('idle'), 3000)
  }

  async function handleRun() {
    // Pre-run connection check: block if any required app isn't connected.
    const { data: { user } } = await supabase.auth.getUser()
    const { data: conns } = await supabase
      .from('connections')
      .select('platform')
      .eq('user_id', user?.id ?? '')
    const userPlatforms = (conns ?? []).map(c => c.platform as string)
    const missing = checkRequiredConnections(workflow, userPlatforms)
    if (missing.length > 0) {
      setMissingApps(missing)
      setShowConnectionModal(true)
      return
    }
    await doRun(false)
  }

  async function doRun(simulated: boolean) {
    setState('running')
    setMessage('')
    setDeployUrl('')
    try {
      const res = await fetch('/api/run-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ automation_id: automation.id, workflow, simulated }),
      })
      const data = await res.json()
      if (data.error) { setState('error'); setMessage(data.error) }
      else { setState('success'); setMessage(`Ran ${data.log?.length ?? 0} steps${simulated ? ' (simulated)' : ''} successfully`) }
    } catch {
      setState('error')
      setMessage('Could not run automation. Check your connection.')
    }
    setTimeout(() => setState('idle'), 4000)
  }

  async function handleDeployN8n() {
    setState('running')
    setMessage('')
    setDeployUrl('')
    try {
      const res = await fetch('/api/deploy-n8n', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow }),
      })
      const data = await res.json()
      if (data.error) {
        setState('error')
        setMessage(data.warning ? `${data.error} ${data.warning}` : data.error)
      }
      else if (data.manual) { setState('success'); setMessage('Workflow JSON ready — paste into n8n manually') }
      else {
        setState('success')
        setMessage('Deployed to n8n!')
        if (data.workflow_url) setDeployUrl(data.workflow_url)
      }
    } catch {
      setState('error'); setMessage('Could not reach n8n')
    }
    setTimeout(() => setState('idle'), 8000)
  }

  async function handleDeployMake() {
    setState('running')
    try {
      const res = await fetch('/api/deploy-make', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow }),
      })
      const data = await res.json()
      if (data.error) { setState('error'); setMessage(data.error) }
      else { setState('success'); setMessage('Deployed to Make.com!') }
    } catch {
      setState('error'); setMessage('Could not reach Make.com')
    }
    setTimeout(() => setState('idle'), 4000)
  }

  const statusIcon = state === 'running' || state === 'saving' ? <Loader2 className="w-4 h-4 animate-spin text-accent" />
    : state === 'success' ? <CheckCircle className="w-4 h-4 text-success" />
    : state === 'error' ? <XCircle className="w-4 h-4 text-danger" />
    : null

  return (
    <div className="absolute top-0 left-0 right-0 h-14 bg-surface border-b border-border flex items-center px-4 gap-3 z-10">
      <div className="min-w-0 flex-shrink">
        <p className="text-sm font-semibold text-white truncate">{automation.name}</p>
        <p className="text-xs text-muted truncate max-w-[220px]">{workflow.plain_summary}</p>
      </div>

      {/* Add buttons */}
      <div className="flex items-center gap-2 pl-2 border-l border-border">
        <Button variant="secondary" size="sm" onClick={onAddAction}>
          <Plus className="w-4 h-4" />
          Add Step
        </Button>
        <Button variant="secondary" size="sm" onClick={onAddCondition}>
          <GitBranch className="w-4 h-4" />
          Add Condition
        </Button>
      </div>

      {/* Status */}
      {state !== 'idle' && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 text-sm ml-auto"
        >
          {statusIcon}
          {message && <span className={state === 'error' ? 'text-danger' : 'text-muted'}>{message}</span>}
          {(state === 'running' || state === 'saving') && !message && <span className="text-muted">Working…</span>}
          {deployUrl && (
            <a
              href={deployUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-accent hover:text-accent-light font-medium"
            >
              Open in n8n <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </motion.div>
      )}

      <div className={`flex items-center gap-2 ${state === 'idle' ? 'ml-auto' : ''}`}>
        <Button variant="ghost" size="sm" onClick={handleSave} loading={state === 'saving'}>
          <Save className="w-4 h-4" />
          Save
        </Button>
        <Button variant="secondary" size="sm" onClick={handleRun} loading={state === 'running'}>
          <Play className="w-4 h-4" />
          Run Now
        </Button>
        <Button variant="ghost" size="sm" onClick={handleDeployN8n}>
          <ExternalLink className="w-4 h-4" />
          → n8n
        </Button>
        <Button variant="ghost" size="sm" onClick={handleDeployMake}>
          <ExternalLink className="w-4 h-4" />
          → Make
        </Button>
        <Button
          size="sm"
          onClick={() => router.push(`/generate-site?automation_id=${automation.id}`)}
        >
          <Globe className="w-4 h-4" />
          Create Website
        </Button>
      </div>

      {showConnectionModal && (
        <ConnectionCheckModal
          missing={missingApps}
          onClose={() => setShowConnectionModal(false)}
          onRunAnyway={() => {
            setShowConnectionModal(false)
            void doRun(true)
          }}
        />
      )}
    </div>
  )
}
