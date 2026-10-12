// Shared test helpers: a throwaway project folder (CLAUDE_PROJECT_DIR) whose runs/ the
// hooks and CLIs use, with the repo's committed sample runs as fixtures.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const FIXTURES = {
  library: join(REPO, 'runs', '20261012-2119-async-python-http-client-choice'),
  architecture: join(REPO, 'runs', '20261012-2038-azure-service-bus-event-grid-event'),
};

export function project() {
  const root = mkdtempSync(join(tmpdir(), 'tech-brief-test-'));
  mkdirSync(join(root, 'runs'));
  const env = { ...process.env, CLAUDE_PROJECT_DIR: root };
  const cli = (...args) => JSON.parse(execFileSync('node', [join(REPO, '.claude/scripts/state.mjs'), ...args], { cwd: REPO, env, encoding: 'utf8' }));
  const hook = (script, payload) => spawnSync('node', [join(REPO, '.claude/hooks', script)], { cwd: REPO, env, input: JSON.stringify(payload), encoding: 'utf8' });
  return { root, env, cli, hook, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

// A run inside a test project, with helpers that mimic agents writing through the hooks.
export function run(p, { fixture = 'architecture', fault = null } = {}) {
  const { run_id: id } = p.cli('init', 'test run', ...(fault ? ['--simulate-fault', fault] : []));
  const dir = join(p.root, 'runs', id);
  const src = FIXTURES[fixture];
  const abs = (rel) => join(dir, rel);
  const write = (rel, text, agent) => {
    mkdirSync(dirname(abs(rel)), { recursive: true });
    writeFileSync(abs(rel), text);
    return p.hook('post_tool_state.mjs', {
      tool_name: 'Write', session_id: 'test-session', ...(agent ? { agent_type: agent } : {}),
      tool_input: { file_path: abs(rel) },
    });
  };
  const fixtureText = (rel, from = rel) => readFileSync(join(src, from), 'utf8').replace(/^run_id: .*$/m, `run_id: ${id}`);
  const put = (rel, agent, edit = (t) => t, from = rel) => write(rel, edit(fixtureText(rel, from)), agent);
  const next = () => p.cli('next', id).next;
  const ask = (question, answer, notes) => p.hook('post_tool_state.mjs', {
    tool_name: 'AskUserQuestion', session_id: 'test-session', tool_use_id: 'toolu_test',
    tool_input: { questions: [{ question, options: [] }] },
    tool_response: { answers: { [question]: answer }, annotations: notes ? { [question]: { notes } } : {} },
  });
  const guard = (payload) => p.hook('pre_tool_guard.mjs', { session_id: 'test-session', ...payload }).status;
  const launch = (l) => guard({ tool_name: 'Agent', tool_input: l });
  const read = (rel) => readFileSync(abs(rel), 'utf8');
  const events = () => read('events.jsonl').trim().split('\n').map((l) => JSON.parse(l));
  return { id, dir, abs, write, put, fixtureText, next, ask, guard, launch, read, events };
}

export const setAttempt = (n) => (t) => t.replace(/^attempt: \d+$/m, `attempt: ${n}`);

// A gate report in the validator's format.
export function gateReport(id, stage, round, artifacts, rows) {
  const fail = rows.length > 0;
  return `---\nartifact: gate\nagent: validator\nrun_id: ${id}\nstage: ${stage}\nround: ${round}\nresult: ${fail ? 'fail' : 'pass'}\n---\n`
    + `# Gate report: ${stage}, round ${round}\n\n## Result\n${fail ? 'FAIL' : 'PASS'}\n\n`
    + `## Script gates\n| Artifact | STRUCTURE | CITATIONS |\n|---|---|---|\n${artifacts.map((a) => `| ${a} | pass | pass |`).join('\n')}\n\n`
    + `## Semantic gates\n| Gate | Result | Notes |\n|---|---|---|\n| CURRENCY | pass | - |\n| CONSTRAINT-COVERAGE | ${fail ? 'fail' : 'pass'} | - |\n\n`
    + `## Findings\n${fail ? `| # | Gate | Artifact | Owner | Finding | Fix hint |\n|---|---|---|---|---|---|\n${rows.map((r, i) => `| ${i + 1} | ${r.join(' | ')} |`).join('\n')}` : 'None.'}\n`;
}

// Drives a run from intake to the point where research is next (requirements confirmed, plan written).
export function toResearch(p, r) {
  r.put('00-request.md', null);
  r.put('01-requirements.md', 'requirements-formalizer', setAttempt(1));
  const n = r.next();
  r.ask(n.ask.question, 'Confirm');
  p.cli('plan', r.id);
}
