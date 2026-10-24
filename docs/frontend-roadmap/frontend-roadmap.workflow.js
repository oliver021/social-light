export const meta = {
  name: 'frontend-roadmap',
  description: 'Run the frontend roadmap milestones one by one: Haiku implements, Haiku re-runs the gates, Sonnet reviews, Haiku fixes, then commit',
  whenToUse: 'Execute docs/frontend-roadmap milestones (M0.1 … M8) sequentially on the feat/frontend-roadmap branch; run with scriptPath docs/frontend-roadmap/frontend-roadmap.workflow.js',
  phases: [
    { title: 'Setup', detail: 'branch, clean tree, npm ci, baseline gates' },
    { title: 'M0.1', detail: 'Test harness and baseline' },
    { title: 'M0.2', detail: 'Design tokens and a single MUI theme' },
    { title: 'M0.3', detail: 'UI primitives and the layout shell' },
    { title: 'M0.4', detail: 'Visual quality pass (parallel parts)' },
    { title: 'M1', detail: 'Content ownership: delete and dismiss' },
    { title: 'M2', detail: 'Other people\'s profiles' },
    { title: 'M3', detail: 'Richer posting and conversations' },
    { title: 'M4', detail: 'Social graph: friends, blocks, mutes' },
    { title: 'M5', detail: 'Stories, groups and events, completed' },
    { title: 'M6', detail: 'Messenger, completed' },
    { title: 'M7', detail: 'Marketplace: full catalog and semantic search' },
    { title: 'M8', detail: 'Organizations' },
  ],
}

// ---------------------------------------------------------------------------
// Configuration. Models: implementation, gates, fixes and commits on Haiku (as the
// roadmap asks); the review on a stronger model (see TESTING-AND-REVIEW.md §3 for why).
// Set REVIEW_MODEL to 'haiku' to run everything on Haiku.
// ---------------------------------------------------------------------------
const IMPL_MODEL = 'haiku'
const REVIEW_MODEL = 'sonnet'
const BRANCH = 'feat/frontend-roadmap'
const DOCS = 'docs/frontend-roadmap'

const MILESTONES = [
  { id: 'M0.1', title: 'Test harness and baseline', file: 'M0.1-test-harness.md' },
  { id: 'M0.2', title: 'Design tokens and a single MUI theme', file: 'M0.2-tokens-theme.md' },
  { id: 'M0.3', title: 'UI primitives and the layout shell', file: 'M0.3-primitives-layout.md' },
  {
    id: 'M0.4', title: 'Visual quality pass over every tab', file: 'M0.4-visual-pass.md', checkpoint: true,
    // P1–P4 run in parallel (disjoint files); P0 runs after them and enables the rule.
    parts: ['P1', 'P2', 'P3', 'P4'], finalPart: 'P0',
  },
  { id: 'M1', title: 'Content ownership: delete and dismiss', file: 'M1-content-ownership.md' },
  { id: 'M2', title: 'Other people\'s profiles', file: 'M2-profiles.md' },
  { id: 'M3', title: 'Richer posting and conversations', file: 'M3-rich-posting.md' },
  { id: 'M4', title: 'Social graph: friends, blocks, mutes', file: 'M4-social-graph.md', checkpoint: true },
  { id: 'M5', title: 'Stories, groups and events, completed', file: 'M5-stories-groups-events.md' },
  { id: 'M6', title: 'Messenger, completed', file: 'M6-messenger.md' },
  { id: 'M7', title: 'Marketplace: full catalog and semantic search', file: 'M7-marketplace.md' },
  { id: 'M8', title: 'Organizations', file: 'M8-organizations.md', checkpoint: true },
]

const opts = args || {}
const maxFixRounds = Number.isInteger(opts.maxFixRounds) ? opts.maxFixRounds : 2
const stopAtCheckpoints = opts.stopAtCheckpoints !== false

let selected = MILESTONES
if (opts.from) {
  const i = MILESTONES.findIndex(m => m.id === opts.from)
  if (i < 0) throw new Error(`Unknown milestone in "from": ${opts.from}`)
  selected = MILESTONES.slice(i)
}
if (Array.isArray(opts.only) && opts.only.length) {
  selected = selected.filter(m => opts.only.includes(m.id))
}
log(`Milestones to run: ${selected.map(m => m.id).join(', ')} (max ${maxFixRounds} fix rounds each)`)

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------
const SETUP_SCHEMA = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    branch: { type: 'string' },
    headSha: { type: 'string' },
    notes: { type: 'string' },
  },
  required: ['ok', 'branch', 'headSha', 'notes'],
}

