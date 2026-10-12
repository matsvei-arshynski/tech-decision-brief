// The workflow engine: given a run folder and its state, decide the single next step.
// Deterministic: the same files and state always give the same answer. Used for every
// step of a run (fresh or resumed) via `state.mjs next`, and by the PreToolUse launch guard.
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseRequirements } from '../../skills/artifact-contract/scripts/validate.mjs';
import { briefApproved, requirementsConfirmed } from './approval.mjs';
import {
  applyWrite, hashFile, OWNER, readState, RUNS, UNTRACKED, withLock, writeState,
} from './state.mjs';

const MAX_ROUNDS = 4; // per gate pass: first check + 3 retries
let DRY_RUN = false; // set while the launch guard asks; nothing may be written then
const MAX_QA_ROUNDS = 3;
const BRIEF = '30-brief-draft.md';
const FINALS = ['final/decision-brief.md', 'final/decision-brief.html'];
const STATUS_OF = {
  intake: 'intake', requirements: 'requirements', questions: 'requirements',
  'confirm-requirements': 'requirements', 'append-change-request': 'requirements', plan: 'requirements',
  research: 'research', 'research-gate': 'research', synthesis: 'synthesis', 'brief-gate': 'synthesis',
  approval: 'approval', feedback: 'approval', 'revise-from-feedback': 'approval',
  render: 'rendering', done: 'done', blocked: 'blocked',
};

function walk(dir, base = '') {
  return readdirSync(dir).flatMap((name) => {
    const rel = base ? `${base}/${name}` : name;
    return statSync(join(dir, name)).isDirectory() ? walk(join(dir, name), rel) : [rel];
  });
}

export function latestOpenRun() {
  if (!existsSync(RUNS)) return null;
  const ids = readdirSync(RUNS).filter((id) => existsSync(join(RUNS, id, 'workflow-state.json'))).sort().reverse();
  return ids.find((id) => readState(join(RUNS, id)).status !== 'done') ?? null;
}

// Disk vs state: missing files, hand-edited files (kept, re-validated), unrecorded files.
function reconcile(state, runDir) {
  const changes = [];
  for (const [rel, a] of Object.entries(state.artifacts)) {
    const file = join(runDir, rel);
    if (!existsSync(file)) {
      if (a.status !== 'missing') changes.push({ artifact: rel, change: 'missing on disk' });
      a.status = 'missing';
    } else if (hashFile(file) !== a.sha256) {
      applyWrite(state, runDir, rel, file, a.agent);
      changes.push({ artifact: rel, change: 'changed on disk since it was recorded; kept and re-validated' });
    }
  }
  for (const rel of walk(runDir)) {
    if (UNTRACKED(rel) || state.artifacts[rel]) continue;
    applyWrite(state, runDir, rel, join(runDir, rel), null);
    changes.push({ artifact: rel, change: 'found on disk but not in state; recorded now' });
  }
  return changes;
}

// The current gate pass of a stage: failed reports in a row since the pass started
// (a pass restarts when requirements change or the human gives feedback).
function gatePass(state, stage) {
  const starts = [state.artifacts['01-requirements.md']?.written_at];
  if (stage === 'brief') starts.push(state.approvals?.brief?.at);
  const since = starts.filter(Boolean).sort().at(-1) ?? '';
  const all = Object.values(state.gates).filter((g) => g.stage === stage).sort((a, b) => a.round - b.round);
  const reports = all.filter((g) => (g.recorded_at ?? '') >= since);
  let failed = 0;
  for (let i = reports.length - 1; i >= 0 && reports[i].result === 'fail'; i--) failed++;
  return { nextRound: (all.at(-1)?.round ?? 0) + 1, roundsLeft: MAX_ROUNDS - failed, failed, last: reports.at(-1) ?? null };
}

// ---------- prompts ----------

const base = (runId, attempt, task) => `Run folder: runs/${runId}\nAttempt: ${attempt}\nTask: ${task}`;
const findingLines = (list) => list.map((f) => `- [${f.gate}] ${f.finding}${f.fix ? ` Fix: ${f.fix}` : ''}`).join('\n');
const scriptFindings = (a) => (a.findings ?? []).filter((f) => !f.includes('[injected]')).map((f) => {
  const [gate, ...rest] = f.split(': ');
  return { gate, finding: rest.join(': '), fix: '' };
});
// Findings to hand to an owner on a revision: gate findings first, then script findings.
const findingsFor = (a) => [...(a.gate_findings ?? []), ...scriptFindings(a)];

