// Workflow engine, hooks and guards, end to end through the real CLIs and hook scripts.
// Run with: node --test
import assert from 'node:assert/strict';
import { existsSync, readFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { gateReport, project, REPO, run, setAttempt, toResearch } from './helpers.mjs';

const p = project();
after(() => p.cleanup());

const RESEARCH_ARCH = ['research/11-docs.md', 'research/14-patterns.md'];
const RESEARCH_LIB = ['research/11-docs.md', 'research/12-ecosystem.md'];

// Research written and gate-passed, brief written and gate-passed: approval is next.
function toApproval(r, research = RESEARCH_ARCH) {
  toResearch(p, r);
  for (const f of research) r.put(f, null, setAttempt(1));
  r.write('gates/research.r1.md', gateReport(r.id, 'research', 1, research, []), 'validator');
  r.put('30-brief-draft.md', 'brief-synthesizer', setAttempt(1));
  r.write('gates/brief.r1.md', gateReport(r.id, 'brief', 1, ['30-brief-draft.md'], []), 'validator');
}

test('engine computes exact launches, and the launch guard accepts only those', () => {
  const r = run(p);
  assert.equal(r.next().stage, 'intake');
  r.put('00-request.md', null);
  const n = r.next();
  assert.equal(n.stage, 'requirements');
  assert.deepEqual(n.launch, [{ subagent_type: 'requirements-formalizer', prompt: `Run folder: runs/${r.id}\nAttempt: 1\nTask: write` }]);
  assert.equal(r.launch({ ...n.launch[0], prompt: n.launch[0].prompt.replace('Attempt: 1', 'Attempt: 2') }), 2, 'wrong attempt');
  assert.equal(r.launch({ ...n.launch[0], subagent_type: 'docs-researcher' }), 2, 'wrong agent');
  assert.equal(r.launch({ subagent_type: 'Explore', prompt: 'find files' }), 0, 'non-workflow launch');
  assert.equal(r.launch(n.launch[0]), 0, 'exact launch');
  const state = JSON.parse(r.read('workflow-state.json'));
  assert.equal(state.launches.length, 1, 'allowed launch is recorded');
  assert.equal(state.launches[0].agent, 'requirements-formalizer');
});

test('Q&A, change request with follow-up feedback, confirmation, plan by question type', () => {
  const r = run(p);
  r.put('00-request.md', null);
  r.put('01-requirements.md', 'requirements-formalizer', (t) => setAttempt(1)(t).replace(/## Open questions\n[\s\S]*$/, '## Open questions\n1. Which region? — options: EU | US\n'));
  assert.equal(r.next().stage, 'questions');
  r.write('00-request.md', `${r.read('00-request.md')}\n- **Q:** Which region?\n  **A:** EU\n`);
  assert.match(r.next().launch[0].prompt, /Attempt: 2\nTask: revise/);
  r.put('01-requirements.md', 'requirements-formalizer', setAttempt(2));
  let n = r.next();
  assert.equal(n.stage, 'confirm-requirements');
  r.ask(n.ask.question, 'Change');
  n = r.next();
  assert.equal(n.stage, 'feedback');
  r.ask(n.ask.question, 'Also compare Kafka');
  n = r.next();
  assert.deepEqual([n.stage, n.feedback], ['append-change-request', 'Also compare Kafka']);
  r.write('00-request.md', `${r.read('00-request.md')}- **Change request:** Also compare Kafka\n`);
  assert.match(r.next().launch[0].prompt, /Attempt: 3/);
  r.put('01-requirements.md', 'requirements-formalizer', setAttempt(3));
  n = r.next();
  r.ask(n.ask.question.replace(/req=[0-9a-f]{8}/, 'req=deadbeef'), 'Confirm');
  assert.equal(r.next().stage, 'confirm-requirements', 'a confirmation for another file version is not accepted');
  r.ask(n.ask.question, 'Confirm');
  assert.equal(r.next().stage, 'plan');
  assert.deepEqual(p.cli('plan', r.id).research, RESEARCH_ARCH);
});

test('targeted retry re-runs only the flagged owner; a research gap found at the brief stage goes back to research', () => {
  const r = run(p);
  toResearch(p, r);
  let n = r.next();
  assert.deepEqual(n.launch.map((l) => l.subagent_type), ['docs-researcher', 'patterns-researcher']);
  r.put('research/11-docs.md', 'docs-researcher', setAttempt(1));
  n = r.next();
  assert.deepEqual(n.launch.map((l) => l.subagent_type), ['patterns-researcher'], 'interrupted group: only the missing agent');
  r.put('research/14-patterns.md', 'patterns-researcher', setAttempt(1));
  n = r.next();
  assert.equal(n.launch[0].prompt, `Run folder: runs/${r.id}\nStage: research\nRound: 1\nReport: gates/research.r1.md\nArtifacts: ${RESEARCH_ARCH.join(', ')}\nQuestion type: architecture`);
  r.write('gates/research.r1.md', gateReport(r.id, 'research', 1, RESEARCH_ARCH, [['CURRENCY', 'research/14-patterns.md (Findings)', 'patterns-researcher', 'Tier limits missing.', 'Cite them.']]), 'validator');
  n = r.next();
  assert.deepEqual(n.launch.map((l) => l.subagent_type), ['patterns-researcher']);
  assert.match(n.launch[0].prompt, /Attempt: 2\nTask: revise\nFindings to fix:\n- \[CURRENCY\] Tier limits missing\. Fix: Cite them\./);
  r.put('research/14-patterns.md', 'patterns-researcher', setAttempt(2));
  assert.equal(r.next().round, 2);
  r.write('gates/research.r2.md', gateReport(r.id, 'research', 2, RESEARCH_ARCH, []), 'validator');
  assert.equal(r.next().stage, 'synthesis');
  r.put('30-brief-draft.md', 'brief-synthesizer', setAttempt(1));
  r.write('gates/brief.r1.md', gateReport(r.id, 'brief', 1, ['30-brief-draft.md'], [['CONSTRAINT-COVERAGE', '30-brief-draft.md', 'docs-researcher', 'No research finding on cost.', 'Research it.']]), 'validator');
  n = r.next();
  assert.deepEqual([n.stage, n.launch[0].subagent_type], ['research-gate', 'docs-researcher']);
  r.put('research/11-docs.md', 'docs-researcher', setAttempt(2));
  r.write('gates/research.r3.md', gateReport(r.id, 'research', 3, RESEARCH_ARCH, []), 'validator');
  n = r.next();
  assert.equal(n.stage, 'synthesis');
  assert.match(n.launch[0].prompt, /Task: revise[\s\S]*Research changed/, 'the brief is refreshed after the research changed');
});

test('approval is hash-bound: guard, reject with feedback, revise, approve, hand edit voids it', () => {
  const r = run(p);
  toApproval(r);
  let n = r.next();
  assert.match(n.ask.question, new RegExp(`^\\[tech-brief:approve run=${r.id} draft=[0-9a-f]{8}\\]`));
  const finalWrite = { tool_name: 'Write', agent_type: 'brief-renderer', tool_input: { file_path: r.abs('final/decision-brief.md') } };
  assert.equal(r.guard(finalWrite), 2, 'final/ blocked before approval');
  r.ask(n.ask.question, 'Reject');
  n = r.next();
  assert.equal(n.stage, 'feedback');
  r.ask(n.ask.question, 'Shorter risks section');
  n = r.next();
  assert.equal(n.stage, 'revise-from-feedback');
  assert.match(n.launch[0].prompt, /Feedback: Shorter risks section$/);
  const record = JSON.parse(r.read('approval/brief.r1.json'));
  assert.deepEqual([record.decision, record.feedback], ['rejected', 'Shorter risks section']);
  r.put('30-brief-draft.md', 'brief-synthesizer', (t) => setAttempt(2)(t).replace('## 2. Context', 'Edited.\n\n## 2. Context'));
  n = r.next();
  assert.deepEqual([n.stage, n.round, n.rounds_left], ['brief-gate', 2, 4], 'feedback starts a fresh gate pass');
  r.write('gates/brief.r2.md', gateReport(r.id, 'brief', 2, ['30-brief-draft.md'], []), 'validator');
  n = r.next();
  r.ask(n.ask.question, 'Approve');
  assert.equal(r.next().stage, 'render');
  assert.equal(r.guard(finalWrite), 0, 'final/ allowed after approval');
  appendFileSync(r.abs('30-brief-draft.md'), '\nhand edit\n');
  const plan = p.cli('next', r.id);
  assert.deepEqual(plan.changes.map((c) => c.artifact), ['30-brief-draft.md']);
  assert.equal(plan.next.stage, 'brief-gate', 'the edit is kept and re-checked');
  assert.equal(r.guard(finalWrite), 2, 'approval no longer matches the draft');
});

test('render completes the run; the final Markdown must equal the approved draft', () => {
  const r = run(p);
  toApproval(r);
  r.ask(r.next().ask.question, 'Approve');
  r.write('final/decision-brief.md', r.read('30-brief-draft.md').replace(/^---[\s\S]*?\n---\n/, ''), 'brief-renderer');
  r.put('final/decision-brief.html', 'brief-renderer');
  const n = r.next();
  assert.equal(n.stage, 'done');
  assert.equal(JSON.parse(r.read('workflow-state.json')).status, 'done');
});

test('a gate pass blocks after 4 failed rounds; a change request unblocks', () => {
  const r = run(p);
  toApproval(r);
  r.put('30-brief-draft.md', 'brief-synthesizer', (t) => setAttempt(2)(t).replace('## 2. Context', 'New draft.\n\n## 2. Context'));
  for (let round = 2; round <= 5; round++) {
    let n = r.next();
    if (n.step === 'retry') {
      r.write('30-brief-draft.md', `${setAttempt(round)(r.read('30-brief-draft.md'))}\n<!-- ${round} -->\n`, 'brief-synthesizer');
      n = r.next();
    }
    r.write(`gates/brief.r${n.round}.md`, gateReport(r.id, 'brief', n.round, ['30-brief-draft.md'], [['CONSTRAINT-COVERAGE', '30-brief-draft.md', 'brief-synthesizer', 'Violates H1.', 'Fix.']]), 'validator');
  }
  const n = r.next();
  assert.equal(n.stage, 'blocked');
  assert.match(r.read('gates/UNRESOLVED.md'), /Violates H1\./);
  assert.equal(r.launch({ subagent_type: 'brief-synthesizer', prompt: `Run folder: runs/${r.id}\nAttempt: 9\nTask: revise` }), 2, 'no launches while blocked');
  r.write('00-request.md', `${r.read('00-request.md')}- **Change request:** Drop H1\n`);
  assert.equal(r.next().stage, 'requirements');
});

test('retry limit: requirements that keep failing the script gates end blocked', () => {
  const r = run(p);
  r.put('00-request.md', null);
  const broken = (n) => (t) => setAttempt(n)(t).replace('## Context', '## Background');
  for (let attempt = 1; attempt <= 4; attempt++) {
    const n = r.next();
    assert.equal(n.stage, 'requirements', `attempt ${attempt} is launched`);
    assert.equal(r.launch(n.launch[0]), 0);
    r.put('01-requirements.md', 'requirements-formalizer', broken(attempt));
  }
  const n = r.next();
  assert.equal(n.stage, 'blocked');
  assert.match(n.reason, /after 3 retries/);
});

test('retry limit: rendering that keeps failing ends blocked', () => {
  const r = run(p);
  toApproval(r);
  r.ask(r.next().ask.question, 'Approve');
  for (let attempt = 1; attempt <= 4; attempt++) {
    const n = r.next();
    assert.equal(n.stage, 'render');
    assert.match(n.launch[0].prompt, new RegExp(`Attempt: ${attempt}`));
    assert.equal(r.launch(n.launch[0]), 0);
    r.write('final/decision-brief.md', '# not the brief\n', 'brief-renderer');
  }
  const n = r.next();
  assert.equal(n.stage, 'blocked');
  assert.match(n.reason, /after 4 render attempts/);
});

test('--simulate-fault …:always fails every attempt, so the run ends blocked', () => {
  const r = run(p, { fixture: 'library', fault: 'CITATIONS:ecosystem:always' });
  toResearch(p, r);
  r.put('research/11-docs.md', 'docs-researcher', setAttempt(1));
  r.put('research/12-ecosystem.md', 'ecosystem-researcher', setAttempt(1));
  for (let attempt = 1; attempt <= 4; attempt++) {
    const state = JSON.parse(r.read('workflow-state.json'));
    assert.match(state.artifacts['research/12-ecosystem.md'].findings.join(), /\[injected\]/, `attempt ${attempt} fails`);
    const n = r.next();
    assert.equal(n.stage, 'research-gate');
    r.write(`gates/research.r${n.round}.md`, gateReport(r.id, 'research', n.round, RESEARCH_LIB, [['CITATIONS', 'research/12-ecosystem.md', 'ecosystem-researcher', 'injected failure', 'Re-run.']]), 'validator');
    const retry = r.next();
    if (retry.stage === 'blocked') break;
    assert.deepEqual(retry.launch.map((l) => l.subagent_type), ['ecosystem-researcher']);
    r.put('research/12-ecosystem.md', 'ecosystem-researcher', setAttempt(attempt + 1));
  }
  const n = r.next();
  assert.equal(n.stage, 'blocked');
  assert.ok(existsSync(r.abs('gates/UNRESOLVED.md')));
});

test('write-time feedback goes back to the writer, except an injected fault', () => {
  const r = run(p, { fixture: 'library', fault: 'CITATIONS:ecosystem' });
  toResearch(p, r);
  const bad = r.put('research/11-docs.md', 'docs-researcher', (t) => setAttempt(1)(t).replace('## Open issues', '## Issues'));
  const out = JSON.parse(bad.stdout);
  assert.equal(out.decision, 'block');
  assert.match(out.reason, /Open issues/);
  assert.equal(r.put('research/11-docs.md', 'docs-researcher', setAttempt(1)).stdout, '', 'clean write: no feedback');
  assert.equal(r.put('research/12-ecosystem.md', 'ecosystem-researcher', setAttempt(1)).stdout, '', 'injected fault is not handed back');
});

test('ownership guard: each writer only its own artifact', () => {
  const r = run(p);
  const w = (agent, rel) => r.guard({ tool_name: 'Write', ...(agent ? { agent_type: agent } : {}), tool_input: { file_path: r.abs(rel) } });
  assert.equal(w(null, '00-request.md'), 0);
  assert.equal(w(null, '01-requirements.md'), 2, 'main session can not write requirements');
  assert.equal(w('docs-researcher', 'research/11-docs.md'), 0);
  assert.equal(w('docs-researcher', 'research/12-ecosystem.md'), 2);
  assert.equal(w('brief-synthesizer', 'research/11-docs.md'), 2);
  assert.equal(w('validator', 'gates/research.r1.md'), 0);
  assert.equal(w('validator', 'gates/UNRESOLVED.md'), 2);
  assert.equal(w('Explore', '30-brief-draft.md'), 2);
  assert.equal(w('docs-researcher', 'approval/brief.r1.json'), 2);
  assert.equal(w(null, 'events.jsonl'), 2);
  assert.equal(r.guard({ tool_name: 'Write', tool_input: { file_path: join(p.root, 'notes.md') } }), 0, 'outside runs/');
});

test('shell guard: Bash and PowerShell may not touch protected or final paths', () => {
  const r = run(p);
  const sh = (tool, command) => r.guard({ tool_name: tool, tool_input: { command } });
  const blocked = [
    ['Bash', `cd runs/${r.id} && echo x > final/a.md`],
    ['Bash', `node .claude/scripts/state.mjs status ${r.id} && echo x > runs/${r.id}/final/a.md`],
    ['Bash', `node -e "require('fs').writeFileSync('runs/${r.id}/final/a.md','x')"`],
    ['Bash', `rm runs/${r.id}/workflow-state.json`],
    ['Bash', `echo {} > runs/${r.id}/events.jsonl`],
    ['PowerShell', `Set-Content runs\\${r.id}\\approval\\brief.r1.json '{}'`],
    ['PowerShell', `Remove-Item runs\\${r.id}\\final -Recurse`],
  ];
  for (const [tool, cmd] of blocked) assert.equal(sh(tool, cmd), 2, cmd);
  const allowed = [
    ['Bash', `node .claude/scripts/state.mjs next ${r.id}`],
    ['Bash', `node .claude/skills/artifact-contract/scripts/validate.mjs runs/${r.id}/final/decision-brief.md`],
    ['Bash', 'git status'],
    ['PowerShell', 'Get-ChildItem runs'],
  ];
  for (const [tool, cmd] of allowed) assert.equal(sh(tool, cmd), 0, cmd);
});

test('events.jsonl records init, decisions, launches, writes, gates, approvals and guard blocks', () => {
  const r = run(p);
  r.put('00-request.md', null);
  const n = r.next();
  r.launch(n.launch[0]);
  r.launch({ ...n.launch[0], subagent_type: 'docs-researcher' });
  r.put('01-requirements.md', 'requirements-formalizer', setAttempt(1));
  r.ask(r.next().ask.question, 'Confirm');
  r.write('gates/research.r1.md', gateReport(r.id, 'research', 1, RESEARCH_ARCH, []), 'validator');
  const types = new Set(r.events().map((e) => e.type));
  for (const t of ['init', 'next', 'launch', 'guard-block', 'write', 'gate', 'approval']) assert.ok(types.has(t), t);
  assert.ok(r.events().filter((e) => e.type === 'launch').every((e) => e.session_id === 'test-session'));
});

test('parallel hook writes keep the state file consistent', async () => {
  const r = run(p);
  r.put('00-request.md', null);
  const { spawn } = await import('node:child_process');
  const one = () => new Promise((done) => {
    const c = spawn('node', [join(REPO, '.claude/hooks/post_tool_state.mjs')], { env: p.env });
    c.on('close', done);
    c.stdin.end(JSON.stringify({ tool_name: 'Write', agent_type: 'requirements-formalizer', tool_input: { file_path: r.abs('00-request.md') } }));
  });
  await Promise.all(Array.from({ length: 8 }, one));
  const state = JSON.parse(readFileSync(r.abs('workflow-state.json'), 'utf8'));
  assert.equal(state.artifacts['00-request.md'].status, 'valid');
  assert.equal(r.events().filter((e) => e.type === 'write').length, 9);
});
