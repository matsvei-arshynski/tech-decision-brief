// The only module that writes workflow-state.json.
// Used by the PostToolUse hook and by .claude/scripts/state.mjs.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitFrontMatter, validateArtifact } from '../../skills/artifact-contract/scripts/validate.mjs';

export const ROOT = process.env.CLAUDE_PROJECT_DIR
  ? resolve(process.env.CLAUDE_PROJECT_DIR)
  : resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const RUNS = join(ROOT, 'runs');
export const STATE_FILE = 'workflow-state.json';

// Artifacts that become stale when the key (or anything under a key ending in "/") is rewritten.
const DOWNSTREAM = {
  '01-requirements.md': ['research/', '30-brief-draft.md', 'final/'],
  'research/': ['30-brief-draft.md', 'final/'],
  '30-brief-draft.md': ['final/'],
};
// Artifacts that pass on script gates alone; research and the brief also need a gate report.
const NEEDS_GATE_REPORT = (rel) => rel.startsWith('research/') || rel === '30-brief-draft.md';
// Files the hook records only by hash.
const UNTRACKED = (rel) => rel === STATE_FILE || rel.startsWith('approval/') || rel.endsWith('.tmp');

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

// Hash of file content with CRLF normalised to LF, so a Windows checkout hashes the same.
export function hashContent(text) {
  return createHash('sha256').update(text.replace(/\r\n/g, '\n'), 'utf8').digest('hex');
}

export function hashFile(path) {
  return hashContent(readFileSync(path, 'utf8'));
}

export function readState(runDir) {
  const file = join(runDir, STATE_FILE);
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
}

// Write via temp file + rename so a reader never sees a half-written file.
export function writeState(runDir, state) {
  state.updated_at = new Date().toISOString();
  const file = join(runDir, STATE_FILE);
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(state, null, 2) + '\n');
  for (let i = 0; ; i++) {
    try { renameSync(tmp, file); return; } catch (err) {
      if (i >= 20) throw err; // Windows can briefly lock the target (antivirus, readers)
      sleep(50);
    }
  }
}

// Exclusive section across processes (parallel subagents' hooks). mkdir is atomic on all OSes.
export function withLock(runDir, fn) {
  const lock = join(runDir, '.state.lock');
  const start = Date.now();
  for (;;) {
    try { mkdirSync(lock); break; } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      try { if (Date.now() - statSync(lock).mtimeMs > 15000) rmSync(lock, { recursive: true, force: true }); } catch {}
      if (Date.now() - start > 10000) throw new Error('timed out waiting for the state lock');
      sleep(40);
    }
  }
  try { return fn(); } finally { rmSync(lock, { recursive: true, force: true }); }
}

export function updateState(runDir, fn) {
  return withLock(runDir, () => {
    const state = readState(runDir);
    if (!state) return null;
    fn(state);
    writeState(runDir, state);
    return state;
  });
}

// Maps an absolute path to { runDir, rel } when it lies inside runs/<run-id>/.
export function locate(absPath) {
  const rel = relative(RUNS, resolve(absPath));
  if (!rel || rel.startsWith('..') || resolve(rel) === rel) return null;
  const [runId, ...rest] = rel.split(sep);
  if (!rest.length) return null;
  return { runId, runDir: join(RUNS, runId), rel: rest.join('/') };
}

