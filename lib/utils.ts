export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(new Date(date))
}

export function formatRelative(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export const APP_ICONS: Record<string, string> = {
  gmail: '📧',
  slack: '💬',
  notion: '📝',
  'google sheets': '📊',
  shopify: '🛍️',
  twitter: '🐦',
  'twitter/x': '🐦',
  github: '🐙',
  airtable: '📋',
  discord: '🎮',
  stripe: '💳',
  hubspot: '🧲',
  trello: '📌',
  asana: '✅',
  jira: '🔵',
  typeform: '📋',
  zoom: '📹',
  calendly: '📅',
  whatsapp: '💬',
  dropbox: '📦',
  onedrive: '☁️',
  'http request': '🌐',
  schedule: '⏰',
  webhook: '🔗',
  autoflow: '⚡',
  default: '⚙️',
}

export function getAppIcon(app: string): string {
  return APP_ICONS[app.toLowerCase()] ?? APP_ICONS.default
}

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ur', label: 'Urdu' },
  { code: 'ar', label: 'Arabic' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
]
