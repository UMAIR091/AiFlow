'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, Loader2, ChevronDown, ArrowLeft, ArrowRight,
  CheckCircle, AlertCircle, Info,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LANGUAGES } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { WorkflowJSON } from '@/types/automation'
import type { PreflightResult, PreflightField } from '@/app/api/preflight-automation/route'

const PLACEHOLDERS = [
  'Every morning at 9am, email me a summary of unread Gmail messages…',
  'When a new row is added to my Google Sheet, post it to Slack…',
  'Monitor my Shopify store and alert me when any product goes out of stock…',
  'When someone fills my Google Form, save it to Google Sheets and email them a confirmation…',
  'Every Friday, compile this week\'s Notion tasks and send a report…',
]

// Apps that need a saved connection in /connect
const NEEDS_CONNECTION = [
  'Gmail', 'Slack', 'Notion', 'Google Sheets', 'Google Forms',
  'Shopify', 'Airtable', 'Discord', 'Stripe', 'HubSpot',
  'Trello', 'Asana', 'Jira', 'GitHub', 'Zoom', 'Calendly',
  'WhatsApp', 'Dropbox', 'OneDrive', 'Typeform',
]

type Step = 'input' | 'preflight' | 'building'

export default function BuilderPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('input')
  const [description, setDescription] = useState('')
  const [language, setLanguage] = useState('en')
  const [analyzing, setAnalyzing] = useState(false)
  const [preflight, setPreflight] = useState<PreflightResult | null>(null)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [connectedApps, setConnectedApps] = useState<string[]>([])
  const [error, setError] = useState('')
  const [placeholder] = useState(() => PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)])

  // Step 1 → Step 2: analyze what's needed
  async function handleAnalyze() {
    if (!description.trim()) return
    setAnalyzing(true)
    setError('')

    try {
      // Run preflight analysis + connection check in parallel
      const [preflightRes, connectionsRes] = await Promise.all([
        fetch('/api/preflight-automation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description }),
        }),
        supabase.from('connections').select('platform'),
      ])

      const preflightData: PreflightResult = await preflightRes.json()
      if (!preflightRes.ok || (preflightData as { error?: string }).error) {
        throw new Error((preflightData as { error?: string }).error || 'Analysis failed')
      }

      // Pre-fill field values from defaults
      const defaults: Record<string, string> = {}
      for (const f of preflightData.fields) {
        defaults[f.key] = f.default || ''
      }

      const platforms = (connectionsRes.data ?? []).map(c => c.platform as string)

      setPreflight(preflightData)
      setFieldValues(defaults)
      setConnectedApps(platforms)
      setStep('preflight')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  // Step 2 → Step 3: build with user's answers injected into description
  async function handleBuild() {
    if (!preflight) return
    setStep('building')
    setError('')

    try {
      // Inject user's answers into the description so the AI pre-fills everything
      const filledInfo = Object.entries(fieldValues)
        .filter(([, v]) => v.trim())
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')

      const enrichedDescription = filledInfo
        ? `${description}\n\nAdditional details provided by the user: ${filledInfo}`
        : description

      const res = await fetch('/api/parse-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: enrichedDescription, language }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const workflow: WorkflowJSON = data.workflow

      const { data: { user }, error: authErr } = await supabase.auth.getUser()
      if (authErr || !user) { router.push('/auth'); return }

      const { data: automation, error: dbErr } = await supabase
        .from('automations')
        .insert({
          user_id: user.id,
          name: workflow.suggested_name || 'Untitled Automation',
          description: workflow.plain_summary || '',
          workflow_json: workflow,
          platform: 'autoflow',
          status: 'paused',
        })
        .select()
        .single()

      if (dbErr) {
        const reason = dbErr.message?.toLowerCase().includes('row-level security')
          ? 'Your session expired. Please sign in again and retry.'
          : dbErr.message || 'Unknown error.'
        throw new Error(`Could not save your automation: ${reason}`)
      }

      if (!automation?.id) throw new Error('Automation was created but no ID came back. Please try again.')

      router.push(`/builder/canvas?id=${automation.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setStep('preflight')
    }
  }

  function isAppConnected(appName: string): boolean {
    if (!NEEDS_CONNECTION.includes(appName)) return true // Schedule, Webhook etc don't need auth
    const platformKey = appName.toLowerCase().replace(/\s+/g, '_').replace(/\//g, '_')
    return connectedApps.some(p =>
      p === platformKey || p === appName.toLowerCase() || p.includes(appName.toLowerCase().split(' ')[0])
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      {/* ── STEP 1: DESCRIBE ── */}
      <AnimatePresence mode="wait">
        {step === 'input' && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="text-center mb-10">
              <div className="w-14 h-14 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Zap className="w-7 h-7 text-accent" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-3">Describe your automation</h1>
              <p className="text-muted">Use plain English — no technical knowledge needed. AutoFlow's AI will understand you.</p>
            </div>

            <div className="space-y-4">
              {/* Language selector */}
              <div className="flex items-center gap-3">
                <label className="text-sm text-muted">Language:</label>
                <div className="relative">
                  <select
                    value={language}
                    onChange={e => setLanguage(e.target.value)}
                    className="bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-sm text-white appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-accent/50"
                  >
                    {LANGUAGES.map(l => (
                      <option key={l.code} value={l.code}>{l.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="relative">
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAnalyze() }}
                  placeholder={placeholder}
                  rows={6}
                  className="w-full bg-surface border border-border rounded-2xl px-6 py-5 text-white text-base resize-none focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 placeholder:text-muted/50 transition-all"
                />
                <div className="absolute bottom-4 right-4 text-xs text-muted/50">
                  {description.length > 0 && `${description.length} chars · `}Ctrl+Enter to continue
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3 text-sm text-danger"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <Button
                size="lg"
                className="w-full text-base"
                onClick={handleAnalyze}
                loading={analyzing}
                disabled={!description.trim()}
              >
                {analyzing ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing what you need…</>
                ) : (
                  <><ArrowRight className="w-5 h-5" /> Continue</>
                )}
              </Button>

              {analyzing && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-sm text-muted"
                >
                  Figuring out what connections and info you'll need…
                </motion.p>
              )}
            </div>

            {/* Tips */}
            <div className="mt-10 border-t border-border pt-8">
              <p className="text-xs text-muted uppercase tracking-wider mb-4">Tips for best results</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  ['Mention timing', 'e.g. "every morning", "when X happens"'],
                  ['Name the apps', 'e.g. Gmail, Slack, Notion, Google Sheets'],
                  ['Describe the outcome', 'What should happen as a result?'],
                  ['Add conditions', 'e.g. "only if subject contains Order"'],
                ].map(([tip, example]) => (
                  <div key={tip} className="bg-surface rounded-xl p-4">
                    <p className="text-sm font-medium text-white mb-0.5">{tip}</p>
                    <p className="text-xs text-muted">{example}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── STEP 2: PREFLIGHT FORM ── */}
        {step === 'preflight' && preflight && (
          <motion.div
            key="preflight"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
          >
            {/* Back */}
            <button
              onClick={() => { setStep('input'); setError('') }}
              className="flex items-center gap-1.5 text-sm text-muted hover:text-white transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            {/* Summary */}
            <div className="mb-8">
              <div className="flex items-start gap-3 p-4 bg-accent/10 border border-accent/20 rounded-xl mb-6">
                <Info className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                <p className="text-sm text-white">{preflight.summary}</p>
              </div>

              {/* Connection status */}
              {preflight.apps.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-sm font-semibold text-white mb-3">Apps this automation uses</h2>
                  <div className="flex flex-wrap gap-2">
                    {preflight.apps.map(app => {
                      const connected = isAppConnected(app)
                      const needsConn = NEEDS_CONNECTION.includes(app)
                      return (
                        <div
                          key={app}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border ${
                            !needsConn
                              ? 'bg-surface border-border text-muted'
                              : connected
                                ? 'bg-success/10 border-success/30 text-success'
                                : 'bg-warning/10 border-warning/30 text-warning'
                          }`}
                        >
                          {needsConn
                            ? connected
                              ? <CheckCircle className="w-3.5 h-3.5" />
                              : <AlertCircle className="w-3.5 h-3.5" />
                            : null}
                          {app}
                          {needsConn && !connected && (
                            <a
                              href="/connect"
                              target="_blank"
                              className="underline text-xs ml-1 hover:text-white"
                            >
                              Connect
                            </a>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {preflight.apps.some(a => NEEDS_CONNECTION.includes(a) && !isAppConnected(a)) && (
                    <p className="text-xs text-warning mt-2">
                      ⚠ Some apps aren't connected yet. You can still build — but connect them before running.
                    </p>
                  )}
                </div>
              )}

              {/* Required info fields */}
              {preflight.fields.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-white mb-1">
                    What do you need for this automation?
                  </h2>
                  <p className="text-xs text-muted mb-4">
                    Fill in what you know — this gets built directly into your workflow so you don't have to edit it later.
                  </p>
                  <div className="space-y-4">
                    {preflight.fields.map((field: PreflightField) => (
                      <div key={field.key}>
                        <label className="block text-sm font-medium text-white mb-1">
                          {field.label}
                          {field.required && <span className="text-danger ml-1">*</span>}
                        </label>
                        <Input
                          placeholder={field.hint}
                          value={fieldValues[field.key] ?? ''}
                          onChange={e => setFieldValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                        />
                        <p className="text-xs text-muted mt-1">{field.hint}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3 text-sm text-danger mb-4"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <Button size="lg" className="w-full text-base" onClick={handleBuild}>
              <Zap className="w-5 h-5" />
              Build My Automation
            </Button>
          </motion.div>
        )}

        {/* ── STEP 3: BUILDING ── */}
        {step === 'building' && (
          <motion.div
            key="building"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-24"
          >
            <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Building your automation…</h2>
            <p className="text-sm text-muted">Claude AI is creating your workflow with all your settings pre-filled.</p>
            <p className="text-xs text-muted/50 mt-2">Usually takes 5–10 seconds</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
