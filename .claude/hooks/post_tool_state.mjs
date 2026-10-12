// PostToolUse:
// - Write/Edit/MultiEdit under runs/<run-id>/: record the artifact hash, script-gate results
//   and status in workflow-state.json (and gate-report outcomes). If the script gates fail,
//   hand the findings straight back to the agent that wrote the file, so it can fix them in
//   the same attempt (an injected test fault is not handed back: it must reach the gate).
// - AskUserQuestion carrying a [tech-brief:…] marker: record the user's actual answer as an
//   approval record under approval/ (deterministic approval capture).
// Errors go to stderr for the user to see; they never block.
import { readFileSync } from 'node:fs';
import { captureApproval } from './lib/approval.mjs';
import { recordWrite } from './lib/state.mjs';

try {
  const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
  const tool = input.tool_name ?? '';
  if (/^(Write|Edit|MultiEdit)$/.test(tool) && input.tool_input?.file_path) {
    const a = recordWrite(input.tool_input.file_path, { agent: input.agent_type ?? 'coordinator', sessionId: input.session_id ?? null });
    const findings = (a?.findings ?? []).filter((f) => !f.includes('[injected]'));
    if (findings.length) {
      console.log(JSON.stringify({
        decision: 'block',
        reason: `Script gates failed for ${a.rel}. Fix these now with Edit, before you reply (if you are mid-way through several edits, finish them; the file is re-checked on every write):\n${findings.map((f) => `- ${f}`).join('\n')}`,
      }));
    }
  } else if (tool === 'AskUserQuestion') {
    captureApproval(input);
  }
} catch (err) {
  process.stderr.write(`post_tool_state: ${err.message}\n`);
  process.exit(1);
}
