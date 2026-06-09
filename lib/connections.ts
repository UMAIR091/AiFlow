import type { WorkflowJSON } from '@/types/automation'

/** Apps that execute without any user credentials, so they never need a connection. */
const NO_AUTH_APPS = new Set(['schedule', 'webhook', 'http request'])

/**
 * Maps a workflow app name to its connection platform id (as stored in the
 * `connections` table / used on the Connect page). e.g. "Gmail" → "gmail",
 * "Google Sheets" → "google_sheets".
 */
export function appToPlatform(app: string): string {
  const key = app.trim().toLowerCase()
  const explicit: Record<string, string> = {
    'google sheets': 'google_sheets',
    'twitter/x': 'twitter',
    twitter: 'twitter',
  }
  return explicit[key] ?? key.replace(/[\s/]+/g, '_')
}

/** Every distinct app referenced by a workflow's trigger + actions (display names). */
export function workflowApps(workflow: WorkflowJSON): string[] {
  const apps: string[] = []
  if (workflow?.trigger?.app) apps.push(workflow.trigger.app)
  for (const a of workflow?.actions ?? []) if (a?.app) apps.push(a.app)
  // De-dupe by lowercased name while preserving the first display spelling.
  const seen: Record<string, string> = {}
  for (const a of apps) {
    const key = a.trim().toLowerCase()
    if (!(key in seen)) seen[key] = a.trim()
  }
  return Object.values(seen)
}

/**
 * Returns the display names of apps a workflow needs but the user hasn't connected.
 * Apps that don't require auth (Schedule, Webhook, HTTP Request) are skipped.
 *
 * @param workflow         the automation's workflow JSON
 * @param userConnections  platform ids the user has connected (e.g. ["gmail", "slack"])
 */
export function checkRequiredConnections(workflow: WorkflowJSON, userConnections: string[]): string[] {
  const connected = new Set(userConnections.map(c => c.trim().toLowerCase()))
  const missing: string[] = []
  for (const app of workflowApps(workflow)) {
    if (NO_AUTH_APPS.has(app.toLowerCase())) continue
    if (!connected.has(appToPlatform(app))) missing.push(app)
  }
  return missing
}
