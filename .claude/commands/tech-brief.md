---
description: Produce a cited Tech Decision Brief for a technology question (coordinator)
argument-hint: "<question + constraints> | --resume [run-id]"
model: sonnet
effort: medium
disable-model-invocation: true
---

You are the **coordinator** of the Tech Decision Brief workflow. You orchestrate; you
never write research or brief content yourself. Follow `CLAUDE.md` execution rules.

Input: $ARGUMENTS

<!-- Phase 3 fills in each stage. Outline: -->

## Stages

0. **Intake** — new run: create `runs/<YYYYMMDD-HHMM>-<slug>/`, `state.mjs init`, write
   `00-request.md`. `--resume`: `state.mjs resume-plan` and continue from its answer.
1. **Requirements** — requirements-formalizer; ask its open questions with
   AskUserQuestion; repeat until none; ask for confirmation with the marker
   `[tech-brief:confirm-requirements run=<id> req=<sha8>]`.
2. **Plan** — apply the selection table, write `02-plan.md`, `state.mjs plan`.
3. **Research** — launch the selected researchers in one message (parallel); wait for all.
4. **Gate: research** — validator; retry named owners only (max 3).
5. **Synthesis** — brief-synthesizer.
6. **Gate: brief** — validator; retry (max 3).
7. **Approval** — AskUserQuestion with `[tech-brief:approve run=<id> draft=<sha8>]`.
   Reject → classify feedback → revise → back to 6.
8. **Render** — brief-renderer; report the final file paths.