function validatorLaunch(runId, stage, round, artifacts, questionType) {
  return {
    subagent_type: 'validator',
    prompt: `Run folder: runs/${runId}\nStage: ${stage}\nRound: ${round}\nReport: gates/${stage}.r${round}.md\nArtifacts: ${artifacts.join(', ')}\nQuestion type: ${questionType}`,
  };
}

// ---------- decision ----------

function decide(state, runDir) {
  const runId = state.run_id;
  const A = (rel) => state.artifacts[rel];
  const present = (rel) => existsSync(join(runDir, rel)) && A(rel) && A(rel).status !== 'missing';
  const ok = (rel) => present(rel) && A(rel).status === 'valid';
  const nextAttempt = (rel) => (Number(A(rel)?.attempt) || 0) + 1;
  const sha8 = (rel) => A(rel).sha256.slice(0, 8);

  // Intake and requirements.
  if (!present('00-request.md')) return { stage: 'intake' };
  const REQ = '01-requirements.md';
  if (!present(REQ)) {
    return { stage: 'requirements', launch: [{ subagent_type: OWNER[REQ], prompt: base(runId, 1, 'write') }] };
  }
  const qaNewer = A('00-request.md').written_at > A(REQ).written_at;
  if (qaNewer || A(REQ).status !== 'valid') {
    const fixes = scriptFindings(A(REQ));
    const prompt = base(runId, nextAttempt(REQ), 'revise') + (fixes.length && !qaNewer ? `\nFindings to fix:\n${findingLines(fixes)}` : '');
    return { stage: 'requirements', launch: [{ subagent_type: OWNER[REQ], prompt }] };
  }
  if (state.status === 'blocked' && state.blocked?.requirements_sha256 === A(REQ).sha256) {
    return { stage: 'blocked', reason: state.blocked.reason, report: 'gates/UNRESOLVED.md' };
  }
  const req = parseRequirements(readFileSync(join(runDir, REQ), 'utf8'));
  if (req.openQuestions !== 'None.') {
    if (Number(A(REQ).attempt) > MAX_QA_ROUNDS) {
      return block(state, runDir, 'requirements', `open questions remain after ${MAX_QA_ROUNDS} Q&A rounds`, []);
    }
    return { stage: 'questions', round: Number(A(REQ).attempt) };
  }
  const conf = state.approvals?.requirements;
  const confCurrent = conf?.valid && conf.sha256 === A(REQ).sha256;
  if (confCurrent && conf.decision === 'change-requested') {
    if (!conf.feedback) return { stage: 'feedback', ask: { question: `[tech-brief:feedback run=${runId} req=${sha8(REQ)}] What should change in the requirements?` } };
    return { stage: 'append-change-request', feedback: conf.feedback };
  }
  if (!requirementsConfirmed(state, runDir)) {
    return { stage: 'confirm-requirements', ask: { question: `[tech-brief:confirm-requirements run=${runId} req=${sha8(REQ)}] Are these requirements correct?` } };
  }
  if (!ok('02-plan.md')) return { stage: 'plan', question_type: req.questionType };

  // Research.
  const research = ['research/11-docs.md', req.questionType === 'architecture' ? 'research/14-patterns.md' : 'research/12-ecosystem.md'];
  const toWrite = research.filter((r) => !present(r) || A(r).status === 'stale');
  if (toWrite.length) {
    return { stage: 'research', launch: toWrite.map((r) => ({ subagent_type: OWNER[r], prompt: base(runId, nextAttempt(r), 'write') })) };
  }
  const retry = retryStep(state, runDir, research, 'research', req.questionType);
  if (retry) return retry;
  if (research.some((r) => A(r).status !== 'valid')) {
    const pass = gatePass(state, 'research');
    return { stage: 'research-gate', round: pass.nextRound, rounds_left: pass.roundsLeft, launch: [validatorLaunch(runId, 'research', pass.nextRound, research, req.questionType)] };
  }

  // Synthesis.
  const researchLine = `Research: ${research.join(', ')}`;
  if (!present(BRIEF)) {
    return { stage: 'synthesis', launch: [{ subagent_type: OWNER[BRIEF], prompt: `${base(runId, 1, 'write')}\n${researchLine}` }] };
  }
  if (A(BRIEF).status === 'stale') {
    return { stage: 'synthesis', launch: [{ subagent_type: OWNER[BRIEF], prompt: `${base(runId, nextAttempt(BRIEF), 'revise')}\n${researchLine}\nFindings to fix:\n- Research changed (${A(BRIEF).stale_because}). Refresh every part that depends on it.` }] };
  }
  const briefRetry = retryStep(state, runDir, [BRIEF], 'brief', req.questionType, researchLine);
  if (briefRetry) return briefRetry;
  if (A(BRIEF).status !== 'valid') {
    const pass = gatePass(state, 'brief');
    return { stage: 'brief-gate', round: pass.nextRound, rounds_left: pass.roundsLeft, launch: [validatorLaunch(runId, 'brief', pass.nextRound, [BRIEF], req.questionType)] };
  }

  // Approval.
  const ap = state.approvals?.brief;
  if (!(ap?.valid && ap.sha256 === A(BRIEF).sha256)) {
    return { stage: 'approval', ask: { question: `[tech-brief:approve run=${runId} draft=${sha8(BRIEF)}] Approve this brief for final output?` } };
  }
  if (ap.decision === 'rejected') {
    if (!ap.feedback) return { stage: 'feedback', ask: { question: `[tech-brief:feedback run=${runId} draft=${sha8(BRIEF)}] What should change in the brief?` } };
    return {
      stage: 'revise-from-feedback', feedback: ap.feedback,
      launch: [{ subagent_type: OWNER[BRIEF], prompt: `${base(runId, nextAttempt(BRIEF), 'revise')}\n${researchLine}\nFeedback: ${ap.feedback}` }],
    };
  }
  if (!briefApproved(state, runDir)) {
    return { stage: 'approval', ask: { question: `[tech-brief:approve run=${runId} draft=${sha8(BRIEF)}] Approve this brief for final output?` } };
  }

  // Render.
  const notDone = FINALS.filter((f) => !ok(f));
  if (notDone.length) {
    const fixes = notDone.flatMap((f) => (present(f) ? scriptFindings(A(f)) : []));
    const attempt = present(FINALS[0]) || present(FINALS[1]) ? 2 : 1;
    return { stage: 'render', launch: [{ subagent_type: 'brief-renderer', prompt: base(runId, attempt, attempt > 1 ? 'revise' : 'write') + (fixes.length ? `\nFindings to fix:\n${findingLines(fixes)}` : '') }] };
  }
  return { stage: 'done', final: FINALS.map((f) => `runs/${runId}/${f}`) };
}

