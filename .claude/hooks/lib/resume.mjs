// Resume: reconcile the run folder with workflow-state.json, then decide the next step.
// Deterministic: the same files and state always give the same answer.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseRequirements } from '../../skills/artifact-contract/scripts/validate.mjs';
import { briefApproved, requirementsConfirmed } from './approval.mjs';
import {
  applyWrite, hashFile, readState, RUNS, UNTRACKED, withLock, writeState,
} from './state.mjs';

const OWNER = {
  '01-requirements.md': 'requirements-formalizer',
  'research/11-docs.md': 'docs-researcher',
  'research/12-ecosystem.md': 'ecosystem-researcher',
  'research/14-patterns.md': 'patterns-researcher',
  '30-brief-draft.md': 'brief-synthesizer',
  'final/decision-brief.md': 'brief-renderer',
  'final/decision-brief.html': 'brief-renderer',
};
const MAX_ROUNDS = 4; // first check + 3 retries per gate pass

function walk(dir, base = '') {
  return readdirSync(dir).flatMap((name) => {
    const rel = base ? `${base}/${name}` : name;
    return statSync(join(dir, name)).isDirectory() ? walk(join(dir, name), rel) : [rel];
  });
}

// Newest run that isn't done.
export function latestOpenRun() {
  if (!existsSync(RUNS)) return null;
  const ids = readdirSync(RUNS).filter((id) => existsSync(join(RUNS, id, 'workflow-state.json'))).sort().reverse();
  return ids.find((id) => readState(join(RUNS, id)).status !== 'done') ?? null;
}

