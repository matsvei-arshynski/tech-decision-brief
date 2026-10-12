// Deterministic human approval. The PostToolUse hook calls captureApproval with the
// AskUserQuestion tool input/response from the harness: the answer recorded is what the
// user actually selected, not what the model reports. Records go to approval/*.json,
// which only hooks may write (the PreToolUse guard blocks the model).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { appendEvent, hashFile, RUNS, updateState } from './state.mjs';

const MARKER = /^\[tech-brief:(approve|confirm-requirements) run=([\w.-]+) (?:draft|req)=([0-9a-f]{8})\]/;
const KINDS = {
  approve: { key: 'brief', file: '30-brief-draft.md', yes: 'Approve', yesDecision: 'approved', noDecision: 'rejected' },
  'confirm-requirements': { key: 'requirements', file: '01-requirements.md', yes: 'Confirm', yesDecision: 'confirmed', noDecision: 'change-requested' },
};

// Follow-up question asking for the feedback behind a reject / change request.
const FEEDBACK_MARKER = /^\[tech-brief:feedback run=([\w.-]+) (draft|req)=([0-9a-f]{8})\]/;

// Adds feedback to the latest rejection (or change request) of the same file version.
function attachFeedback(runId, key, sha8, text) {
  const runDir = join(RUNS, runId);
  if (!text || !existsSync(join(runDir, 'workflow-state.json'))) return null;
  let updated = null;
  updateState(runDir, (state) => {
    const a = state.approvals?.[key];
    if (!a || !['rejected', 'change-requested'].includes(a.decision) || !a.sha256?.startsWith(sha8)) return;
    const file = join(runDir, a.record);
    const record = JSON.parse(readFileSync(file, 'utf8'));
    record.feedback = [record.feedback, text].filter(Boolean).join('\n');
    record.feedback_captured_at = new Date().toISOString();
    writeFileSync(file, JSON.stringify(record, null, 2) + '\n');
    a.feedback = record.feedback;
    updated = record;
    appendEvent(runDir, { type: 'feedback', kind: key, record: a.record });
  });
  return updated;
}

// Returns the records written (one per marked question), or [] when nothing applies.
export function captureApproval(input) {
  const questions = input.tool_input?.questions ?? [];
  const answers = input.tool_response?.answers ?? {};
  const annotations = input.tool_response?.annotations ?? {};
  const written = [];

  for (const q of questions) {
    const fb = String(q.question ?? '').match(FEEDBACK_MARKER);
    if (fb) {
      const text = [answers[q.question], annotations[q.question]?.notes].filter(Boolean).join('\n');
      const rec = attachFeedback(fb[1], fb[2] === 'draft' ? 'brief' : 'requirements', fb[3], text);
      if (rec) written.push(rec);
      continue;
    }
    const m = String(q.question ?? '').match(MARKER);
    if (!m) continue;
    const [, kindName, runId, sha8] = m;
    const kind = KINDS[kindName];
    const runDir = join(RUNS, runId);
    if (!existsSync(join(runDir, 'workflow-state.json'))) continue;

    const answer = answers[q.question];
    const note = annotations[q.question]?.notes ?? null;
    const targetPath = join(runDir, kind.file);
    const currentSha = existsSync(targetPath) ? hashFile(targetPath) : null;
    const hashMatches = currentSha?.startsWith(sha8) ?? false;
    const decision = answer === undefined ? 'no-answer'
      : answer === kind.yes ? kind.yesDecision : kind.noDecision;
    const feedback = decision === kind.noDecision
      ? [answer, note].filter((x) => x && x !== 'Reject' && x !== 'Change').join('\n') || null
      : note;

    updateState(runDir, (state) => {
      state.approvals ??= {};
      const history = (state.approvals.history ??= []);
      const round = history.filter((h) => h.kind === kind.key).length + 1;
      const recordRel = `approval/${kind.key}.r${round}.json`;
      const record = {
        kind: kind.key,
        round,
        decision,
        valid: hashMatches && decision !== 'no-answer',
        answer: answer ?? null,
        feedback,
        target: kind.file,
        target_sha256: currentSha,
        marker_sha8: sha8,
        question: q.question,
        tool_use_id: input.tool_use_id ?? null,
        session_id: input.session_id ?? null,
        captured_at: new Date().toISOString(),
        captured_by: 'PostToolUse hook (post_tool_state.mjs)',
      };
      mkdirSync(join(runDir, 'approval'), { recursive: true });
      writeFileSync(join(runDir, recordRel), JSON.stringify(record, null, 2) + '\n');
      state.approvals[kind.key] = {
        round, decision, valid: record.valid, sha256: currentSha, feedback, record: recordRel, at: record.captured_at,
      };
      history.push({ kind: kind.key, round, decision, valid: record.valid, record: recordRel, at: record.captured_at });
      written.push(record);
      appendEvent(runDir, { type: 'approval', session_id: record.session_id, kind: kind.key, round, decision, valid: record.valid, record: recordRel });
    });
  }
  return written;
}

// True when the latest brief approval is valid and matches the current draft.
export function briefApproved(state, runDir) {
  const a = state?.approvals?.brief;
  const draft = join(runDir, '30-brief-draft.md');
  return Boolean(a && a.decision === 'approved' && a.valid && existsSync(draft) && a.sha256 === hashFile(draft));
}

export function requirementsConfirmed(state, runDir) {
  const a = state?.approvals?.requirements;
  const req = join(runDir, '01-requirements.md');
  return Boolean(a && a.decision === 'confirmed' && a.valid && existsSync(req) && a.sha256 === hashFile(req));
}
