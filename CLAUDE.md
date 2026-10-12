# tech-brief-workflow

This repo is a Claude Code workflow. Its entry point is `/tech-brief`
(`.claude/commands/tech-brief.md`), which runs the coordinator in the main session.

## Workflow

```
/tech-brief "<question + constraints>"
  requirements-formalizer ⇄ Q&A → requirements confirmation (hook-captured)
  → plan (agent selection by question type)
  → [docs-researcher ‖ ecosystem-researcher | patterns-researcher]   parallel
  → gates (script on write + validator)  → targeted retry, max 3
  → brief-synthesizer → gates → human approval (revision loop on reject)
  → brief-renderer → final/decision-brief.md + .html
```

| Agent | Owns | Runs when |
|---|---|---|
| requirements-formalizer | `01-requirements.md` | always |
| docs-researcher | `research/11-docs.md` | always |
| ecosystem-researcher | `research/12-ecosystem.md` | `question_type: library` |
| patterns-researcher | `research/14-patterns.md` | `question_type: architecture` |
| brief-synthesizer | `30-brief-draft.md` | always |
| validator | `gates/<stage>.r<N>.md` | always |
| brief-renderer | `final/decision-brief.{md,html}` | always, after approval |

## Execution rules

- The coordinator orchestrates only. It writes `00-request.md` and `02-plan.md`, never
  research or brief content.
- Every run lives in `runs/<YYYYMMDD-HHMM>-<slug>/`. File names are fixed; agents write
  only the artifact they own.
- Artifacts follow the `artifact-contract` skill. Research follows the `source-research`
  skill; every claim carries an `[Sn]` citation.
- `workflow-state.json` is written only by hooks and `node .claude/scripts/state.mjs`.
  Never edit it, or anything under `approval/`, by hand.
- A group starts only when every artifact it depends on is `valid` in state.
- Gate failure: re-run only the owners named in the gate report, with their findings.
  Dependents become `stale` and are regenerated. Max 3 retries per artifact per gate
  stage; then the run is `blocked` and the failures are reported.
- Approval is recorded by the PostToolUse hook from the AskUserQuestion answer and is
  tied to the draft's hash. The PreToolUse hook blocks writes to `final/` without it.
- Subagents run in the background; each one hands back a message when it finishes. Start
  the next group (or a gate) only after every agent of the current group has handed back.