// Re-run owners of artifacts that a gate report flagged (targeted retry), or block when the
// pass is out of rounds. Research-owned findings from a brief report land here too.
function retryStep(state, runDir, artifacts, stage, questionType, extra = '') {
  const runId = state.run_id;
  const flagged = artifacts.filter((r) => state.artifacts[r]?.status === 'invalid' && state.artifacts[r].flagged_by);
  if (!flagged.length) return null;
  const passStage = state.artifacts[flagged[0]].flagged_by.stage ?? stage;
  const pass = gatePass(state, passStage);
  if (pass.roundsLeft <= 0) {
    const open = flagged.flatMap((r) => findingsFor(state.artifacts[r]).map((f) => ({ ...f, artifact: r, owner: OWNER[r] })));
    return block(state, runDir, passStage, `${passStage} gate failed ${pass.failed} rounds in a row`, open);
  }
  return {
    stage: `${stage}-gate`, step: 'retry', rounds_left: pass.roundsLeft,
    launch: flagged.map((r) => ({
      subagent_type: OWNER[r],
      prompt: `${base(runId, (Number(state.artifacts[r].attempt) || 0) + 1, 'revise')}${extra ? `\n${extra}` : ''}\nFindings to fix:\n${findingLines(findingsFor(state.artifacts[r]))}`,
    })),
  };
}

