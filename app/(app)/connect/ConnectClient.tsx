'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Plus, Loader2, Key, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { createClient } from '@/lib/supabase/client'

const PLATFORMS = [
  {
    id: 'n8n',
    name: 'n8n',
    emoji: '⚙️',
    description: 'Deploy automations to your self-hosted n8n instance',
    fields: [
      { key: 'base_url', label: 'n8n URL', placeholder: 'https://your-n8n.com' },
      { key: 'api_key', label: 'API Key', placeholder: 'n8n API key' },
    ],
    authType: 'apikey',
  },
  {
    id: 'make',
    name: 'Make.com',
    emoji: '🔧',
    description: 'Deploy to Make.com and use their 1000+ app integrations',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'Make.com API key' },
      { key: 'team_id', label: 'Team ID', placeholder: 'Your Make team ID' },
    ],
    authType: 'apikey',
  },
  {
    id: 'gmail',
    name: 'Gmail',
    emoji: '📧',
    description: 'Send emails and respond to new messages',
    fields: [{ key: 'access_token', label: 'Access Token', placeholder: 'OAuth access token' }],
    authType: 'oauth',
  },
  {
    id: 'slack',
    name: 'Slack',
    emoji: '💬',
    description: 'Post messages and react to Slack events',
    fields: [{ key: 'api_key', label: 'Bot Token', placeholder: 'xoxb-your-bot-token' }],
    authType: 'apikey',
  },
  {
    id: 'notion',
    name: 'Notion',
    emoji: '📝',
    description: 'Read and write Notion databases and pages',
    fields: [{ key: 'api_key', label: 'Integration Token', placeholder: 'secret_...' }],
    authType: 'apikey',
  },
  {
    id: 'google_sheets',
    name: 'Google Sheets',
    emoji: '📊',
    description: 'Add rows, read data, and update spreadsheets',
    fields: [{ key: 'access_token', label: 'Access Token', placeholder: 'OAuth access token' }],
    authType: 'oauth',
  },
  {
    id: 'shopify',
    name: 'Shopify',
    emoji: '🛍️',
    description: 'Monitor orders, products, and customers',
    fields: [
      { key: 'shop_domain', label: 'Shop Domain', placeholder: 'yourstore.myshopify.com' },
      { key: 'api_key', label: 'Admin API Key', placeholder: 'Shopify admin API key' },
    ],
    authType: 'apikey',
  },
]

interface ConnectClientProps {
  connections: Record<string, boolean>
}

export function ConnectClient({ connections: initial }: ConnectClientProps) {
  const supabase = createClient()
  const [connections, setConnections] = useState(initial)
  const [activeForm, setActiveForm] = useState<string | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const [localN8nWarning, setLocalN8nWarning] = useState(false)

  async function handleSave(platformId: string) {
    setSaving(true)
    const platform = PLATFORMS.find(p => p.id === platformId)!
    const apiKey = formData.api_key || formData.access_token || ''
    const metadata: Record<string, string> = {}
    for (const f of platform.fields) {
      if (f.key !== 'api_key' && f.key !== 'access_token') {
        metadata[f.key] = formData[f.key] || ''
      }
    }

    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('connections').upsert({
      user_id: user!.id,
      platform: platformId,
      api_key: formData.api_key || null,
      access_token: formData.access_token || null,
      metadata,
    }, { onConflict: 'user_id, platform' })

    // Warn if an n8n connection points at a local address (won't work once deployed).
    if (platformId === 'n8n') {
      setLocalN8nWarning(/localhost|127\.0\.0\.1/i.test(formData.base_url || ''))
    }

    setConnections(prev => ({ ...prev, [platformId]: true }))
    setSaved(platformId)
    setActiveForm(null)
    setFormData({})
    setSaving(false)
    setTimeout(() => setSaved(null), 3000)
  }

  async function handleDisconnect(platformId: string) {
    if (!confirm(`Disconnect ${platformId}? Any automations using this will stop working.`)) return
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('connections').delete()
      .eq('user_id', user!.id)
      .eq('platform', platformId)
    setConnections(prev => ({ ...prev, [platformId]: false }))
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Connected Accounts</h1>
        <p className="text-muted">Link your apps to run automations natively, or deploy to n8n and Make.com. All connections are optional — AutoFlow can run automations on its own too.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {PLATFORMS.map((platform, i) => {
          const connected = connections[platform.id]
          const isExpanded = activeForm === platform.id

          return (
            <motion.div
              key={platform.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              <Card className={`transition-all ${connected ? 'border-success/30' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{platform.emoji}</span>
                    <div>
                      <p className="font-semibold text-white">{platform.name}</p>
                      <p className="text-xs text-muted">{platform.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {connected ? (
                      <CheckCircle className="w-5 h-5 text-success" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-border mt-1.5" />
                    )}
                  </div>
                </div>

                {saved === platform.id && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-success mb-2"
                  >
                    ✓ Connected successfully
                  </motion.p>
                )}

                {platform.id === 'n8n' && connected && localN8nWarning && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mb-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 text-xs text-warning leading-relaxed"
                  >
                    ⚠️ You&apos;re using a locally hosted n8n. This works while you&apos;re running AutoFlow on your
                    computer, but won&apos;t work if you deploy AutoFlow to the internet. For a permanent setup,
                    consider n8n Cloud (
                    <a
                      href="https://n8n.io/cloud"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-warning/80"
                    >
                      n8n.io/cloud
                    </a>
                    ).
                  </motion.div>
                )}

                {isExpanded ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-3 mt-3 pt-3 border-t border-border"
                  >
                    {platform.fields.map(f => (
                      <Input
                        key={f.key}
                        label={f.label}
                        placeholder={f.placeholder}
                        type={f.key.includes('key') || f.key.includes('token') ? 'password' : 'text'}
                        value={formData[f.key] || ''}
                        onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))}
                      />
                    ))}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleSave(platform.id)}
                        loading={saving}
                      >
                        <Key className="w-4 h-4" />
                        Save Connection
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setActiveForm(null); setFormData({}) }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant={connected ? 'secondary' : 'primary'}
                      size="sm"
                      onClick={() => setActiveForm(platform.id)}
                      className="flex-1"
                    >
                      <Plus className="w-4 h-4" />
                      {connected ? 'Update' : 'Connect'}
                    </Button>
                    {connected && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDisconnect(platform.id)}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            </motion.div>
          )
        })}
      </div>

      <div className="mt-8 bg-surface border border-border/50 rounded-xl p-5">
        <p className="text-sm font-medium text-white mb-1">🔒 Your API keys are encrypted</p>
        <p className="text-sm text-muted">All credentials are stored encrypted in our database and never logged. You can disconnect any account at any time.</p>
      </div>
    </div>
  )
}
