// PostToolUse: on writes under runs/<run-id>/, record the artifact hash and script-gate
// results in workflow-state.json (and gate-report outcomes). Approval capture: Phase 6.
// Never blocks: the tool has already run. Errors go to stderr for the user to see.
import { readFileSync } from 'node:fs';
import { recordWrite } from './lib/state.mjs';

try {
  const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
  const path = input.tool_input?.file_path;
  if (/^(Write|Edit|MultiEdit)$/.test(input.tool_name ?? '') && path) {
    recordWrite(path, { agent: input.agent_type ?? 'coordinator' });
  }
} catch (err) {
  process.stderr.write(`post_tool_state: ${err.message}\n`);
  process.exit(1);
}