// 1. Disk vs state: missing files, files changed outside the workflow, files the hook never saw.
function reconcile(state, runDir) {
  const changes = [];
  for (const [rel, a] of Object.entries(state.artifacts)) {
    const file = join(runDir, rel);
    if (!existsSync(file)) {
      if (a.status !== 'missing') changes.push({ artifact: rel, change: 'missing on disk' });
      a.status = 'missing';
    } else if (hashFile(file) !== a.sha256) {
      // Keep the edit, but re-validate it: it must pass its gates (and approval) again,
      // and everything downstream of it is stale.
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

// Rounds of the current (unfinished) gate pass for a stage: trailing failed reports since the
// pass started. A pass restarts when requirements change or the human gives feedback.
function gatePass(state, stage) {
  const starts = [state.artifacts['01-requirements.md']?.written_at];
  if (stage === 'brief') starts.push(state.approvals?.brief?.at);
  const since = starts.filter(Boolean).sort().at(-1) ?? '';
  const all = Object.values(state.gates).filter((g) => g.stage === stage).sort((a, b) => a.round - b.round);
  const reports = all.filter((g) => (g.recorded_at ?? '') >= since);
  let failedTail = 0;
  for (let i = reports.length - 1; i >= 0 && reports[i].result === 'fail'; i--) failedTail++;
  const last = reports.at(-1) ?? null;
  return { last, nextRound: (all.at(-1)?.round ?? 0) + 1, roundsUsed: failedTail, roundsLeft: MAX_ROUNDS - failedTail };
}

// Next step for a gated set of artifacts, or null when they're all valid.
function gateStep(state, stage, artifacts) {
  const pending = artifacts.filter((r) => state.artifacts[r]?.status !== 'valid');
  if (!pending.length) return null;
  const pass = gatePass(state, stage);
  const flaggedNow = pending.filter((r) => {
    const a = state.artifacts[r];
    return a.status === 'invalid' && pass.last?.flagged.includes(r) && pass.last.checked[r] === a.sha256;
  });
  if (flaggedNow.length) {
    if (pass.roundsLeft <= 0) {
      return { stage: 'blocked', reason: `${stage} gate failed ${pass.roundsUsed} rounds in a row`, report: pass.last.report };
    }
    return {
      stage: `${stage}-gate`, step: 'retry', report: pass.last.report,
      agents: [...new Set(flaggedNow.map((r) => OWNER[r]))], artifacts: flaggedNow,
      next_round: pass.nextRound, rounds_left: pass.roundsLeft,
    };
  }
  return { stage: `${stage}-gate`, step: 'check', artifacts, next_round: pass.nextRound, rounds_left: pass.roundsLeft };
}

function decide(state, runDir) {
  const A = (rel) => state.artifacts[rel];
  const ok = (rel) => A(rel)?.status === 'valid';
  const present = (rel) => existsSync(join(runDir, rel)) && A(rel) && A(rel).status !== 'missing';
  const nextAttempt = (rel) => (A(rel)?.attempt ?? 0) + 1;

  if (!present('00-request.md')) return { stage: 'intake' };
  if (!ok('01-requirements.md')) {
    return { stage: 'requirements', agents: ['requirements-formalizer'], task: present('01-requirements.md') ? 'revise' : 'write', attempt: nextAttempt('01-requirements.md') };
  }
  if (state.status === 'blocked' && state.blocked?.requirements_sha256 === A('01-requirements.md').sha256) {
    return { stage: 'blocked', reason: state.blocked.reason ?? 'a gate ran out of retries', report: state.blocked.report ?? 'gates/UNRESOLVED.md' };
  }
  const conf = state.approvals?.requirements;
  if (conf?.decision === 'change-requested' && conf.valid && conf.sha256 === A('01-requirements.md').sha256) {
    return { stage: 'requirements', agents: ['requirements-formalizer'], task: 'revise', attempt: nextAttempt('01-requirements.md'), feedback: conf.feedback, record: conf.record };
  }
  if (!requirementsConfirmed(state, runDir)) return { stage: 'confirm-requirements' };

  const req = parseRequirements(readFileSync(join(runDir, '01-requirements.md'), 'utf8'));
  const research = ['research/11-docs.md', req.questionType === 'architecture' ? 'research/14-patterns.md' : 'research/12-ecosystem.md'];
  if (!ok('02-plan.md')) return { stage: 'plan', question_type: req.questionType };

  const toWrite = research.filter((r) => !present(r) || A(r).status === 'stale');
  if (toWrite.length) {
    return { stage: 'research', agents: toWrite.map((r) => OWNER[r]), artifacts: toWrite, task: 'write', attempts: Object.fromEntries(toWrite.map((r) => [r, nextAttempt(r)])) };
  }
  const researchGate = gateStep(state, 'research', research);
  if (researchGate) return researchGate;

  const brief = '30-brief-draft.md';
  if (!present(brief)) return { stage: 'synthesis', task: 'write', attempt: 1, research };
  if (A(brief).status === 'stale') return { stage: 'synthesis', task: 'revise', attempt: nextAttempt(brief), research, note: `Research updated (${A(brief).stale_because}). Refresh the affected content.` };
  const briefGate = gateStep(state, 'brief', [brief]);
  if (briefGate) return briefGate;

  const approval = state.approvals?.brief;
  const draftMatches = approval?.valid && approval.sha256 === A(brief).sha256;
  if (!draftMatches) return { stage: 'approval' };
  if (approval.decision === 'rejected') {
    return { stage: 'revise-from-feedback', attempt: nextAttempt(brief), research, feedback: approval.feedback, record: approval.record };
  }
  if (!briefApproved(state, runDir)) return { stage: 'approval' };

  const finals = ['final/decision-brief.md', 'final/decision-brief.html'];
  const notDone = finals.filter((f) => !ok(f));
  if (notDone.length) return { stage: 'render', artifacts: notDone };
  return { stage: 'done' };
}

export function resumePlan(runId) {
  const runDir = join(RUNS, runId);
  if (!existsSync(join(runDir, 'workflow-state.json'))) throw new Error(`no workflow-state.json for run ${runId}`);
  return withLock(runDir, () => {
    const state = readState(runDir);
    const changes = reconcile(state, runDir);
    const next = decide(state, runDir);
    if (next.stage === 'blocked' && state.status !== 'blocked') {
      state.status = 'blocked';
      state.blocked = { reason: next.reason, report: next.report, requirements_sha256: state.artifacts['01-requirements.md']?.sha256 };
    }
    writeState(runDir, state);
    const done = Object.entries(state.artifacts).filter(([, a]) => a.status === 'valid').map(([p]) => p);
    return { run_id: runId, run_status: state.status, simulate_fault: state.simulate_fault, changes, kept: done, next };
  });
}
