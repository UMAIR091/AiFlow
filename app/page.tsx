'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Zap, Play, Globe, ArrowRight, Check, Sparkles, Mail, MessageSquare,
  FileText, Table, ShoppingBag, Github, Database, Hash,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

/* ----------------------------- data ----------------------------- */

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how' },
  { label: 'Pricing', href: '#pricing' },
]

const FEATURES = [
  {
    icon: Sparkles,
    title: 'Build',
    subtitle: 'Describe → Visual Workflow',
    description:
      "Type what you want automated in plain English. AutoFlow's AI understands you and instantly builds a visual, step-by-step workflow — no technical knowledge required.",
  },
  {
    icon: Play,
    title: 'Run',
    subtitle: 'Execute Natively or Deploy',
    description:
      'Run automations directly inside AutoFlow with zero setup, or push them to n8n, Make.com, and your favorite tools with a single click.',
  },
  {
    icon: Globe,
    title: 'Deploy as a Website',
    subtitle: 'Turn Automations into Tools',
    description:
      'Transform any automation into a shareable web app, form tool, or landing page — ready to hand to your team or customers in seconds.',
  },
]

const STEPS = [
  { step: '01', title: 'Describe it', body: 'Tell AutoFlow what you want automated, in any language, in your own words.' },
  { step: '02', title: 'AI builds it', body: 'Claude parses your description and lays out a visual workflow of connected steps.' },
  { step: '03', title: 'Review & edit', body: 'Tweak any step on the canvas. Add, remove, and configure nodes with simple forms.' },
  { step: '04', title: 'Run or deploy', body: 'Execute it natively, deploy to n8n/Make, or publish it as a website.' },
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
    blurb: 'Everything you need to automate your first workflows.',
    features: ['5 automations', '100 runs / month', 'Visual canvas builder', 'Community support'],
    cta: 'Get Started Free',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '€29',
    cadence: '/month',
    blurb: 'For makers who automate everything.',
    features: ['Unlimited automations', '10,000 runs / month', 'All integrations', 'Website generator', 'Priority support'],
    cta: 'Start Pro',
    highlight: true,
  },
  {
    name: 'Team',
    price: '€79',
    cadence: '/month',
    blurb: 'Built for teams shipping together.',
    features: ['Everything in Pro', 'Team members', 'Audit logs', 'Shared workspaces', 'Role-based access'],
    cta: 'Start Team',
    highlight: false,
  },
]

/* --------------------------- components -------------------------- */

function Navbar() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-border/40 bg-bg/70 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center shadow-lg shadow-accent/30">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-lg text-white">AutoFlow</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(l => (
            <a key={l.href} href={l.href} className="text-sm text-muted hover:text-white transition-colors">
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link href="/auth" className="text-sm text-muted hover:text-white transition-colors">Sign in</Link>
          <Link href="/auth?tab=signup">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </div>
    </nav>
  )
}

/* A styled, fake preview of the canvas UI (not a real screenshot). */
function CanvasMockup() {
  return (
    <div className="relative rounded-2xl border border-border bg-surface/80 shadow-2xl shadow-black/50 overflow-hidden">
      {/* Window chrome */}
      <div className="h-10 border-b border-border flex items-center px-4 gap-2 bg-surface-2/60">
        <span className="w-3 h-3 rounded-full bg-danger/70" />
        <span className="w-3 h-3 rounded-full bg-warning/70" />
        <span className="w-3 h-3 rounded-full bg-success/70" />
        <div className="ml-4 h-5 w-64 rounded bg-bg/60 border border-border/60" />
        <div className="ml-auto h-6 w-20 rounded-md bg-accent/80" />
      </div>

      {/* Canvas body */}
      <div
        className="relative p-8 min-h-[300px] flex items-center justify-center gap-6"
        style={{ backgroundImage: 'radial-gradient(#2a2a3a 1px, transparent 1px)', backgroundSize: '22px 22px' }}
      >
        {/* Trigger node */}
        <MockNode color="success" tag="Trigger" app="Schedule" line="Every day at 9:00 AM" icon="⏰" />
        <Connector />
        {/* Action node */}
        <MockNode color="accent" tag="Action" app="Gmail" line="Find new orders" icon="📧" />
        <Connector />
        {/* Action node */}
        <MockNode color="accent" tag="Action" app="Slack" line="Post to #sales" icon="💬" />
      </div>
    </div>
  )
}

