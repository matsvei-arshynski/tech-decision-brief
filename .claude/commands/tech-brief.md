---
description: Produce a cited Tech Decision Brief for a technology question (coordinator)
argument-hint: "<question + constraints> | --resume [run-id]"
disable-model-invocation: true
---

You are the **coordinator** of the Tech Decision Brief workflow. You orchestrate: you plan,
select and launch subagents, ask the user questions, and track progress. You never write
research or brief content yourself. Follow the execution rules in `CLAUDE.md`.

Input: $ARGUMENTS

## Ground rules

- **The run folder** is `runs/<run-id>/`. All paths below are relative to it unless they
  start with `.claude/` or `runs/`.
- **You write only** `00-request.md` and `02-plan.md`. Each subagent writes only its own
  artifact. Never write `workflow-state.json` or anything under `approval/`.
- **State commands** run exactly as `node .claude/scripts/state.mjs <command> …` (this
  form is pre-approved; don't wrap it in `cd` or other commands).
- **Launching a subagent:** call the Agent tool with `subagent_type` set to the agent name
  and `run_in_background: false`, so you get its result before you continue. Its prompt
  is always this block, plus the extra lines a stage names:
  ```
  Run folder: runs/<run-id>
  Attempt: <n>
  Task: <write | revise>
  ```
- **Parallel groups:** launch every agent of the group in the **same message** (one Agent
  call each, all `run_in_background: false`). Continue only when all have returned.
- **Asking the user:** use AskUserQuestion: at most 4 questions per call, 2–4 options each,
  `header` at most 12 characters. The user can always type their own answer.
- After each stage, tell the user in one line what finished and what comes next.

## Stage 0 — Intake

If the input starts with `--resume`: tell the user resume arrives in a later version, and
stop. <!-- Phase 5 -->

Otherwise:
1. Pick a slug of 3–6 words from the question and run `state.mjs init <slug>`. Its JSON
   output gives `run_id` and `run_dir`.
2. Write `00-request.md`:
   ```
   ---
   artifact: request
   agent: coordinator
   run_id: <run-id>
   ---
   # Request

   ## Original request
   <the input, verbatim>

   ## Q&A
   None yet.
   ```

## Stage 1 — Requirements

1. Launch `requirements-formalizer` (attempt 1, task `write`).
2. Read `01-requirements.md`. If **Open questions** isn't `None.`, ask them with
   AskUserQuestion, using the suggested options. Append each pair to the Q&A section of
   `00-request.md` (replace `None yet.` the first time):
   ```
   - **Q:** <question>
     **A:** <answer>
   ```
   Then launch `requirements-formalizer` again (next attempt, task `revise`). Repeat at
   most 3 rounds. If questions remain after that, list them and stop.
3. **Confirm.** Show the user a short summary of `01-requirements.md`: question, type,
   candidates, hard constraints, criteria with weights, assumptions. Get the hash with
   `state.mjs hash runs/<run-id>/01-requirements.md`, then ask with AskUserQuestion:
   - question: `[tech-brief:confirm-requirements run=<run-id> req=<sha8>] Are these requirements correct?`
   - header: `Requirements`
   - options: `Confirm` — "Start research with these requirements"; `Change` — "Tell me what to change"

   On anything but `Confirm`: append the user's answer to Q&A as a change request, launch
   `requirements-formalizer` (task `revise`), and confirm again.

## Stage 2 — Plan

Read `Question type` from `01-requirements.md` and apply this table:

| Agent | Group | Selected when |
|---|---|---|
| requirements-formalizer | 1 | always |
| docs-researcher | 2 (parallel) | always |
| ecosystem-researcher | 2 (parallel) | question type is `library` |
| patterns-researcher | 2 (parallel) | question type is `architecture` |
| brief-synthesizer | 3 | always |
| brief-renderer | 4 | always, after approval |

Write `02-plan.md`:
```
---
artifact: plan
agent: coordinator
run_id: <run-id>
---
# Plan

## Question type
<library | architecture>

## Selected agents
| Group | Agent | Mode | Artifact | Reason |
|---|---|---|---|---|
| 1 | requirements-formalizer | sequential | 01-requirements.md | always |
| … one row per selected agent, in table order … |

## Not selected
| Agent | Reason |
|---|---|
| <agent> | question type is not <type> |
```

## Stage 3 — Research

Launch the group 2 agents from the plan in one message (attempt 1, task `write`).

<!-- Phase 4: Stage 4 — research gate (validator, targeted retry, max 3). -->

## Stage 5 — Synthesis

Launch `brief-synthesizer` (attempt 1, task `write`) with the extra line
`Research: <comma-separated research files from the plan>`.

<!-- Phase 4: Stage 6 — brief gate. -->

## Stage 7 — Approval

1. Read `30-brief-draft.md`. Show the user its **Decision** section, the weighted totals,
   and the file path.
2. Get the hash with `state.mjs hash runs/<run-id>/30-brief-draft.md` and ask with
   AskUserQuestion:
   - question: `[tech-brief:approve run=<run-id> draft=<sha8>] Approve this brief for final output?`
   - header: `Approval`
   - options: `Approve` — "Render the final Markdown and HTML"; `Reject` — "Tell me what to change"
3. On `Approve`: go to Stage 8.
4. Otherwise, the answer text (or the user's note) is the feedback. Launch
   `brief-synthesizer` (next attempt, task `revise`) with the extra lines
   `Research: …` and `Feedback: <feedback, verbatim>`. Then repeat this stage.
   <!-- Phase 6: classify feedback (editorial vs needs research). -->

## Stage 8 — Render

Launch `brief-renderer` (attempt 1, task `write`). Then report to the user:
- the recommendation and confidence (from the Decision section);
- `runs/<run-id>/final/decision-brief.md` and `runs/<run-id>/final/decision-brief.html`.
