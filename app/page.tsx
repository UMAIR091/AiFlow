'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Zap, Play, Globe, ArrowRight, Check, Sparkles, Mail, MessageSquare,
  FileText, Table, ShoppingBag, Github, Database, Hash, Star,
  Clock, AlertCircle, TrendingUp, Shield, Sun, Moon,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

/* ─── data ──────────────────────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: Sparkles,
    tag: 'Step 1',
    title: 'Describe it in plain English',
    description: 'Type what you want automated like you\'d explain it to a friend. AutoFlow\'s AI figures out every step — no technical knowledge needed.',
    example: '"When someone submits my Google Form, save the data to my spreadsheet and email them a confirmation"',
  },
  {
    icon: Play,
    tag: 'Step 2',
    title: 'AI builds the full workflow',
    description: 'A visual, step-by-step automation appears instantly. Every node, every connection — already configured with your details pre-filled.',
    example: 'Google Forms → Google Sheets → Gmail, all wired up and ready to run.',
  },
  {
    icon: Globe,
    tag: 'Step 3',
    title: 'Run it — inside your app',
    description: 'Hit Run and it executes natively. No n8n. No Make.com. No third-party setup. Or deploy to those tools if you prefer — one click.',
    example: 'Real emails sent. Real rows saved. Real Slack messages posted.',
  },
]

const PAIN_POINTS = [
  { icon: Clock, text: 'Copying data between apps by hand every day' },
  { icon: AlertCircle, text: 'Paying for complex tools you never fully understood' },
  { icon: TrendingUp, text: 'Hiring a developer just to build a simple automation' },
  { icon: Shield, text: 'Giving up because Zapier got too expensive' },
]

const USE_CASES = [
  {
    emoji: '📋',
    title: 'Google Form → Spreadsheet → Email',
    desc: 'Every form submission is saved automatically and the person gets a confirmation email.',
  },
  {
    emoji: '📧',
    title: 'Daily Gmail Digest → Slack',
    desc: 'Every morning, your unread emails are summarized and posted to your Slack channel.',
  },
  {
    emoji: '🛍️',
    title: 'New Shopify Order → Notion',
    desc: 'Every new order creates a task in your Notion database with full order details.',
  },
  {
    emoji: '📊',
    title: 'New Airtable Row → Slack Alert',
    desc: 'When a new record appears in Airtable, your team gets notified instantly in Slack.',
  },
  {
    emoji: '🔔',
    title: 'New GitHub Issue → Trello Card',
    desc: 'Every GitHub issue automatically becomes a card in your Trello board.',
  },
  {
    emoji: '💳',
    title: 'Stripe Payment → HubSpot Contact',
    desc: 'New customers are added to HubSpot automatically when they pay.',
  },
]

const TESTIMONIALS = [
  {
    quote: "I built a form → spreadsheet → email automation in 3 minutes. Previously I was copying data by hand every single day.",
    name: 'Sarah K.',
    role: 'Freelance Designer',
    avatar: 'SK',
  },
  {
    quote: "I don't understand code at all. AutoFlow is the first tool where I actually understood what was happening and got it working.",
    name: 'Marcus T.',
    role: 'Small Business Owner',
    avatar: 'MT',
  },
  {
    quote: "Replaced our €300/month Zapier plan. Everything our team needed was here, and it took 20 minutes to set up.",
    name: 'Priya M.',
    role: 'Operations Lead',
    avatar: 'PM',
  },
]

const INTEGRATIONS = [
  { name: 'Gmail', icon: Mail },
  { name: 'Slack', icon: MessageSquare },
  { name: 'Notion', icon: FileText },
  { name: 'Google Sheets', icon: Table },
  { name: 'n8n', icon: Zap },
  { name: 'Make.com', icon: Sparkles },
  { name: 'Shopify', icon: ShoppingBag },
  { name: 'Airtable', icon: Database },
  { name: 'Discord', icon: Hash },
  { name: 'GitHub', icon: Github },
]

const PLANS = [
  {
    name: 'Free',
    price: '€0',
    cadence: 'forever',
    blurb: 'Perfect for trying AutoFlow and your first automations.',
    features: ['5 automations', '100 runs / month', 'Visual canvas builder', 'Native execution', 'Community support'],
    cta: 'Get Started Free',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '€29',
    cadence: '/month',
    blurb: 'For people who want to automate everything in their life.',
    features: ['Unlimited automations', '10,000 runs / month', 'All integrations', 'Website generator', 'Email support'],
    cta: 'Start Pro Trial',
    highlight: true,
  },
  {
    name: 'Team',
    price: '€79',
    cadence: '/month',
    blurb: 'Built for teams who want to move faster together.',
    features: ['Everything in Pro', 'Up to 10 team members', 'Shared workspaces', 'Audit logs', 'Priority support'],
    cta: 'Start Team Trial',
    highlight: false,
  },
]

const FAQS = [
  {
    q: 'Do I need to know how to code?',
    a: 'Not at all. You describe your automation in plain English and the AI builds it for you. If you can write a text message, you can use AutoFlow.',
  },
  {
    q: 'How is this different from Zapier or Make.com?',
    a: 'AutoFlow uses AI to build automations from a plain English description — you never have to configure triggers and actions manually. It also runs automations natively so you don\'t need a third-party account.',
  },
  {
    q: 'Does it actually send real emails and post real Slack messages?',
    a: 'Yes. Once you connect your accounts, automations execute for real — emails are sent via your Gmail or our email service, Slack messages are posted, Notion pages are created, and so on.',
  },
  {
    q: 'Can I connect my Google Form?',
    a: 'Yes. AutoFlow generates a webhook URL for your form. You paste it into your Google Form\'s Apps Script settings and it triggers your automation on every submission.',
  },
]

/* ─── components ────────────────────────────────────────────────────────────── */

