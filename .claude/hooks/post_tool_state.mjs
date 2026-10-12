// PostToolUse:
// - Write/Edit/MultiEdit under runs/<run-id>/: record the artifact hash, script-gate results
//   and status in workflow-state.json (and gate-report outcomes).
// - AskUserQuestion carrying a [tech-brief:…] marker: record the user's actual answer as an
//   approval record under approval/ (deterministic approval capture).
// Never blocks: the tool has already run. Errors go to stderr for the user to see.
import { readFileSync } from 'node:fs';
import { captureApproval } from './lib/approval.mjs';
import { recordWrite } from './lib/state.mjs';

try {
  const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
  const tool = input.tool_name ?? '';
  if (/^(Write|Edit|MultiEdit)$/.test(tool) && input.tool_input?.file_path) {
    recordWrite(input.tool_input.file_path, { agent: input.agent_type ?? 'coordinator' });
  } else if (tool === 'AskUserQuestion') {
    captureApproval(input);
  }
} catch (err) {
  process.stderr.write(`post_tool_state: ${err.message}\n`);
  process.exit(1);
}
