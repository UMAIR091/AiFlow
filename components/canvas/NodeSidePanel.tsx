'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Sliders } from 'lucide-react'
import { getAppIcon } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface NodeData {
  app?: string
  action?: string
  event?: string
  description?: string
  settings?: Record<string, string>
  config_fields?: string[]
  // condition-only
  field?: string
  operator?: string
  value?: string
}

interface NodeSidePanelProps {
  node: { id: string; type: string; data: NodeData } | null
  onClose: () => void
  onUpdate: (id: string, data: Record<string, unknown>) => void
}

function humanize(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

const SUB_LABEL: Record<string, string> = {
  trigger: 'Trigger',
  action: 'Action',
  condition: 'Condition',
}

export function NodeSidePanel({ node, onClose, onUpdate }: NodeSidePanelProps) {
  // Local draft so edits are only committed on "Save Changes".
  const [draft, setDraft] = useState<NodeData>({})
  const [saved, setSaved] = useState(false)

  // Reset the draft whenever a different node is selected.
  useEffect(() => {
    if (node) {
      setDraft({
        ...node.data,
        settings: { ...(node.data.settings ?? {}) },
        config_fields: node.data.config_fields ?? [],
      })
      setSaved(false)
    }
  }, [node?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!node) return null

  const isCondition = node.type === 'condition'
  const isTrigger = node.type === 'trigger'
  const app = draft.app ?? ''

  // The list of setting fields to show = config_fields plus any keys already present in settings.
  const settings = draft.settings ?? {}
  const fieldKeys = Array.from(
    new Set([...(draft.config_fields ?? []), ...Object.keys(settings)])
  )

  function setField(key: keyof NodeData, value: string) {
    setDraft(d => ({ ...d, [key]: value }))
    setSaved(false)
  }

  function setSetting(key: string, value: string) {
    setDraft(d => ({ ...d, settings: { ...(d.settings ?? {}), [key]: value } }))
    setSaved(false)
  }

  function handleSave() {
    onUpdate(node!.id, { ...draft })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 340, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 340, opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="absolute right-0 top-0 h-full w-[340px] bg-surface border-l border-border z-10 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl flex-shrink-0">{isCondition ? '🔀' : getAppIcon(app)}</span>
            <div className="min-w-0">
              <p className="text-[11px] text-accent-light uppercase tracking-wider font-medium">
                {SUB_LABEL[node.type] ?? 'Step'}
              </p>
              <p className="font-semibold text-white text-sm truncate">
                {isCondition ? (draft.field || 'Condition') : (app || 'New step')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white transition-colors flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* What this step does */}
          <div className="space-y-1.5">
            <label className="text-sm text-muted font-medium">What this step does</label>
            <textarea
              value={draft.description ?? ''}
              onChange={e => setField('description', e.target.value)}
              rows={2}
              placeholder="Describe what happens here…"
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white resize-none placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-colors"
            />
          </div>

          {isCondition ? (
            /* Condition editor */
            <div className="space-y-3">
              <Input label="If this field" placeholder="e.g. subject" value={draft.field ?? ''} onChange={e => setField('field', e.target.value)} />
              <Input label="Is" placeholder="e.g. contains" value={draft.operator ?? ''} onChange={e => setField('operator', e.target.value)} />
              <Input label="This value" placeholder="e.g. Order" value={draft.value ?? ''} onChange={e => setField('value', e.target.value)} />
            </div>
          ) : (
            <>
              {/* App + action/event names so any node (incl. new empty ones) is usable */}
              <div className="space-y-3">
                <Input
                  label="App / Service"
                  placeholder="e.g. Gmail, Slack, Notion"
                  value={draft.app ?? ''}
                  onChange={e => setField('app', e.target.value)}
                />
                <Input
                  label={isTrigger ? 'Trigger event' : 'Action'}
                  placeholder={isTrigger ? 'e.g. New Email' : 'e.g. Send Email'}
                  value={(isTrigger ? draft.event : draft.action) ?? ''}
                  onChange={e => setField(isTrigger ? 'event' : 'action', e.target.value)}
                />
              </div>

              {/* Configuration fields driven by config_fields */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sliders className="w-4 h-4 text-muted" />
                  <span className="text-sm font-medium text-white">Settings to fill in</span>
                </div>

                {fieldKeys.length > 0 ? (
                  <div className="space-y-3">
                    {fieldKeys.map(key => (
                      <Input
                        key={key}
                        label={humanize(key)}
                        placeholder={`Enter ${humanize(key).toLowerCase()}…`}
                        value={settings[key] ?? ''}
                        onChange={e => setSetting(key, e.target.value)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted bg-surface-2 rounded-lg p-3">
                    No extra settings needed for this step. Set the app and action above, then save.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <Button
            size="md"
            className="w-full"
            onClick={handleSave}
            variant={saved ? 'secondary' : 'primary'}
          >
            {saved ? (<><Check className="w-4 h-4" /> Saved</>) : 'Save Changes'}
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