const IMPL_SCHEMA = {
  type: 'object',
  properties: {
    done: { type: 'boolean', description: 'true only if every acceptance item is met and your own gate run was green' },
    filesChanged: { type: 'array', items: { type: 'string' }, description: 'path — one-line reason' },
    testsAdded: { type: 'array', items: { type: 'string' } },
    gateSummary: { type: 'string', description: 'tail of each gate command you ran' },
    notDone: { type: 'array', items: { type: 'string' }, description: 'anything not done, with the reason' },
  },
  required: ['done', 'filesChanged', 'testsAdded', 'gateSummary', 'notDone'],
}

const GATES_SCHEMA = {
  type: 'object',
  properties: {
    allGreen: { type: 'boolean' },
    gates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          ok: { type: 'boolean' },
          outputTail: { type: 'string', description: 'last ~40 lines of output, verbatim' },
        },
        required: ['name', 'ok', 'outputTail'],
      },
    },
  },
  required: ['allGreen', 'gates'],
}

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    approved: { type: 'boolean' },
    blocking: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          rule: { type: 'string', description: 'R1…R8 from the rubric' },
          file: { type: 'string' },
          line: { type: 'integer' },
          issue: { type: 'string' },
          fix: { type: 'string', description: 'what must change' },
        },
        required: ['rule', 'file', 'line', 'issue', 'fix'],
      },
    },
    nonBlocking: { type: 'array', items: { type: 'string' } },
    acceptanceChecklist: {
      type: 'array',
      items: {
        type: 'object',
        properties: { item: { type: 'string' }, met: { type: 'boolean' }, evidence: { type: 'string' } },
        required: ['item', 'met', 'evidence'],
      },
    },
  },
  required: ['approved', 'blocking', 'nonBlocking', 'acceptanceChecklist'],
}

const COMMIT_SCHEMA = {
  type: 'object',
  properties: {
    committed: { type: 'boolean' },
    sha: { type: 'string' },
    reason: { type: 'string' },
  },
  required: ['committed', 'sha', 'reason'],
}

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------
const COMMON = `You work in the socialLight repo (repo root = current directory). The web app is src/main_fronted.
Read these files first and follow them exactly:
- ${DOCS}/README.md (ground rules — especially: no git commit/push/stash/reset/checkout/clean, no new npm deps except those M0.1 lists, only edit allowed paths)
- ${DOCS}/TESTING-AND-REVIEW.md (test layers, gates, rubric)`

function implementPrompt(m, part) {
  const partText = part
    ? `\nYou implement ONLY part ${part} of this milestone (see the "Parts" table in the blueprint). Touch only the files listed for ${part}. Other parts are being done by other agents at the same time in the same working tree: never edit, revert or reformat files outside your part.${part === m.finalPart ? ' You are the final part: the other parts are finished; also do the "P0 finishes by" steps.' : ''}`
    : ''
  const gateText = part
    ? 'Then, for your files, run from src/main_fronted: npx tsc --noEmit and npx vitest run, and fix what fails. Do NOT run vite build (parallel parts would collide on dist/); the full gates run after all parts.'
    : 'Then run the gates of TESTING-AND-REVIEW.md §2 yourself (from src/main_fronted: npx tsc --noEmit; npx vite build; npx vitest run; npm run check:rules — and the scope check from the repo root) and fix what fails before you report.'
  return `${COMMON}
- ${DOCS}/blueprints/${m.file} (your task: milestone ${m.id} — ${m.title})
${partText}
Implement the blueprint completely, including its tests. ${gateText}
If something in the blueprint is impossible as written (an API shape differs, a file is not where it says), do the closest correct thing, and list it in notDone with the reason. Never fake a backend feature in the UI to satisfy a blueprint line.
Return the structured report. Do not claim a gate passed unless you ran it and saw it pass.`
}

function gatesPrompt(m) {
  return `${COMMON}
You are the independent gate runner for milestone ${m.id}. Do NOT edit any file. Run, and report each separately with the verbatim tail of its output:
1. cd src/main_fronted && npx tsc --noEmit   (ok = exit 0 and no "error TS")
2. cd src/main_fronted && npx vite build      (ok = exit 0)
3. cd src/main_fronted && npx vitest run      (ok = exit 0 and at least one test ran)
4. cd src/main_fronted && npm run check:rules (ok = exit 0)
5. From the repo root, the scope check: git status --porcelain | grep -vE '^.. (src/main_fronted/|e2e-web/|playwright\\.web\\.config\\.ts|${DOCS}/)'   (ok = prints nothing)
6. If playwright.web.config.ts exists: npx playwright test -c playwright.web.config.ts --list   (ok = exit 0)
If a command does not exist yet (e.g. no vitest before M0.1 landed), report ok=false with the output — that is a real failure for any milestone from M0.1 on.
allGreen = every reported gate ok.`
}

