// PostToolUse: on writes under runs/, record the artifact hash and script-gate results
// in workflow-state.json; on AskUserQuestion with a tech-brief marker, record the
// user's answer under approval/.
// Skeleton: no-op. Implemented in Phases 4–6.
import { readFileSync } from 'node:fs';

JSON.parse(readFileSync(0, 'utf8') || '{}');
process.exit(0);
