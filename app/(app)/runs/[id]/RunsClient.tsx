'use client'
import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp,
  Clock, Zap, AlertCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { formatDate, formatRelative, getAppIcon } from '@/lib/utils'
import type { AutomationRun, RunLogEntry, Automation } from '@/types/automation'

interface RunsClientProps {
  automation: Automation
  runs: AutomationRun[]
}

function statusIcon(status: AutomationRun['status']) {
  if (status === 'success') return <CheckCircle className="w-4 h-4 text-success" />
  if (status === 'failed') return <XCircle className="w-4 h-4 text-danger" />
  return <Loader2 className="w-4 h-4 text-accent animate-spin" />
}

function stepIcon(status: RunLogEntry['status']) {
  if (status === 'success') return <CheckCircle className="w-3.5 h-3.5 text-success flex-shrink-0" />
  if (status === 'failed') return <XCircle className="w-3.5 h-3.5 text-danger flex-shrink-0" />
  if (status === 'running') return <Loader2 className="w-3.5 h-3.5 text-accent animate-spin flex-shrink-0" />
  return <Clock className="w-3.5 h-3.5 text-muted flex-shrink-0" />
}

function duration(run: AutomationRun): string {
  if (!run.finished_at) return 'In progress…'
  const ms = new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function RunRow({ run }: { run: AutomationRun }) {
  const [open, setOpen] = useState(false)

  return (
    <Card className="overflow-hidden p-0">
      {/* Header row */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-surface-2 transition-colors"
      >
        {statusIcon(run.status)}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={run.status === 'success' ? 'active' : run.status === 'failed' ? 'error' : 'running'}>
              {run.status}
            </Badge>
            <span className="text-xs text-muted">{formatRelative(run.started_at)}</span>
            <span className="text-xs text-muted">·</span>
            <span className="text-xs text-muted">{duration(run)}</span>
          </div>
          <p className="text-xs text-muted mt-0.5">{formatDate(run.started_at)}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-muted">{run.log.length} steps</span>
          {open
            ? <ChevronUp className="w-4 h-4 text-muted" />
            : <ChevronDown className="w-4 h-4 text-muted" />}
        </div>
      </button>

      {/* Step log */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border divide-y divide-border/50">
              {run.log.length === 0 ? (
                <p className="px-5 py-3 text-xs text-muted italic">No steps recorded.</p>
              ) : (
                run.log.map((entry, i) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-3">
                    <div className="mt-0.5">{stepIcon(entry.status)}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${entry.status === 'failed' ? 'text-danger' : 'text-white'}`}>
                        {entry.message}
                      </p>
                      <p className="text-xs text-muted mt-0.5">{formatDate(entry.timestamp)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

export function RunsClient({ automation, runs }: RunsClientProps) {
  const successCount = runs.filter(r => r.status === 'success').length
  const failedCount = runs.filter(r => r.status === 'failed').length

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Back */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center text-xl flex-shrink-0">
          {getAppIcon(automation.workflow_json?.trigger?.app ?? 'autoflow')}
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">{automation.name}</h1>
          <p className="text-sm text-muted mt-0.5">Run History</p>
        </div>
      </div>

      {/* Stats */}
      {runs.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total Runs', value: runs.length, icon: Zap, color: 'text-accent' },
            { label: 'Successful', value: successCount, icon: CheckCircle, color: 'text-success' },
            { label: 'Failed', value: failedCount, icon: AlertCircle, color: 'text-danger' },
          ].map(s => (
            <Card key={s.label} className="flex items-center gap-3 py-3">
              <s.icon className={`w-4 h-4 flex-shrink-0 ${s.color}`} />
              <div>
                <p className="text-lg font-bold text-white leading-none">{s.value}</p>
                <p className="text-xs text-muted mt-0.5">{s.label}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Runs list */}
      {runs.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <div className="w-16 h-16 bg-surface rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-muted" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-1">No runs yet</h2>
          <p className="text-sm text-muted">
            Run this automation from the dashboard and the results will appear here.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 mt-4 text-sm text-accent hover:text-accent-light transition-colors"
          >
            Go to Dashboard
          </Link>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {runs.map((run, i) => (
            <motion.div
              key={run.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <RunRow run={run} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