function stamp(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

export function slugify(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .split('-').slice(0, 6).join('-') || 'run';
}

// Creates runs/<YYYYMMDD-HHMM>-<slug>/ (suffixing -2, -3 … on collision) and its state.
export function initRun(slug, { simulateFault = null } = {}) {
  const base = `${stamp()}-${slugify(slug)}`;
  let runId = base;
  for (let i = 2; existsSync(join(RUNS, runId)); i++) runId = `${base}-${i}`;
  const runDir = join(RUNS, runId);
  mkdirSync(runDir, { recursive: true });
  writeState(runDir, {
    schema_version: 1,
    run_id: runId,
    status: 'intake',
    created_at: new Date().toISOString(),
    retry_limit: 3,
    simulate_fault: simulateFault,
    plan: null,
    artifacts: {},
    gates: {},
    approvals: {},
  });
  return { run_id: runId, run_dir: `runs/${runId}` };
}

function markDownstreamStale(state, rel) {
  const key = rel.startsWith('research/') ? 'research/' : rel;
  for (const prefix of DOWNSTREAM[key] ?? []) {
    for (const [path, a] of Object.entries(state.artifacts)) {
      if (path !== rel && (path === prefix || path.startsWith(prefix)) && a.status !== 'stale') {
        a.status = 'stale';
        a.stale_because = rel;
      }
    }
  }
}

// Called by the PostToolUse hook after any write under runs/<run-id>/.
export function recordWrite(absPath, { agent = null } = {}) {
  const loc = locate(absPath);
  if (!loc || UNTRACKED(loc.rel) || !existsSync(absPath)) return null;
  return updateState(loc.runDir, (state) => {
    const v = validateArtifact(absPath, { runDir: loc.runDir, simulateFault: state.simulate_fault });
    const failed = Object.entries(v.gates).flatMap(([g, r]) => r.findings.map((f) => `${g}: ${f}`));
    const scriptPass = v.result !== 'fail';
    const prev = state.artifacts[loc.rel];
    state.artifacts[loc.rel] = {
      status: !scriptPass ? 'invalid' : NEEDS_GATE_REPORT(loc.rel) ? 'written' : 'valid',
      sha256: hashFile(absPath),
      attempt: v.attempt,
      agent: agent ?? prev?.agent ?? null,
      written_at: new Date().toISOString(),
      script_gates: Object.fromEntries(Object.entries(v.gates).map(([g, r]) => [g, r.result])),
      findings: failed,
    };
    markDownstreamStale(state, loc.rel);
    if (v.type === 'gate') recordGateReport(state, loc.runDir, loc.rel, absPath);
  });
}

// A gate report decides valid/invalid for the artifacts it checked (only if they're unchanged).
function recordGateReport(state, runDir, rel, absPath) {
  const { fm, body } = splitFrontMatter(readFileSync(absPath, 'utf8'));
  const section = (title) => body.split(/\n(?=## )/).find((s) => s.startsWith(`## ${title}`)) ?? '';
  const rows = (text) => text.split('\n').filter((l) => l.trim().startsWith('|'))
    .map((l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim().replace(/`/g, '')))
    .filter((c) => !c.every((x) => /^:?-{2,}:?$/.test(x))).slice(1);
  const checked = rows(section('Script gates')).map((r) => r[0]);
  const flagged = new Set(rows(section('Findings')).map((r) => r[2]));
  const snapshot = {};
  for (const path of checked) {
    const a = state.artifacts[path];
    const file = join(runDir, path);
    if (!a || !existsSync(file)) continue;
    snapshot[path] = a.sha256;
    if (hashFile(file) !== a.sha256) continue; // changed since the hook recorded it
    if (flagged.has(path)) a.status = 'invalid';
    else if (a.findings.length === 0) a.status = 'valid';
  }
  state.gates[rel.replace(/^gates\//, '').replace(/\.md$/, '')] = {
    stage: fm?.stage ?? null,
    round: fm?.round ? Number(fm.round) : null,
    result: fm?.result ?? null,
    report: rel,
    flagged: [...flagged],
    checked: snapshot,
  };
}

// Compact view for the coordinator.
export function summarize(state) {
  const lastGate = {};
  for (const [key, g] of Object.entries(state.gates)) {
    if (!lastGate[g.stage] || (g.round ?? 0) > (lastGate[g.stage].round ?? 0)) lastGate[g.stage] = { key, ...g };
  }
  return {
    run_id: state.run_id,
    status: state.status,
    simulate_fault: state.simulate_fault,
    artifacts: Object.fromEntries(Object.entries(state.artifacts).map(([p, a]) =>
      [p, { status: a.status, attempt: a.attempt, ...(a.findings.length ? { findings: a.findings } : {}), ...(a.stale_because && a.status === 'stale' ? { stale_because: a.stale_because } : {}) }])),
    last_gate: Object.fromEntries(Object.entries(lastGate).map(([s, g]) => [s, { round: g.round, result: g.result, report: g.report }])),
  };
}