// Stop dependent work: record the block and write gates/UNRESOLVED.md.
function block(state, runDir, stage, reason, open) {
  if (DRY_RUN) return { stage: 'blocked', reason, report: 'gates/UNRESOLVED.md' };
  const rows = open.map((f) => `| ${f.gate} | ${f.artifact} | ${f.owner} | ${String(f.finding).replace(/\|/g, '/')} |`).join('\n') || '| — | — | — | see reason above |';
  const body = `# Unresolved gate failures\n\nStage: ${stage} · Reason: ${reason}\n\n| Gate | Artifact | Owner | Finding |\n|---|---|---|---|\n${rows}\n\nDependent work was stopped. To continue, change the requirements (for example relax or\ndrop a hard constraint or criterion) and resume the run.\n`;
  mkdirSync(join(runDir, 'gates'), { recursive: true });
  writeFileSync(join(runDir, 'gates', 'UNRESOLVED.md'), body);
  applyWrite(state, runDir, 'gates/UNRESOLVED.md', join(runDir, 'gates', 'UNRESOLVED.md'), 'workflow');
  state.blocked = { reason, stage, report: 'gates/UNRESOLVED.md', requirements_sha256: state.artifacts['01-requirements.md']?.sha256 ?? null, at: new Date().toISOString() };
  return { stage: 'blocked', reason, report: 'gates/UNRESOLVED.md' };
}

// Next step for a run. dryRun: decide without writing anything (used by the launch guard).
export function nextStep(runId, { dryRun = false } = {}) {
  const runDir = join(RUNS, runId);
  if (!existsSync(join(runDir, 'workflow-state.json'))) throw new Error(`no workflow-state.json for run ${runId}`);
  if (dryRun) {
    DRY_RUN = true;
    try {
      return { run_id: runId, next: decide(readState(runDir), runDir) };
    } finally {
      DRY_RUN = false;
    }
  }
  return withLock(runDir, () => {
    const state = readState(runDir);
    const changes = reconcile(state, runDir);
    const next = decide(state, runDir);
    state.status = STATUS_OF[next.stage] ?? state.status;
    if (next.stage !== 'blocked') state.blocked = null;
    writeState(runDir, state);
    const kept = Object.entries(state.artifacts).filter(([, a]) => a.status === 'valid').map(([p]) => p);
    return { run_id: runId, run_status: state.status, simulate_fault: state.simulate_fault, changes, kept, next };
  });
}

// Writes 02-plan.md from the selection rules (deterministic) and records it.
export function writePlan(runId) {
  const runDir = join(RUNS, runId);
  return withLock(runDir, () => {
    const state = readState(runDir);
    const req = parseRequirements(readFileSync(join(runDir, '01-requirements.md'), 'utf8'));
    const lib = req.questionType === 'library';
    const rows = [
      ['1', 'requirements-formalizer', 'sequential', '01-requirements.md', 'always'],
      ['2', 'docs-researcher', 'parallel', 'research/11-docs.md', 'always'],
      lib ? ['2', 'ecosystem-researcher', 'parallel', 'research/12-ecosystem.md', 'question type is library']
        : ['2', 'patterns-researcher', 'parallel', 'research/14-patterns.md', 'question type is architecture'],
      ['3', 'validator', 'after each group', 'gates/<stage>.r<N>.md', 'always'],
      ['3', 'brief-synthesizer', 'sequential', '30-brief-draft.md', 'always'],
      ['4', 'brief-renderer', 'sequential', 'final/decision-brief.{md,html}', 'always, after approval'],
    ];
    const skipped = lib ? ['patterns-researcher', 'question type is not architecture'] : ['ecosystem-researcher', 'question type is not library'];
    const md = `---\nartifact: plan\nagent: workflow\nrun_id: ${runId}\n---\n# Plan\n\n## Question type\n${req.questionType}\n\n## Selected agents\n| Group | Agent | Mode | Artifact | Reason |\n|---|---|---|---|---|\n${rows.map((r) => `| ${r.join(' | ')} |`).join('\n')}\n\n## Not selected\n| Agent | Reason |\n|---|---|\n| ${skipped.join(' | ')} |\n`;
    writeFileSync(join(runDir, '02-plan.md'), md);
    applyWrite(state, runDir, '02-plan.md', join(runDir, '02-plan.md'), 'workflow');
    state.plan = { question_type: req.questionType, research: rows.filter((r) => r[0] === '2').map((r) => r[3]) };
    writeState(runDir, state);
    return { run_id: runId, plan: '02-plan.md', question_type: req.questionType, research: state.plan.research };
  });
}
