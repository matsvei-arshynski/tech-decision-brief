// The only module that writes workflow-state.json.
// Used by the PostToolUse hook and by .claude/scripts/state.mjs.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = process.env.CLAUDE_PROJECT_DIR
  ? resolve(process.env.CLAUDE_PROJECT_DIR)
  : resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const RUNS = join(ROOT, 'runs');
export const STATE_FILE = 'workflow-state.json';

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
  renameSync(tmp, file);
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
export function initRun(slug) {
  const base = `${stamp()}-${slugify(slug)}`;
  let runId = base;
  for (let i = 2; existsSync(join(RUNS, runId)); i++) runId = `${base}-${i}`;
  const runDir = join(RUNS, runId);
  mkdirSync(runDir, { recursive: true });
  const now = new Date().toISOString();
  writeState(runDir, {
    schema_version: 1,
    run_id: runId,
    status: 'intake',
    created_at: now,
    retry_limit: 3,
    plan: null,
    artifacts: {},
    gates: {},
    approvals: {},
  });
  return { run_id: runId, run_dir: `runs/${runId}` };
}
