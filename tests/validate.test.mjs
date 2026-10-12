// Script gates (validate.mjs) against the committed sample runs and broken copies of them.
import assert from 'node:assert/strict';
import { cpSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { validateArtifact } from '../.claude/skills/artifact-contract/scripts/validate.mjs';
import { FIXTURES, project, REPO } from './helpers.mjs';

const p = project();
after(() => p.cleanup());

const ARTIFACT = /^(01-requirements\.md|research\/.+\.md|30-brief-draft\.md|final\/decision-brief\.(md|html))$/;

test('every sample run: the script gates agree with the recorded state', () => {
  for (const id of readdirSync(join(REPO, 'runs')).filter((n) => /^\d{8}-/.test(n))) {
    const dir = join(REPO, 'runs', id);
    const state = JSON.parse(readFileSync(join(dir, 'workflow-state.json'), 'utf8'));
    for (const [rel, a] of Object.entries(state.artifacts)) {
      if (!ARTIFACT.test(rel)) continue;
      const v = validateArtifact(join(dir, rel), { runDir: dir, simulateFault: state.simulate_fault });
      // A run that ended blocked keeps its failing artifact; everything else passes.
      assert.equal(v.result === 'fail', a.status === 'invalid', `${id}/${rel}: ${a.status} vs ${JSON.stringify(v.gates)}`);
    }
  }
});

// A writable copy of a fixture run.
function copy(fixture = 'library') {
  const dir = join(p.root, 'runs', `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  cpSync(FIXTURES[fixture], dir, { recursive: true });
  const id = dir.split(/[\\/]/).pop();
  for (const rel of ['01-requirements.md', 'research/11-docs.md', 'research/12-ecosystem.md', '30-brief-draft.md']) {
    const f = join(dir, rel);
    writeFileSync(f, readFileSync(f, 'utf8').replace(/^run_id: .*$/m, `run_id: ${id}`));
  }
  const edit = (rel, fn) => writeFileSync(join(dir, rel), fn(readFileSync(join(dir, rel), 'utf8')));
  const check = (rel, opts = {}) => validateArtifact(join(dir, rel), { runDir: dir, ...opts });
  const findings = (v) => [...v.gates.STRUCTURE.findings, ...v.gates.CITATIONS.findings].join('\n');
  return { dir, edit, check, findings };
}

test('STRUCTURE catches missing sections, wrong totals and unsorted criteria', () => {
  const c = copy();
  c.edit('research/11-docs.md', (t) => t.replace('## Open issues', '## Issues'));
  assert.match(c.findings(c.check('research/11-docs.md')), /missing: Open issues/);
  c.edit('30-brief-draft.md', (t) => t.replace(/\| \*\*Total\*\* \| \| \*\*(\d+)\*\*/, (m, n) => `| **Total** | | **${Number(n) + 1}**`));
  assert.match(c.findings(c.check('30-brief-draft.md')), /Σ weight × score/);
});

test('CITATIONS catches uncited claims, undefined and malformed sources', () => {
  const c = copy();
  c.edit('research/12-ecosystem.md', (t) => t.replace(/^(### .+\n)/m, '$1- An uncited claim.\n- A claim citing a ghost [S99].\n')
    .replace(/^(\[S1\] .+?) — retrieved /m, '$1 — fetched '));
  const f = c.findings(c.check('research/12-ecosystem.md'));
  assert.match(f, /uncited bullet "- An uncited claim\."/);
  assert.match(f, /\[S99\] is cited but not defined/);
  assert.match(f, /wrong format/);
});

test('final Markdown must equal the approved draft', () => {
  const c = copy();
  c.edit('final/decision-brief.md', (t) => t.replace('## 2.', 'Sneaky change.\n\n## 2.'));
  assert.match(c.findings(c.check('final/decision-brief.md')), /differs from the approved draft/);
});

test('simulated faults: attempt 1 only, or every attempt with :always', () => {
  const c = copy();
  const eco = 'research/12-ecosystem.md';
  c.edit(eco, (t) => t.replace(/^attempt: \d+$/m, 'attempt: 1'));
  assert.equal(c.check(eco, { simulateFault: 'CITATIONS:ecosystem' }).result, 'fail');
  assert.equal(c.check('research/11-docs.md', { simulateFault: 'CITATIONS:ecosystem' }).result, 'pass', 'other artifacts unaffected');
  c.edit(eco, (t) => t.replace(/^attempt: \d+$/m, 'attempt: 2'));
  assert.equal(c.check(eco, { simulateFault: 'CITATIONS:ecosystem' }).result, 'pass');
  assert.equal(c.check(eco, { simulateFault: 'CITATIONS:ecosystem:always' }).result, 'fail');
});

test('CRLF line endings validate like LF', () => {
  const c = copy();
  c.edit('research/11-docs.md', (t) => t.replace(/\r?\n/g, '\r\n'));
  assert.equal(c.check('research/11-docs.md').result, 'pass');
});
