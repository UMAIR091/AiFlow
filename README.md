# AutoFlow

An AI-powered automation platform and website generator SaaS built with Next.js 14, Supabase, Claude AI, React Flow, and Framer Motion.

## Features

- **Automation Builder** — Describe automations in plain English, AI builds a visual workflow
- **Visual Canvas** — Interactive React Flow canvas with clickable nodes and settings panels
- **Native Execution Engine** — Run automations directly inside AutoFlow (Gmail, Slack, Notion, Google Sheets, HTTP)
- **n8n & Make.com Deploy** — One-click deploy to your existing automation platforms
- **Website Generator** — Turn any automation into a web app, form tool, or landing page
- **Multi-language** — Describe automations in English, Urdu, Arabic, Spanish, or French

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in the values:

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key |
| `ANTHROPIC_API_KEY` | ✅ | Claude API key from console.anthropic.com |
| `N8N_BASE_URL` | Optional | Your n8n instance URL |
| `N8N_API_KEY` | Optional | n8n API key |
| `MAKE_API_KEY` | Optional | Make.com API key |
| `MAKE_TEAM_ID` | Optional | Make.com team ID |
| `SLACK_BOT_TOKEN` | Optional | Slack bot token for native execution |
| `NOTION_API_KEY` | Optional | Notion integration token |

### 3. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor and run the contents of `supabase/schema.sql`
3. Enable Email auth in Authentication → Providers

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
autoflow/
├── app/
│   ├── (app)/               # Protected app pages (auth-gated)
│   │   ├── dashboard/       # Automation list & stats
│   │   ├── builder/         # Text input to build automation
│   │   │   └── canvas/      # Visual React Flow canvas
│   │   ├── connect/         # Connect third-party accounts
│   │   └── generate-site/   # Website generator
│   ├── api/                 # API routes
│   │   ├── parse-automation/  # Claude: text → workflow JSON
│   │   ├── run-automation/    # Native execution engine
│   │   ├── deploy-n8n/        # Deploy to n8n
│   │   ├── deploy-make/       # Deploy to Make.com
│   │   └── generate-site/     # Claude: automation → website HTML
│   ├── auth/                # Login / signup
│   └── page.tsx             # Landing page
├── components/
│   ├── canvas/              # React Flow nodes and canvas
│   └── ui/                  # Shared UI components
├── lib/
│   ├── supabase/            # Supabase client (browser + server)
│   ├── claude.ts            # Anthropic SDK + system prompts
│   └── utils.ts             # Helpers, app icons, formatters
├── types/
│   └── automation.ts        # TypeScript types
└── supabase/
    └── schema.sql           # Database schema
```

## Architecture

### Automation Flow
1. User types description in `/builder`
2. `POST /api/parse-automation` → Claude AI → `WorkflowJSON`
3. Saved to `automations` table in Supabase
4. Redirected to `/builder/canvas` — React Flow renders nodes
5. User can edit node settings via side panel
6. **Run**: `POST /api/run-automation` executes each step natively
7. **Deploy**: push to n8n/Make via their REST APIs
8. **Website**: Claude generates a complete HTML page

### Database
- `automations` — workflow definitions (JSON)
- `connections` — per-user API credentials (encrypted at rest by Supabase)
- `runs` — execution logs per automation
- `generated_sites` — HTML code for generated websites

## Tech Stack

- **Framework**: Next.js 14 (App Router, Server Components)
- **Styling**: Tailwind CSS
- **Auth + DB**: Supabase
- **AI**: Anthropic Claude API (`claude-sonnet-4-6`)
- **Visual Canvas**: React Flow
- **Animations**: Framer Motion
- **Icons**: Lucide React
