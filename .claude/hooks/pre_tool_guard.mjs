// PreToolUse guard. Exit 2 blocks the tool call; stderr is shown to the model.
// 1. Approval gate: writes to runs/<id>/final/** need a valid, captured approval of the
//    current brief draft (hash match). Fails closed: any error while checking blocks.
// 2. Protected files: only hooks write approval/** and workflow-state.json.
// 3. Bash can't touch those paths either (except the workflow's own state/validate CLIs).
import { readFileSync } from 'node:fs';

const block = (reason) => {
  process.stderr.write(`Blocked by tech-brief guard: ${reason}\n`);
  process.exit(2);
};

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8') || '{}');
} catch {
  process.exit(0); // nothing to judge
}
const tool = input.tool_name ?? '';
const FINAL = /[\\/]runs[\\/][^\\/]+[\\/]final[\\/]/;

// Imported lazily so a broken library still can't open the final/ gate.
let lib;
try {
  lib = { ...(await import('./lib/approval.mjs')), ...(await import('./lib/state.mjs')) };
} catch (err) {
  const path = String(input.tool_input?.file_path ?? input.tool_input?.command ?? '');
  if (FINAL.test(path)) block(`guard library failed to load (${err.message}); final output stays blocked.`);
  process.exit(0);
}
const { briefApproved, locate, readState } = lib;

if (/^(Write|Edit|MultiEdit)$/.test(tool)) {
  const loc = input.tool_input?.file_path ? locate(input.tool_input.file_path) : null;
  if (!loc) process.exit(0);
  if (loc.rel === 'workflow-state.json' || loc.rel.startsWith('approval/') || loc.rel.startsWith('.state.lock')) {
    block(`${loc.rel} is maintained by hooks only. Use node .claude/scripts/state.mjs, and ask the user with AskUserQuestion for approvals.`);
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

if (tool === 'Bash') {
  const cmd = String(input.tool_input?.command ?? '');
  const ownCli = /^\s*node\s+\.claude\/(scripts\/state\.mjs|skills\/artifact-contract\/scripts\/validate\.mjs)\s/.test(cmd);
  if (!ownCli && /runs[\\/][^\s"']*[\\/](approval[\\/]|workflow-state\.json|final[\\/])/.test(cmd)) {
    block('shell commands may not touch approval/, workflow-state.json or final/ in a run folder.');
  }
}

// Launch guard: a subagent launch for a run must be one the workflow engine expects right
// now, with exactly the prompt it computed. Fails open on engine errors (a launch is
// harmless compared to an unapproved final write), closed on a mismatch.
if (tool === 'Agent') {
  const prompt = String(input.tool_input?.prompt ?? '');
  const runId = prompt.match(/^Run folder: runs\/([\w.-]+)\s*$/m)?.[1];
  if (!runId) process.exit(0); // not a workflow launch
  let next;
  try {
    const { nextStep } = await import('./lib/workflow.mjs');
    ({ next } = nextStep(runId, { dryRun: true }));
  } catch {
    process.exit(0);
  }
  const norm = (s) => String(s).replace(/\r\n/g, '\n').split('\n').map((l) => l.trimEnd()).join('\n').trim();
  const expected = next.launch ?? [];
  const match = expected.some((l) => l.subagent_type === input.tool_input?.subagent_type && norm(l.prompt) === norm(prompt));
  if (!match) {
    block(expected.length
      ? `this launch doesn't match the next step (${next.stage}). Launch exactly:\n${expected.map((l) => `- ${l.subagent_type}:\n${l.prompt}`).join('\n')}`
      : `the next step is "${next.stage}", which launches no agent. Run node .claude/scripts/state.mjs next ${runId} and follow it.`);
  }
}
process.exit(0);
