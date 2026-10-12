# tech-decision-brief

This repo is a Claude Code workflow. Its entry point is `/tech-brief`
(`.claude/commands/tech-brief.md`), which runs the coordinator in the main session.

## Workflow

```
/tech-brief "<question + constraints>"
  requirements-formalizer ⇄ Q&A → requirements confirmation (hook-captured)
  → plan (agent selection by question type)
  → [docs-researcher ‖ ecosystem-researcher | patterns-researcher]   parallel
  → research gate (script gates on write + validator) → targeted retry, max 3
  → brief-synthesizer → brief gate → human approval (revision loop on reject)
  → brief-renderer → final/decision-brief.md + .html
```

| Agent | Owns | Runs when |
|---|---|---|
| requirements-formalizer | `01-requirements.md` | always |
| docs-researcher | `research/11-docs.md` | always |
| ecosystem-researcher | `research/12-ecosystem.md` | `question_type: library` |
| patterns-researcher | `research/14-patterns.md` | `question_type: architecture` |
| validator | `gates/<stage>.r<N>.md` | after each research or brief write |
| brief-synthesizer | `30-brief-draft.md` | always |
| brief-renderer | `final/decision-brief.{md,html}` | always, after approval |

## How it's driven

The **workflow engine** (`.claude/hooks/lib/workflow.mjs`, called through
`node .claude/scripts/state.mjs next <run-id>`) decides every step from the run folder and
`workflow-state.json`. It returns the stage, the exact subagent launches (agent, attempt,
task, findings to fix) and the exact approval-question markers. The coordinator loops:
`next` → do it → `next`. Fresh and resumed runs take the same path.

Hooks keep the model honest:

| Hook | Does |
|---|---|
| PostToolUse on Write/Edit | Records hash + script-gate results in state; applies gate reports; marks downstream artifacts stale; hands script-gate failures straight back to the writing agent |
| PostToolUse on AskUserQuestion | Records the user's actual answer to `[tech-brief:…]` questions in `approval/` |
| PreToolUse on Agent | Blocks any subagent launch that isn't exactly what the engine expects next |
| PreToolUse on Write/Edit/Bash | Blocks `final/` without a valid approval of the current draft; keeps `approval/` and the state file hook-only |

## Execution rules

- The coordinator writes only `00-request.md` (request and Q&A). It never writes research
  or brief content, never edits the plan, and never decides the order of work.
- Every run lives in `runs/<YYYYMMDD-HHMM>-<slug>/`. File names are fixed; agents write
  only the artifact they own.
- Artifacts follow the `artifact-contract` skill. Research follows the `source-research`
  skill; every claim carries an `[Sn]` citation.
- `workflow-state.json` and `approval/` are written only by hooks and `state.mjs`.
- Gates: script gates (STRUCTURE, CITATIONS) on every write, fixed by the writer in place;
  semantic gates (CURRENCY, CONSTRAINT-COVERAGE) by the validator after each research or
  brief write. A failed gate re-runs only the owners it names, with their findings;
  dependents become `stale`. At most 4 rounds per gate pass (first check + 3 retries);
  then the run is `blocked` with `gates/UNRESOLVED.md`, until the requirements change.
- Final output needs a hook-recorded approval of the current draft's hash. A rejection
  is revised (editorial) or sent back through requirements and research (needs research).
- Subagents run in the background; call `next` again only after every launched agent has
  handed back.
- Resume with `/tech-brief --resume [run-id]`: valid work is kept, missing work is redone,
  hand edits are kept but re-checked.
