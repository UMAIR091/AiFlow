/** Live test of the self-validating parse pipeline. Hits the local dev server. */
const CASES = [
  {
    name: 'CASE 1 — canonical 3-step form flow',
    description:
      'When someone submits my Google Form, add their name and email to my Google Sheet in the Responses sheet, then send them a confirmation email to their submitted email address',
  },
  {
    name: 'CASE 2 — tricky: schedule + condition + delay + 2 apps',
    description:
      'Every morning at 8am check my Gmail inbox, and only if an email subject contains Invoice, save the sender address to my Google Sheet, then wait 10 seconds, then post a summary message to the #finance channel in Slack',
  },
  {
    name: 'CASE 3 — minimal: simple email, no trigger app named',
    description: 'Send an email to umairlodhi091@gmail.com with subject AutoFlow Test and body Hello this is a test',
  },
]

for (const c of CASES) {
  const t0 = Date.now()
  try {
    const res = await fetch('http://localhost:3000/api/parse-automation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: c.description }),
    })
    const data = await res.json()
    const secs = ((Date.now() - t0) / 1000).toFixed(1)
    if (data.error) {
      console.log(`\n${c.name}\n  ERROR (${secs}s): ${data.error}`)
      continue
    }
    const w = data.workflow
    console.log(`\n${c.name}  (${secs}s)`)
    console.log(`  trigger   : ${w.trigger.app} / ${w.trigger.event}`)
    console.log(`  actions   : ${w.actions.map(a => `${a.app}:${a.action}`).join(' → ')}`)
    console.log(`  conditions: ${w.conditions.length ? w.conditions.map(x => `${x.field} ${x.operator} "${x.value}"`).join('; ') : '(none)'}`)
    console.log(`  nodes     : ${1 + w.actions.length} | name: "${w.suggested_name}"`)
    console.log(`  quality   : repaired=${data.quality?.repaired} remaining_issues=${JSON.stringify(data.quality?.remaining_issues)}`)
    for (const a of w.actions) {
      console.log(`    · ${a.id} [${a.app}] settings=${JSON.stringify(a.settings)} config_fields=${JSON.stringify(a.config_fields)}`)
    }
  } catch (e) {
    console.log(`\n${c.name}\n  FETCH FAILED: ${e.message}`)
  }
}
