export interface AutomationTrigger {
  app: string
  event: string
  description: string
  settings: Record<string, unknown>
  /** Names of the settings the user must fill in (e.g. ["channel", "message"]). */
  config_fields: string[]
}

export interface AutomationAction {
  id: string
  app: string
  action: string
  description: string
  settings: Record<string, unknown>
  /** Names of the settings the user must fill in (e.g. ["to", "subject", "body"]). */
  config_fields: string[]
  position: { x: number; y: number }
}

export interface AutomationCondition {
  id: string
  field: string
  operator: string
  value: string
  description: string
  position: { x: number; y: number }
}

export interface WorkflowJSON {
  trigger: AutomationTrigger
  actions: AutomationAction[]
  conditions: AutomationCondition[]
  plain_summary: string
  suggested_name: string
}

export interface Automation {
  id: string
  user_id: string
  name: string
  description: string
  workflow_json: WorkflowJSON
  platform: 'autoflow' | 'n8n' | 'make'
  status: 'active' | 'paused' | 'running' | 'error'
  last_run: string | null
  created_at: string
}

export interface AutomationRun {
  id: string
  automation_id: string
  status: 'running' | 'success' | 'failed'
  log: RunLogEntry[]
  started_at: string
  finished_at: string | null
}

export interface RunLogEntry {
  step: string
  status: 'pending' | 'running' | 'success' | 'failed'
  message: string
  timestamp: string
  data?: unknown
}

export interface Connection {
  id: string
  user_id: string
  platform: string
  api_key?: string
  access_token?: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface GeneratedSite {
  id: string
  user_id: string
  automation_id: string
  site_code: string
  deploy_url: string
  created_at: string
}

export type SiteStyle = 'form-tool' | 'landing-page' | 'full-web-app'