function MockNode({ color, tag, app, line, icon }: { color: 'success' | 'accent'; tag: string; app: string; line: string; icon: string }) {
  const ring = color === 'success' ? 'border-success/50' : 'border-accent/50'
  const text = color === 'success' ? 'text-success' : 'text-accent-light'
  return (
    <div className={`bg-surface border-2 ${ring} rounded-xl p-4 w-[160px] shadow-lg`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <div>
          <p className={`text-[10px] font-medium uppercase tracking-wider ${text}`}>{tag}</p>
          <p className="text-sm font-semibold text-white">{app}</p>
        </div>
      </div>
      <p className="text-xs text-muted">{line}</p>
    </div>
  )
}

function Connector() {
  return (
    <div className="flex items-center" aria-hidden>
      <span className="h-0.5 w-8 bg-gradient-to-r from-accent/30 to-accent" />
      <span className="w-2 h-2 rotate-45 border-t-2 border-r-2 border-accent -ml-1" />
    </div>
  )
}

/* ----------------------------- page ------------------------------ */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg">
      <Navbar />

      {/* Hero */}
      <section className="relative max-w-6xl mx-auto px-6 pt-36 pb-20 text-center overflow-hidden">
        {/* glow */}
        <div className="pointer-events-none absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-accent/20 blur-[120px] rounded-full" />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative">
          <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-1.5 text-sm text-accent-light mb-8">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            Powered by Claude AI
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-[1.05] tracking-tight">
            Describe any automation.
            <br />
            <span className="bg-gradient-to-r from-accent via-accent-light to-accent bg-[length:200%] animate-gradient bg-clip-text text-transparent">
              Watch it build itself.
            </span>
          </h1>

          <p className="text-xl text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
            AutoFlow turns plain English into working automations — with a visual canvas, a native execution engine, and a one-click website generator. No code. No jargon. Just results.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap mb-4">
            <Link href="/auth?tab=signup">
              <Button size="lg" className="gap-2">Get Started Free <ArrowRight className="w-5 h-5" /></Button>
            </Link>
            <a href="#how">
              <Button variant="secondary" size="lg">See how it works</Button>
            </a>
          </div>
          <p className="text-sm text-muted">No credit card required · Free plan available</p>
        </motion.div>

        {/* Canvas mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.7 }}
          className="relative mt-16"
        >
          <CanvasMockup />
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24 scroll-mt-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Three layers. Zero complexity.</h2>
          <p className="text-muted">Everything you need to automate, run, and share — in one place.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className="bg-surface border border-border rounded-2xl p-7 hover:border-accent/40 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-5">
                <f.icon className="w-6 h-6 text-accent" />
              </div>
              <p className="text-xs text-accent uppercase tracking-wider font-medium mb-1">{f.subtitle}</p>
              <h3 className="text-xl font-bold text-white mb-3">{f.title}</h3>
              <p className="text-muted text-sm leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Integrations marquee */}
      <section className="py-20 border-y border-border/40 bg-surface/30">
        <div className="text-center mb-10 px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Connects with the tools you already use</h2>
          <p className="text-muted text-sm">Run natively or deploy anywhere — AutoFlow speaks their language.</p>
        </div>
        <div className="marquee-mask overflow-hidden">
          <div className="flex gap-4 animate-marquee">
            {[...INTEGRATIONS, ...INTEGRATIONS].map((it, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-surface border border-border rounded-xl px-6 py-4 whitespace-nowrap flex-shrink-0"
              >
                <it.icon className="w-5 h-5 text-accent-light" />
                <span className="text-sm font-medium text-white">{it.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-6xl mx-auto px-6 py-24 scroll-mt-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">From idea to running automation in minutes</h2>
          <p className="text-muted">Four simple steps. No engineers required.</p>
        </div>
        <div className="relative grid sm:grid-cols-2 md:grid-cols-4 gap-8">
          {/* timeline line */}
          <div className="hidden md:block absolute top-7 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          {STEPS.map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative text-center"
            >
              <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-surface border border-accent/30 flex items-center justify-center text-accent font-bold relative z-10">
                {item.step}
              </div>
              <h4 className="font-semibold text-white mb-2">{item.title}</h4>
              <p className="text-sm text-muted">{item.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-24 scroll-mt-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Simple, honest pricing</h2>
          <p className="text-muted">Start free. Upgrade when you're ready. Cancel anytime.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 items-start">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`rounded-2xl p-7 border ${
                plan.highlight
                  ? 'border-accent bg-gradient-to-b from-accent/10 to-surface relative shadow-xl shadow-accent/10'
                  : 'border-border bg-surface'
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Most Popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
              <p className="text-sm text-muted mt-1 mb-5 h-10">{plan.blurb}</p>
              <div className="flex items-end gap-1 mb-6">
                <span className="text-4xl font-bold text-white">{plan.price}</span>
                <span className="text-muted text-sm mb-1">{plan.cadence}</span>
              </div>
              <Link href="/auth?tab=signup">
                <Button variant={plan.highlight ? 'primary' : 'secondary'} className="w-full mb-6">
                  {plan.cta}
                </Button>
              </Link>
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
      </section>

      {/* Final CTA */}
      <section className="max-w-4xl mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative overflow-hidden bg-gradient-to-br from-accent/15 via-surface to-surface border border-accent/20 rounded-3xl p-12 text-center"
        >
          <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[400px] h-[300px] bg-accent/20 blur-[100px] rounded-full" />
          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to automate everything?</h2>
            <p className="text-muted mb-8 max-w-xl mx-auto">
              Join thousands of people using AutoFlow to save hours every week. Build your first automation in under five minutes.
            </p>
            <Link href="/auth?tab=signup">
              <Button size="lg">Start for free <ArrowRight className="w-5 h-5" /></Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-surface/30">
        <div className="max-w-7xl mx-auto px-6 py-12 grid sm:grid-cols-2 md:grid-cols-4 gap-8">
          <div className="sm:col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-white">AutoFlow</span>
            </div>
            <p className="text-sm text-muted">Describe any automation. Watch it build itself.</p>
          </div>

          <FooterCol title="Product" links={['Features', 'How it works', 'Pricing', 'Integrations']} />
          <FooterCol title="Company" links={['About', 'Blog', 'Careers', 'Contact']} />
          <FooterCol title="Legal" links={['Privacy', 'Terms', 'Security', 'Status']} />
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

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <p className="text-sm font-semibold text-white mb-3">{title}</p>
      <ul className="space-y-2">
        {links.map(l => (
          <li key={l}>
            <a href="#" className="text-sm text-muted hover:text-white transition-colors">{l}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}
