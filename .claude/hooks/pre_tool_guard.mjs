// PreToolUse guard. Exit 2 blocks the tool call; stderr is shown to the model.
// 1. Approval gate: writes to runs/<id>/final/** need a valid, captured approval of the
//    current brief draft (hash match). Fails closed: any error while checking blocks.
// 2. Protected files: only hooks write approval/**, workflow-state.json and events.jsonl.
// 3. Ownership: each agent may write only its own artifact; the main session only
//    00-request.md.
// 4. Shells (Bash, PowerShell) may not mention protected or final paths, except a single,
//    unchained call of the workflow's own state/validate CLI.
// 5. Launch guard: a workflow subagent launch must match the engine's next step exactly.
import { readFileSync } from 'node:fs';

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8') || '{}');
} catch {
  process.exit(0); // nothing to judge
}
const tool = input.tool_name ?? '';
const FINAL = /[\\/]runs[\\/][^\\/]+[\\/]final[\\/]/;
let logBlock = () => {};

const block = (reason) => {
  logBlock(reason);
  process.stderr.write(`Blocked by tech-brief guard: ${reason}\n`);
  process.exit(2);
};

// Imported lazily so a broken library still can't open the final/ gate.
let lib;
try {
  lib = { ...(await import('./lib/approval.mjs')), ...(await import('./lib/state.mjs')) };
} catch (err) {
  const path = String(input.tool_input?.file_path ?? input.tool_input?.command ?? '');
  if (FINAL.test(path) || /final[\\/]/.test(path)) block(`guard library failed to load (${err.message}); final output stays blocked.`);
  process.exit(0);
}
const { appendEvent, briefApproved, locate, readState, recordLaunch, RUNS } = lib;
const logTo = (runDir) => {
  logBlock = (reason) => appendEvent(runDir, { type: 'guard-block', session_id: input.session_id ?? null, tool, agent: input.agent_type ?? 'coordinator', reason: reason.split('\n')[0] });
};

// Which run files each writer may create or edit. The main session has no agent_type.
const OWNS = {
  coordinator: [/^00-request\.md$/],
  'requirements-formalizer': [/^01-requirements\.md$/],
  'docs-researcher': [/^research\/11-docs\.md$/],
  'ecosystem-researcher': [/^research\/12-ecosystem\.md$/],
  'patterns-researcher': [/^research\/14-patterns\.md$/],
  validator: [/^gates\/(research|brief)\.r\d+\.md$/],
  'brief-synthesizer': [/^30-brief-draft\.md$/],
  'brief-renderer': [/^final\/decision-brief\.(md|html)$/],
};
const HOOK_ONLY = (rel) => rel === 'workflow-state.json' || rel === 'events.jsonl' || rel.startsWith('approval/') || rel.startsWith('.state.lock');

if (/^(Write|Edit|MultiEdit)$/.test(tool)) {
  const loc = input.tool_input?.file_path ? locate(input.tool_input.file_path) : null;
  if (!loc) process.exit(0);
  logTo(loc.runDir);
  if (HOOK_ONLY(loc.rel)) {
    block(`${loc.rel} is maintained by hooks only. Use node .claude/scripts/state.mjs, and ask the user with AskUserQuestion for approvals.`);
  }
  const writer = input.agent_type ?? 'coordinator';
  if (!(OWNS[writer] ?? []).some((re) => re.test(loc.rel))) {
    block(`${writer} may not write ${loc.rel}: each agent writes only its own artifact (${OWNS[writer] ? OWNS[writer].map((r) => r.source.replace(/\\/g, '').replace(/[\^$]/g, '')).join(', ') : 'none in a run folder'}).`);
  }
  if (loc.rel.startsWith('final/')) {
    let approved = false;
    try {
      approved = briefApproved(readState(loc.runDir), loc.runDir);
    } catch (err) {
      block(`could not verify approval (${err.message}); final output stays blocked.`);
    }
    if (!approved) {
      block('final output needs an approval of the current brief draft. Ask the user with the [tech-brief:approve …] question first; if the draft changed since, ask again.');
    }
  }
  process.exit(0);
}

if (tool === 'Bash' || tool === 'PowerShell') {
  const cmd = String(input.tool_input?.command ?? '');
  const ownCliOnly = /^\s*node\s+\.claude\/(scripts\/state\.mjs|skills\/artifact-contract\/scripts\/validate\.mjs)(\s+[^;&|<>`$()\r\n]*)?\s*$/.test(cmd);
  const mentionsProtected = /(^|[\s"'`=(\\/])((approval|final)([\\/\s"'`);]|$)|workflow-state\.json|events\.jsonl|\.state\.lock)/i.test(cmd);
  if (mentionsProtected && !ownCliOnly) {
    const runId = cmd.match(/runs[\\/]([\w.-]+)/)?.[1];
    if (runId) logTo(`${RUNS}/${runId}`);
    block('shell commands may not touch final/, approval/, workflow-state.json or events.jsonl. Use the Read tool to look at files; writes go through the owning agent or the hooks.');
  }
  process.exit(0);
}

if (tool === 'Agent') {
  const prompt = String(input.tool_input?.prompt ?? '');
  const runId = prompt.match(/^Run folder: runs\/([\w.-]+)\s*$/m)?.[1];
  if (!runId) process.exit(0); // not a workflow launch
  const runDir = `${RUNS}/${runId}`;
  let next;
  try {
    const { nextStep } = await import('./lib/workflow.mjs');
    ({ next } = nextStep(runId, { dryRun: true }));
  } catch {
    process.exit(0); // fails open: a launch is harmless compared to an unapproved final write
  }
  logTo(runDir);
  const norm = (s) => String(s).replace(/\r\n/g, '\n').split('\n').map((l) => l.trimEnd()).join('\n').trim();
  const expected = next.launch ?? [];
  const match = expected.some((l) => l.subagent_type === input.tool_input?.subagent_type && norm(l.prompt) === norm(prompt));
  if (!match) {
    block(expected.length
      ? `this launch doesn't match the next step (${next.stage}). Launch exactly:\n${expected.map((l) => `- ${l.subagent_type}:\n${l.prompt}`).join('\n')}`
      : `the next step is "${next.stage}", which launches no agent. Run node .claude/scripts/state.mjs next ${runId} and follow it.`);
  }
  // Allowed: record it. Retry limits count these launches.
  try {
    recordLaunch(runDir, {
      session_id: input.session_id ?? null,
      agent: input.tool_input.subagent_type,
      stage: next.stage,
      attempt: Number(prompt.match(/^Attempt: (\d+)/m)?.[1]) || null,
      task: prompt.match(/^Task: (\w+)/m)?.[1] ?? null,
      fixes: /^Findings to fix:/m.test(prompt),
    });
  } catch {}
}
process.exit(0);
