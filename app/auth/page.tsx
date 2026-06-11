'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Mail, Lock, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

function AuthForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [tab, setTab] = useState<'login' | 'signup'>(params.get('tab') === 'signup' ? 'signup' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(
    params.get('error') === 'confirmation_failed'
      ? 'Email confirmation failed. Please try signing up again.'
      : ''
  )
  const [success, setSuccess] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    const supabase = createClient()

    try {
      if (tab === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        if (error) throw error
        setSuccess('Check your email for a confirmation link!')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        // If user came from pricing page, send them to checkout
        const pendingPlan = localStorage.getItem('pending_plan')
        if (pendingPlan) {
          localStorage.removeItem('pending_plan')
          const res = await fetch('/api/create-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan: pendingPlan }),
          })
          const data = await res.json()
          if (data.url) { window.location.href = data.url; return }
        }
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setError(msg.replace('Invalid login credentials', 'Wrong email or password. Please check and try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">AutoFlow</span>
        </Link>

        <div className="bg-surface border border-border rounded-2xl p-8">
          {/* Tabs */}
          <div className="flex bg-surface-2 rounded-lg p-1 mb-8">
            {(['login', 'signup'] as const).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); setSuccess('') }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                  tab === t ? 'bg-accent text-white shadow-lg' : 'text-muted hover:text-white'
                }`}
              >
                {t === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: tab === 'signup' ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <h1 className="text-xl font-bold text-white mb-1">
                {tab === 'login' ? 'Welcome back' : 'Create your account'}
              </h1>
              <p className="text-sm text-muted mb-6">
                {tab === 'login' ? 'Sign in to your AutoFlow account' : 'Start automating for free today'}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted mt-3.5" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    label="Email address"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="pl-9"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted mt-3.5" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    label="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pl-9"
                  />
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-danger/10 border border-danger/30 rounded-lg px-4 py-2.5 text-sm text-danger"
                  >
                    {error}
                  </motion.div>
                )}

                {success && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-success/10 border border-success/30 rounded-lg px-4 py-2.5 text-sm text-success"
                  >
                    {success}
                  </motion.div>
                )}

                <Button type="submit" size="lg" className="w-full" loading={loading}>
                  {tab === 'login' ? 'Sign In' : 'Create Account'}
                </Button>
              </form>
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-muted mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  )
}
