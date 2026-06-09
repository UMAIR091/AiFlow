'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe, Loader2, ExternalLink, Copy, Check, ChevronDown, Code } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { SiteStyle, WorkflowJSON } from '@/types/automation'

interface Automation {
  id: string
  name: string
  description: string
  workflow_json: WorkflowJSON
}

interface GenerateSiteClientProps {
  automations: Automation[]
  selectedId?: string
}

const STYLES: { id: SiteStyle; label: string; emoji: string; description: string }[] = [
  {
    id: 'form-tool',
    label: 'Form Tool',
    emoji: '📋',
    description: 'A clean form where users submit data and see results',
  },
  {
    id: 'landing-page',
    label: 'Landing Page',
    emoji: '🚀',
    description: 'A marketing page showcasing your automation',
  },
  {
    id: 'full-web-app',
    label: 'Full Web App',
    emoji: '💻',
    description: 'A complete dashboard with multiple sections',
  },
]

export function GenerateSiteClient({ automations, selectedId }: GenerateSiteClientProps) {
  const [selectedAutomation, setSelectedAutomation] = useState<string>(selectedId ?? automations[0]?.id ?? '')
  const [style, setStyle] = useState<SiteStyle>('form-tool')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [siteCode, setSiteCode] = useState('')
  const [showCode, setShowCode] = useState(false)
  const [copied, setCopied] = useState(false)
  const [tab, setTab] = useState<'preview' | 'code'>('preview')

  const automation = automations.find(a => a.id === selectedAutomation)

  async function handleGenerate() {
    if (!automation) return
    setLoading(true)
    setError('')
    setSiteCode('')

    try {
      const res = await fetch('/api/generate-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          automation_id: automation.id,
          workflow: automation.workflow_json,
          style,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setSiteCode(data.site_code)
      setTab('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate website. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(siteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownload() {
    const blob = new Blob([siteCode], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${automation?.name.replace(/\s+/g, '-').toLowerCase() ?? 'site'}.html`
    a.click()
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Website Generator</h1>
        <p className="text-muted">Turn any automation into a deployable web tool, landing page, or full web app.</p>
      </div>

      <div className="grid lg:grid-cols-[340px,1fr] gap-6">
        {/* Config panel */}
        <div className="space-y-5">
          {/* Automation selector */}
          <Card>
            <p className="text-sm font-medium text-white mb-3">1. Choose automation</p>
            {automations.length === 0 ? (
              <p className="text-sm text-muted">No automations yet. <a href="/builder" className="text-accent hover:underline">Build one first →</a></p>
            ) : (
              <div className="relative">
                <select
                  value={selectedAutomation}
                  onChange={e => setSelectedAutomation(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-white appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-accent/50"
                >
                  {automations.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}
            {automation && (
              <p className="text-xs text-muted mt-2">{automation.description || automation.workflow_json?.plain_summary}</p>
            )}
          </Card>

          {/* Style selector */}
          <Card>
            <p className="text-sm font-medium text-white mb-3">2. Choose style</p>
            <div className="space-y-2">
              {STYLES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    style === s.id
                      ? 'border-accent/60 bg-accent/10'
                      : 'border-border hover:border-accent/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{s.emoji}</span>
                    <span className="font-medium text-sm text-white">{s.label}</span>
                  </div>
                  <p className="text-xs text-muted mt-0.5">{s.description}</p>
                </button>
              ))}
            </div>
          </Card>

          <Button
            size="lg"
            className="w-full"
            onClick={handleGenerate}
            loading={loading}
            disabled={!selectedAutomation}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating website…
              </>
            ) : (
              <>
                <Globe className="w-5 h-5" />
                Generate Website
              </>
            )}
          </Button>

          {loading && (
            <p className="text-xs text-muted text-center">Claude is writing your website — usually 10–20 seconds</p>
          )}

          {error && (
            <div className="bg-danger/10 border border-danger/30 rounded-xl p-3 text-sm text-danger">
              {error}
            </div>
          )}
        </div>

        {/* Preview panel */}
        <div className="flex flex-col">
          {siteCode ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col h-full"
            >
              {/* Toolbar */}
              <div className="flex items-center justify-between bg-surface border border-border rounded-t-xl px-4 py-2.5">
                <div className="flex gap-1">
                  {(['preview', 'code'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        tab === t ? 'bg-accent/20 text-accent-light' : 'text-muted hover:text-white'
                      }`}
                    >
                      {t === 'preview' ? '👁 Preview' : '< > Code'}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={handleCopy}>
                    {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleDownload}>
                    <ExternalLink className="w-4 h-4" />
                    Download HTML
                  </Button>
                </div>
              </div>

              {tab === 'preview' ? (
                <iframe
                  srcDoc={siteCode}
                  className="flex-1 w-full border border-t-0 border-border rounded-b-xl bg-white"
                  style={{ minHeight: 600 }}
                  title="Generated website preview"
                  sandbox="allow-scripts"
                />
              ) : (
                <pre className="flex-1 bg-surface border border-t-0 border-border rounded-b-xl p-4 text-xs text-muted overflow-auto font-mono" style={{ minHeight: 600 }}>
                  {siteCode}
                </pre>
              )}
            </motion.div>
          ) : (
            <div className="flex-1 bg-surface border border-dashed border-border rounded-xl flex items-center justify-center min-h-[500px]">
              <div className="text-center">
                <Globe className="w-16 h-16 text-muted/30 mx-auto mb-4" />
                <p className="text-muted">Your generated website will appear here</p>
                <p className="text-sm text-muted/60 mt-1">Pick an automation and style, then click Generate</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
