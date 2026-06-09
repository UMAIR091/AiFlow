'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { AlertTriangle, X, Plug } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getAppIcon } from '@/lib/utils'

interface ConnectionCheckModalProps {
  /** Display names of the apps that need a connection. */
  missing: string[]
  /** Close the dialog without running. */
  onClose: () => void
  /** Run the automation anyway, in simulation mode. */
  onRunAnyway: () => void
}

export function ConnectionCheckModal({ missing, onClose, onRunAnyway }: ConnectionCheckModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-surface border border-border rounded-2xl p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/10 border border-warning/30 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Connect a few apps first</h2>
              <p className="text-sm text-muted">This automation needs access to run for real.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white transition-colors" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <ul className="space-y-2 mb-6">
          {missing.map(app => (
            <li
              key={app}
              className="flex items-center justify-between bg-surface-2 border border-border rounded-lg px-3 py-2.5"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-white">
                <span className="text-lg">{getAppIcon(app)}</span>
                {app}
              </span>
              <Link href="/connect">
                <Button size="sm" variant="secondary">
                  <Plug className="w-4 h-4" />
                  Connect Now
                </Button>
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onRunAnyway}>
            Run Anyway (Simulated)
          </Button>
          <Link href="/connect" className="flex-1">
            <Button className="w-full">Go to Connections</Button>
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
