// PreToolUse: approval gate for runs/*/final/** and protection of approval/ and
// workflow-state.json. Exit 2 blocks the tool call; stderr is shown to the model.
// Skeleton: allows everything. Implemented in Phase 6.
import { readFileSync } from 'node:fs';

JSON.parse(readFileSync(0, 'utf8') || '{}');
process.exit(0);