function reviewPrompt(m, implReport) {
  return `${COMMON}
- ${DOCS}/blueprints/${m.file} (the milestone under review: ${m.id} — ${m.title})

You are the reviewer. You did not write this code. Do NOT edit any file.
Review the uncommitted changes of this milestone: run \`git status --porcelain\`, \`git diff HEAD\`, and read every untracked file it lists. HEAD is the previous approved milestone.
Check every item of the blueprint's Acceptance list and every rule R1–R8 of TESTING-AND-REVIEW.md §4. Read the tests: a test that asserts nothing, or that mocks the very hook it claims to test, does not count.
Pay special attention to: errors swallowed or success shown before a 2xx (R2); owner-only controls visible to others, or another user's id sent in a JWT-bound field (R3); calls that bypass the typed clients or hit endpoints the blueprint did not list (R4); hex colours / raw palette classes / re-implemented primitives (R5).
The gates are already green (an independent agent ran them); do not re-run the full build unless you need evidence.
The implementer's own report, for context only (it is a claim, not evidence):
${JSON.stringify(implReport ?? {}, null, 2)}
Approve only if there are no blocking items. Every blocking item needs file, line, the rule, and the concrete fix.`
}

function fixPrompt(m, problems) {
  return `${COMMON}
- ${DOCS}/blueprints/${m.file} (milestone ${m.id} — ${m.title})

The milestone was rejected. Fix exactly these problems, nothing else (no refactors, no unrelated cleanups):
${JSON.stringify(problems, null, 2)}
Then run the gates of TESTING-AND-REVIEW.md §2 yourself and make them green. Return the structured report.`
}