function Navbar() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const saved = (localStorage.getItem('theme') || 'dark') as 'dark' | 'light'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-border/40 bg-bg/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center shadow-lg shadow-accent/40">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>AutoFlow</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {[['Features', '#features'], ['Use Cases', '#usecases'], ['Pricing', '#pricing'], ['FAQ', '#faq']].map(([label, href]) => (
            <a key={href} href={href} className="text-sm text-muted hover:text-accent transition-colors">{label}</a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-accent hover:bg-surface-2 transition-colors"
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <Link href="/auth" className="text-sm text-muted hover:text-accent transition-colors hidden sm:block">Sign in</Link>
          <Link href="/auth?tab=signup">
            <Button size="sm">Get Started Free</Button>
          </Link>
        </div>
      </div>
    </nav>
  )
}

function CanvasMockup() {
  return (
    <div className="relative rounded-2xl border border-border bg-surface shadow-2xl shadow-black/60 overflow-hidden">
      {/* Window chrome */}
      <div className="h-10 border-b border-border flex items-center px-4 gap-2 bg-surface-2">
        <span className="w-3 h-3 rounded-full bg-danger/70" />
        <span className="w-3 h-3 rounded-full bg-warning/70" />
        <span className="w-3 h-3 rounded-full bg-success/70" />
        <span className="ml-4 text-xs text-muted font-medium">Google Form → Spreadsheet → Confirmation Email</span>
        <div className="ml-auto flex gap-2">
          <div className="h-6 w-16 rounded-md bg-surface border border-border flex items-center justify-center">
            <span className="text-xs text-muted">Save</span>
          </div>
          <div className="h-6 w-16 rounded-md bg-accent flex items-center justify-center">
            <span className="text-xs text-white font-medium">Run Now</span>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div
        className="relative p-10 flex items-center justify-center gap-4 flex-wrap"
        style={{ backgroundImage: 'radial-gradient(#2a2a3a 1px, transparent 1px)', backgroundSize: '24px 24px', minHeight: 220 }}
      >
        <MockNode color="success" tag="TRIGGER" app="Google Forms" line="New form submission" icon="📋" />
        <Arrow />
        <MockNode color="accent" tag="ACTION" app="Google Sheets" line="Add row to Submissions" icon="📊" />
        <Arrow />
        <MockNode color="accent" tag="ACTION" app="Gmail" line="Send confirmation email" icon="📧" />
      </div>

      {/* Status bar */}
      <div className="border-t border-border px-5 py-2.5 bg-surface-2 flex items-center gap-3">
        <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
        <span className="text-xs text-success font-medium">Last run: 2 minutes ago — 3 steps completed successfully</span>
      </div>
    </div>
  )
}

