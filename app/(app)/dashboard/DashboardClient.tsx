'use client'
import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Plus, Play, Pause, Edit, Trash2, Globe, Zap, Activity, Clock, CheckCircle, XCircle, Loader2, History } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { formatRelative } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { checkRequiredConnections } from '@/lib/connections'
import { ConnectionCheckModal } from '@/components/ui/ConnectionCheckModal'
import type { Automation } from '@/types/automation'

interface DashboardClientProps {
  automations: Automation[]
  stats: { total: number; active: number; runsToday: number }
  hasActiveSubscription?: boolean
}

export function DashboardClient({ automations: initial, stats, hasActiveSubscription = false }: DashboardClientProps) {
  const supabase = createClient()
  const [automations, setAutomations] = useState(initial)
  const [runningId, setRunningId] = useState<string | null>(null)
  const [runResult, setRunResult] = useState<{ id: string; success: boolean; message: string } | null>(null)
  const [pendingRun, setPendingRun] = useState<Automation | null>(null)
  const [missingApps, setMissingApps] = useState<string[]>([])

  async function handleDelete(id: string) {
    if (!confirm('Delete this automation? This cannot be undone.')) return
    await supabase.from('automations').delete().eq('id', id)
    setAutomations(prev => prev.filter(a => a.id !== id))
  }

  async function handleToggle(a: Automation) {
    const next = a.status === 'active' ? 'paused' : 'active'
    await supabase.from('automations').update({ status: next }).eq('id', a.id)
    setAutomations(prev => prev.map(x => x.id === a.id ? { ...x, status: next } : x))
  }

  async function handleRun(a: Automation) {
    // Pre-run connection check: block if any required app isn't connected.
    const { data: { user } } = await supabase.auth.getUser()
    const { data: conns } = await supabase
      .from('connections')
      .select('platform')
      .eq('user_id', user?.id ?? '')
    const userPlatforms = (conns ?? []).map(c => c.platform as string)
    const missing = checkRequiredConnections(a.workflow_json, userPlatforms)
    if (missing.length > 0) {
      setPendingRun(a)
      setMissingApps(missing)
      return
    }
    await doRun(a, false)
  }

  async function doRun(a: Automation, simulated: boolean) {
    setRunningId(a.id)
    setRunResult(null)
    try {
      const res = await fetch('/api/run-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ automation_id: a.id, workflow: a.workflow_json, simulated }),
      })
      const data = await res.json()
      const success = !data.error && data.status !== 'failed'
      setRunResult({
        id: a.id,
        success,
        message: data.error ?? (success
          ? `Ran ${data.log?.length ?? 0} steps successfully${simulated ? ' (simulated)' : ''}`
          : 'One or more steps failed — check your connections'),
      })
      setAutomations(prev => prev.map(x => x.id === a.id ? { ...x, last_run: new Date().toISOString() } : x))
      setTimeout(() => setRunResult(null), 5000)
    } finally {
      setRunningId(null)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Your Automations</h1>
          <p className="text-muted text-sm mt-1">Manage and monitor all your workflows</p>
        </div>
        <Link href="/builder">
          <Button>
            <Plus className="w-4 h-4" />
            New Automation
          </Button>
        </Link>
      </div>

      {/* Upgrade banner for free users */}
      {!hasActiveSubscription && (
        <div className="mb-6 flex items-center justify-between gap-3 flex-wrap bg-accent/10 border border-accent/20 rounded-xl px-4 py-3">
          <p className="text-sm text-muted">
            You&apos;re on the free plan — limited to 5 automations and 100 runs/month.
          </p>
          <Link
            href="/#pricing"
            className="text-sm font-semibold text-accent hover:text-accent-light transition-colors whitespace-nowrap"
          >
            Upgrade to Pro →
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total', value: stats.total, icon: Zap, color: 'text-accent' },
          { label: 'Active', value: stats.active, icon: Activity, color: 'text-success' },
          { label: 'Runs Today', value: stats.runsToday, icon: Clock, color: 'text-warning' },
        ].map(s => (
          <Card key={s.label} className="flex items-center gap-4">
            <div className={`p-3 rounded-lg bg-surface-2 ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-muted">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Automations */}
      {automations.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-24"
        >
          <div className="w-20 h-20 bg-surface rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Zap className="w-10 h-10 text-accent/50" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">No automations yet</h2>
          <p className="text-muted mb-6">Describe what you want automated and the AI will build it for you.</p>
          <Link href="/builder">
            <Button size="lg">
              <Plus className="w-5 h-5" />
              Build your first automation
            </Button>
          </Link>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {automations.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="flex items-center gap-4 flex-wrap sm:flex-nowrap group hover:border-accent/30 transition-all">
                {/* Icon */}
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
                  <Zap className="w-5 h-5" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-medium text-white truncate">{a.name}</p>
                    <Badge variant={a.status as 'active' | 'paused' | 'running' | 'error'}>{a.status}</Badge>
                  </div>
                  <p className="text-xs text-muted truncate">{a.description || a.workflow_json?.plain_summary}</p>
                </div>

                {/* Meta */}
                <div className="text-right flex-shrink-0 hidden sm:block">
                  <p className="text-xs text-muted capitalize">{a.platform}</p>
                  {a.last_run && <p className="text-xs text-muted">{formatRelative(a.last_run)}</p>}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={runningId === a.id}
                    onClick={() => handleRun(a)}
                    title="Run now"
                  >
                    {runningId === a.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Play className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggle(a)}
                    title={a.status === 'active' ? 'Pause' : 'Activate'}
                  >
                    <Pause className="w-4 h-4" />
                  </Button>
                  <Link href={`/builder/canvas?id=${a.id}`}>
                    <Button variant="ghost" size="sm" title="Edit">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link href={`/runs/${a.id}`}>
                    <Button variant="ghost" size="sm" title="Run history">
                      <History className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link href={`/generate-site?automation_id=${a.id}`}>
                    <Button variant="ghost" size="sm" title="Create website">
                      <Globe className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(a.id)}
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Run result toast */}
      {runResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl border shadow-xl text-sm font-medium ${
            runResult.success
              ? 'bg-success/10 border-success/30 text-success'
              : 'bg-danger/10 border-danger/30 text-danger'
          }`}
        >
          {runResult.success
            ? <CheckCircle className="w-5 h-5 flex-shrink-0" />
            : <XCircle className="w-5 h-5 flex-shrink-0" />}
          {runResult.message}
        </motion.div>
      )}

      {pendingRun && (
        <ConnectionCheckModal
          missing={missingApps}
          onClose={() => setPendingRun(null)}
          onRunAnyway={() => {
            const a = pendingRun
            setPendingRun(null)
            void doRun(a, true)
          }}
        />
      )}
    </div>
  )
}