function commitPrompt(m) {
  return `You commit an approved milestone in the socialLight repo (repo root = current directory). Steps:
1. Confirm the current branch is ${BRANCH} (\`git branch --show-current\`). If not, do not commit: return committed=false with the reason.
2. Run the scope check: git status --porcelain | grep -vE '^.. (src/main_fronted/|e2e-web/|playwright\\.web\\.config\\.ts|${DOCS}/)' — if it prints anything, do not commit; return committed=false listing those paths.
3. Stage only the allowed paths: git add -A src/main_fronted e2e-web ${DOCS} and, if it exists, playwright.web.config.ts. Never stage node_modules or dist (they are git-ignored; if \`git status\` shows them, stop and report).
4. Commit with this exact message (use a heredoc so the lines are kept):
feat(web): ${m.id} ${m.title}

Implements ${DOCS}/blueprints/${m.file}.
Gates green (tsc, vite build, vitest, check:rules); reviewed and approved.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
5. Return committed=true and the new short sha (\`git rev-parse --short HEAD\`). Never push.`
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
phase('Setup')
const setup = await agent(`You prepare the socialLight repo (repo root = current directory) for an automated, milestone-by-milestone frontend run. Do not edit source files.
1. \`git status --porcelain\`. Allowed to be dirty: only ${DOCS}/ (the roadmap itself). Anything else dirty → return ok=false listing it (do not stash, reset or clean).
2. If the current branch is not ${BRANCH}: if ${BRANCH} exists, \`git switch ${BRANCH}\`; else \`git switch -c ${BRANCH}\`. (Switching keeps the untracked roadmap files.)
3. If ${DOCS}/ is untracked or modified, commit it alone: git add ${DOCS} && git commit with message "docs: frontend roadmap, blueprints and workflow" followed by a blank line and "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>".
4. npm ci in the repo root (installs @playwright/test for the smoke-spec --list gate; do not install browsers) and npm ci in src/main_fronted. If either fails → ok=false with the output tail.
5. cd src/main_fronted && npx tsc --noEmit — record the error count in notes (baseline; expected 0).
Return ok, the branch, \`git rev-parse --short HEAD\`, and notes.`, { label: 'setup', phase: 'Setup', model: IMPL_MODEL, effort: 'low', schema: SETUP_SCHEMA })

if (!setup || !setup.ok) {
  return { status: 'stopped', at: 'Setup', setup }
}
log(`Setup OK on ${setup.branch} @ ${setup.headSha}. ${setup.notes}`)

// ---------------------------------------------------------------------------
// Milestones, strictly one after another
// ---------------------------------------------------------------------------
const results = []

for (const m of selected) {
  phase(m.id)
  log(`${m.id} — ${m.title}: implementing`)

  // 1. Implement (parallel parts for M0.4, then the final part).
  let implReport
  if (m.parts) {
    const partReports = await parallel(m.parts.map(p => () =>
      agent(implementPrompt(m, p), { label: `${m.id} implement ${p}`, phase: m.id, model: IMPL_MODEL, schema: IMPL_SCHEMA })))
    const finalReport = await agent(implementPrompt(m, m.finalPart),
      { label: `${m.id} implement ${m.finalPart}`, phase: m.id, model: IMPL_MODEL, schema: IMPL_SCHEMA })
    const all = [...partReports, finalReport]
    implReport = {
      done: all.every(r => r && r.done),
      filesChanged: all.filter(Boolean).flatMap(r => r.filesChanged),
      testsAdded: all.filter(Boolean).flatMap(r => r.testsAdded),
      gateSummary: all.filter(Boolean).map(r => r.gateSummary).join('\n---\n'),
      notDone: all.flatMap((r, i) => r ? r.notDone : [`part ${[...m.parts, m.finalPart][i]} agent did not return`]),
    }
  } else {
    implReport = await agent(implementPrompt(m), { label: `${m.id} implement`, phase: m.id, model: IMPL_MODEL, schema: IMPL_SCHEMA })
  }
  if (!implReport) {
    results.push({ id: m.id, status: 'stopped', reason: 'implementer did not return' })
    break
  }

  // 2. Gates → review → fix, until approved or out of rounds.
  let approved = false
  let review = null
  let gates = null
  let round = 0
  while (true) {
    gates = await agent(gatesPrompt(m), { label: `${m.id} gates r${round}`, phase: m.id, model: IMPL_MODEL, effort: 'low', schema: GATES_SCHEMA })
    const failedGates = gates ? gates.gates.filter(g => !g.ok) : [{ name: 'gate runner', ok: false, outputTail: 'gate agent did not return' }]

    if (gates && gates.allGreen) {
      review = await agent(reviewPrompt(m, implReport), { label: `${m.id} review r${round}`, phase: m.id, model: REVIEW_MODEL, effort: 'high', schema: REVIEW_SCHEMA })
      if (review && review.approved && review.blocking.length === 0) { approved = true; break }
    } else {
      review = null
    }

    if (round >= maxFixRounds) break
    round++
    const problems = review
      ? { blocking: review.blocking, unmetAcceptance: review.acceptanceChecklist.filter(a => !a.met) }
      : { failedGates }
    log(`${m.id}: round ${round} fix — ${review ? `${review.blocking.length} blocking review items` : `${failedGates.length} failed gates`}`)
    const fixReport = await agent(fixPrompt(m, problems), { label: `${m.id} fix r${round}`, phase: m.id, model: IMPL_MODEL, schema: IMPL_SCHEMA })
    if (fixReport) {
      implReport = {
        ...implReport,
        filesChanged: [...implReport.filesChanged, ...fixReport.filesChanged],
        testsAdded: [...implReport.testsAdded, ...fixReport.testsAdded],
        gateSummary: fixReport.gateSummary,
        notDone: fixReport.notDone,
      }
    }
  }

  if (!approved) {
    results.push({
      id: m.id, status: 'rejected', rounds: round,
      failedGates: gates ? gates.gates.filter(g => !g.ok) : null,
      blocking: review ? review.blocking : null,
      notDone: implReport.notDone,
    })
    log(`${m.id} still rejected after ${round} fix rounds — stopping so the next milestone does not build on it. Changes are left uncommitted for inspection.`)
    break
  }

  // 3. Commit the approved milestone.
  const commit = await agent(commitPrompt(m), { label: `${m.id} commit`, phase: m.id, model: IMPL_MODEL, effort: 'low', schema: COMMIT_SCHEMA })
  if (!commit || !commit.committed) {
    results.push({ id: m.id, status: 'approved-not-committed', reason: commit ? commit.reason : 'commit agent did not return' })
    break
  }
  results.push({
    id: m.id, status: 'committed', sha: commit.sha, fixRounds: round,
    nonBlocking: review.nonBlocking, notDone: implReport.notDone, testsAdded: implReport.testsAdded.length,
  })
  log(`${m.id} committed as ${commit.sha} after ${round} fix round(s)`)

  if (m.checkpoint && stopAtCheckpoints) {
    const next = MILESTONES[MILESTONES.findIndex(x => x.id === m.id) + 1]
    log(`Human checkpoint after ${m.id} (TESTING-AND-REVIEW.md §5). Pausing.${next ? ` Resume with args { "from": "${next.id}" }.` : ''}`)
    results.push({ id: m.id, status: 'checkpoint', resumeFrom: next ? next.id : null })
    break
  }
}

return { branch: BRANCH, setup, results }