function MockNode({ color, tag, app, line, icon }: { color: 'success' | 'accent'; tag: string; app: string; line: string; icon: string }) {
  const ring = color === 'success' ? 'border-success/50 shadow-success/10' : 'border-accent/40 shadow-accent/10'
  const tagColor = color === 'success' ? 'text-success' : 'text-accent-light'
  return (
    <div className={`bg-surface-2 border-2 ${ring} rounded-xl p-4 w-[168px] shadow-lg`}>
      <p className={`text-[9px] font-bold uppercase tracking-widest ${tagColor} mb-2`}>{tag}</p>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <p className="text-sm font-bold text-white leading-tight">{app}</p>
      </div>
      <p className="text-xs text-muted leading-tight">{line}</p>
    </div>
  )
}

function Arrow() {
  return (
    <div className="flex items-center flex-shrink-0">
      <div className="h-0.5 w-8 bg-gradient-to-r from-accent/20 to-accent/80" />
      <div className="w-0 h-0 border-t-[5px] border-b-[5px] border-l-[8px] border-t-transparent border-b-transparent border-l-accent/80 -ml-px" />
    </div>
  )
}

function PricingCards() {
  const [loading, setLoading] = useState<string | null>(null)

  async function handlePlanClick(plan: typeof PLANS[0]) {
    if (plan.name === 'Free') {
      window.location.href = '/auth?tab=signup'
      return
    }
    setLoading(plan.name)
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: plan.name.toLowerCase() }),
      })
      const data = await res.json()
      if (data.error === 'Not authenticated') {
        localStorage.setItem('pending_plan', plan.name.toLowerCase())
        window.location.href = '/auth?tab=signup'
        return
      }
      if (data.url) window.location.href = data.url
    } catch {
      window.location.href = '/auth?tab=signup'
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="grid md:grid-cols-3 gap-6 items-start">
      {PLANS.map((plan, i) => (
        <motion.div
          key={plan.name}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1 }}
          className={`rounded-2xl p-7 border relative ${
            plan.highlight
              ? 'border-accent bg-gradient-to-b from-accent/10 to-surface shadow-2xl shadow-accent/10'
              : 'border-border bg-surface'
          }`}
        >
          {plan.highlight && (
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-accent text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg shadow-accent/30">
              Most Popular
            </span>
          )}
          <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{plan.name}</h3>
          <p className="text-sm text-muted mt-1 mb-5 min-h-[40px]">{plan.blurb}</p>
          <div className="flex items-end gap-1 mb-6">
            <span className="text-4xl font-bold" style={{ color: 'var(--color-text)' }}>{plan.price}</span>
            <span className="text-muted text-sm mb-1">{plan.cadence}</span>
          </div>
          <Button
            variant={plan.highlight ? 'primary' : 'secondary'}
            className="w-full mb-6"
            loading={loading === plan.name}
            onClick={() => handlePlanClick(plan)}
          >
            {plan.cta}
          </Button>
          <ul className="space-y-3">
            {plan.features.map(f => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-muted">
                <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.highlight ? 'text-accent' : 'text-success'}`} />
                {f}
              </li>
            ))}
          </ul>
        </motion.div>
      ))}
    </div>
  )
}

function FAQItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="border border-border rounded-xl p-6 bg-surface hover:border-accent/30 transition-colors">
      <h4 className="font-semibold text-white mb-2">{q}</h4>
      <p className="text-sm text-muted leading-relaxed">{a}</p>
    </div>
  )
}

/* ─── page ───────────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg">
      <Navbar />

      {/* ── HERO ── */}
      <section className="relative max-w-6xl mx-auto px-6 pt-36 pb-16 text-center overflow-hidden">
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-accent/15 blur-[130px] rounded-full" />

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative">
          <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-1.5 text-sm text-accent-light mb-8">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            Powered by Claude AI · No code required
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-[1.05] tracking-tight">
            Build automations by
            <br />
            <span className="bg-gradient-to-r from-accent via-accent-light to-accent bg-[length:200%] animate-gradient bg-clip-text text-transparent">
              just describing them
            </span>
          </h1>

          <p className="text-xl text-muted max-w-2xl mx-auto mb-4 leading-relaxed">
            Tell AutoFlow what you want automated in plain English. The AI builds the full workflow, connects your apps, and runs it — all without a single line of code.
          </p>

          <p className="text-sm text-muted/70 mb-10">
            "When someone submits my form, save to Google Sheets and email them a confirmation" → <span className="text-accent-light">done in 60 seconds.</span>
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap mb-3">
            <Link href="/auth?tab=signup">
              <Button size="lg" className="gap-2 shadow-lg shadow-accent/20">
                Start for free <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <a href="#usecases">
              <Button variant="secondary" size="lg">See examples</Button>
            </a>
          </div>
          <p className="text-sm text-muted">No credit card · Free plan available · Set up in 2 minutes</p>
        </motion.div>

        {/* Canvas mockup */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="relative mt-16"
        >
          <CanvasMockup />
          <div className="pointer-events-none absolute -inset-1 rounded-2xl bg-gradient-to-t from-bg via-transparent to-transparent opacity-30" />
        </motion.div>
      </section>

      {/* ── PAIN POINTS ── */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-surface border border-border rounded-2xl p-8 md:p-10"
        >
          <h2 className="text-2xl font-bold text-white mb-2 text-center">Sound familiar?</h2>
          <p className="text-muted text-center text-sm mb-8">Most automation tools are built for developers. AutoFlow is built for everyone else.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {PAIN_POINTS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-3 bg-surface-2 rounded-xl p-4">
                <Icon className="w-5 h-5 text-danger/70 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted">{text}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-accent-light mt-6 font-medium">AutoFlow fixes all of this — starting at €0.</p>
        </motion.div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20 scroll-mt-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">How AutoFlow works</h2>
          <p className="text-muted">Three steps from idea to running automation.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className="bg-surface border border-border rounded-2xl p-7 hover:border-accent/40 transition-all group"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                  <f.icon className="w-5 h-5 text-accent" />
                </div>
                <span className="text-xs text-accent font-bold uppercase tracking-wider">{f.tag}</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
              <p className="text-muted text-sm leading-relaxed mb-4">{f.description}</p>
              <div className="bg-surface-2 border border-border/60 rounded-lg px-3 py-2.5">
                <p className="text-xs text-muted/80 italic">{f.example}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── USE CASES ── */}
      <section id="usecases" className="max-w-6xl mx-auto px-6 py-20 scroll-mt-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Real automations people build</h2>
          <p className="text-muted">Describe any of these and AutoFlow builds it in seconds.</p>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {USE_CASES.map((uc, i) => (
            <motion.div
              key={uc.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="bg-surface border border-border rounded-xl p-5 hover:border-accent/30 transition-all cursor-pointer group"
            >
              <span className="text-3xl mb-3 block">{uc.emoji}</span>
              <h4 className="font-semibold text-white text-sm mb-1 group-hover:text-accent-light transition-colors">{uc.title}</h4>
              <p className="text-xs text-muted leading-relaxed">{uc.desc}</p>
            </motion.div>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link href="/auth?tab=signup">
            <Button variant="secondary">Build your own automation →</Button>
          </Link>
        </div>
      </section>

      {/* ── INTEGRATIONS ── */}
      <section className="py-20 border-y border-border/40 bg-surface/30">
        <div className="text-center mb-10 px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Connects with the tools you already use</h2>
          <p className="text-muted text-sm">20+ integrations. More added every week.</p>
        </div>
        <div className="marquee-mask overflow-hidden">
          <div className="flex gap-4 animate-marquee">
            {[...INTEGRATIONS, ...INTEGRATIONS].map((it, i) => (
              <div key={i} className="flex items-center gap-3 bg-surface border border-border rounded-xl px-6 py-4 whitespace-nowrap flex-shrink-0 hover:border-accent/30 transition-colors">
                <it.icon className="w-5 h-5 text-accent-light" />
                <span className="text-sm font-medium text-white">{it.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">People love AutoFlow</h2>
          <div className="flex items-center justify-center gap-1 mt-2">
            {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-warning text-warning" />)}
            <span className="text-sm text-muted ml-2">5.0 · Early Access</span>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-surface border border-border rounded-2xl p-6"
            >
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-warning text-warning" />)}
              </div>
              <p className="text-sm text-white leading-relaxed mb-5">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-xs font-bold text-accent-light">
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-muted">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-20 scroll-mt-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Simple, honest pricing</h2>
          <p className="text-muted">Start free. Upgrade when you're ready. Cancel anytime.</p>
        </div>
        <PricingCards />
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="max-w-3xl mx-auto px-6 py-20 scroll-mt-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">Questions? Answered.</h2>
        </div>
        <div className="space-y-4">
          {FAQS.map((faq, i) => (
            <motion.div
              key={faq.q}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <FAQItem q={faq.q} a={faq.a} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative overflow-hidden bg-gradient-to-br from-accent/15 via-surface to-surface border border-accent/25 rounded-3xl p-12 text-center"
        >
          <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[400px] h-[300px] bg-accent/20 blur-[100px] rounded-full" />
          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to stop doing things manually?</h2>
            <p className="text-muted mb-8 max-w-xl mx-auto">
              Build your first automation in under 5 minutes. Free forever — no credit card needed.
            </p>
            <Link href="/auth?tab=signup">
              <Button size="lg" className="shadow-xl shadow-accent/20">
                Get started for free <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border/50 bg-surface/30">
        <div className="max-w-7xl mx-auto px-6 py-12 grid sm:grid-cols-2 md:grid-cols-4 gap-8">
          <div className="sm:col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white">AutoFlow</span>
            </div>
            <p className="text-sm text-muted leading-relaxed">Build automations by just describing them. Powered by Claude AI.</p>
          </div>
          <FooterCol title="Product" links={[['Features', '#features'], ['Use Cases', '#usecases'], ['Pricing', '#pricing'], ['FAQ', '#faq']]} />
          <FooterCol title="Company" links={[['About', '#'], ['Blog', '#'], ['Careers', '#'], ['Contact', '#']]} />
          <FooterCol title="Legal" links={[['Privacy', '#'], ['Terms', '#'], ['Security', '#'], ['Status', '#']]} />
        </div>
        <div className="border-t border-border/50">
          <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted">
            <p>© 2026 AutoFlow. Built with Claude AI.</p>
            <div className="flex items-center gap-5">
              <a href="#" className="hover:text-white transition-colors">Twitter</a>
              <a href="#" className="hover:text-white transition-colors">GitHub</a>
              <a href="#" className="hover:text-white transition-colors">Discord</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="text-sm font-bold text-white mb-3">{title}</p>
      <ul className="space-y-2">
        {links.map(([label, href]) => (
          <li key={label}>
            <a href={href} className="text-sm text-muted hover:text-white transition-colors">{label}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}
