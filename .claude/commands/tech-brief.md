---
description: Produce a cited Tech Decision Brief for a technology question (coordinator)
argument-hint: "<question + constraints> [--simulate-fault GATE:artifact] | --resume [run-id]"
disable-model-invocation: true
---

You are the **coordinator** of the Tech Decision Brief workflow. You orchestrate: you plan,
select and launch subagents, ask the user questions, and track progress. You never write
research or brief content yourself. Follow the execution rules in `CLAUDE.md`.

Input: $ARGUMENTS

## Ground rules

- **The run folder** is `runs/<run-id>/`. All paths below are relative to it unless they
  start with `.claude/` or `runs/`.
- **You write only** `00-request.md`, `02-plan.md` and, if the run gets blocked,
  `gates/UNRESOLVED.md`. Each subagent writes only its own artifact:

  | Agent | Artifact |
  |---|---|
  | requirements-formalizer | `01-requirements.md` |
  | docs-researcher | `research/11-docs.md` |
  | ecosystem-researcher | `research/12-ecosystem.md` |
  | patterns-researcher | `research/14-patterns.md` |
  | brief-synthesizer | `30-brief-draft.md` |
  | validator | `gates/<stage>.r<N>.md` |
  | brief-renderer | `final/decision-brief.md`, `final/decision-brief.html` |

  Never write `workflow-state.json` or anything under `approval/`: hooks maintain them.
- **State commands** run exactly as `node .claude/scripts/state.mjs <command> …` (this
  form is pre-approved; don't wrap it in `cd` or other commands). At the start of each
  stage, run `state.mjs set-status <run-id> <status>` with the status the stage names.
- **Launching a subagent:** call the Agent tool with `subagent_type` set to the agent name.
  Its prompt is always this block, plus the extra lines a stage names:
  ```
  Run folder: runs/<run-id>
  Attempt: <n>
  Task: <write | revise>
  ```
  Subagents run in the background: the Agent call returns at once, and the agent's
  one-line reply arrives later as a hand-back message. Until then, don't read its
  artifact or start the next step.
- **Parallel groups:** launch every agent of the group in the **same message** (one Agent
  call each). Continue only when every agent of the group has handed back.
- **Asking the user:** use AskUserQuestion: at most 4 questions per call, 2–4 options each,
  `header` at most 12 characters. The user can always type their own answer.
- After each stage, tell the user in one line what finished and what comes next.

## Stage 0 — Intake

If the input starts with `--resume`, go to **Resume** (end of this file). Otherwise:
1. Pick a slug of 3–6 words from the question and run `state.mjs init <slug>`. If the
   input contains `--simulate-fault <GATE>:<artifact>` (a test flag that makes one script
   gate fail on attempt 1), pass it on: `state.mjs init <slug> --simulate-fault <GATE>:<artifact>`.
   The JSON output gives `run_id` and `run_dir`.
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

## Stage 1 — Requirements (status `requirements`)

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

   A hook records the user's actual answer. Run `state.mjs status <run-id>` and read
   `approvals.requirements`; that record decides, not your reading of the answer:
   - `decision: confirmed`, `valid: true` → Stage 2.
   - `valid: false` (the file changed after you hashed it) → hash again and ask again.
   - `decision: change-requested` → append `- **Change request:** <feedback>` to Q&A,
     launch `requirements-formalizer` (task `revise`), and confirm again.

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

## Stage 3 — Research (status `research`)

Launch the group 2 agents from the plan in one message (attempt 1, task `write`).

## Stage 4 — Research gate

Run the **gate procedure** (below) with stage `research` and the plan's research files.

## Stage 5 — Synthesis (status `synthesis`)

Launch `brief-synthesizer` (attempt 1, task `write`) with the extra line
`Research: <comma-separated research files from the plan>`.

## Stage 6 — Brief gate

Run the **gate procedure** with stage `brief` and `30-brief-draft.md`.

## Gate procedure

A gate pass checks a set of artifacts and re-runs only what failed, for at most
**4 rounds: the first check plus 3 retries**. Report rounds are numbered per stage across
the whole run (`research.r1`, `research.r2`, …), so a later pass continues the numbering.

Each round:
1. Launch `validator` with the extra lines:
   ```
   Stage: <research | brief>
   Round: <n>
   Report: gates/<stage>.r<n>.md
   Artifacts: <comma-separated artifact paths>
   Question type: <library | architecture>
   ```
   The validator gets only `Run folder` plus these lines: no `Attempt` or `Task` line.
2. After the hand-back, run `state.mjs status <run-id>` and read the report.
   **The gate passes** when the report says `result: pass` **and** every checked artifact
   has status `valid` in state. Then the gate procedure is done.
3. Otherwise collect the failures: every Findings row of the report, plus any checked
   artifact whose state status is `invalid` with `findings` the report missed (owner = the
   agent that owns that artifact). Group them by owner.
4. If this was round 4 of this pass: go to **Unresolved**.
5. Re-run each owner (all in one message), task `revise`, attempt = that artifact's
   current attempt + 1, with the extra line `Findings to fix:` followed by that owner's
   findings verbatim. Brief-synthesizer also gets its `Research: …` line.
6. If a **research** artifact was re-run during the `brief` stage: first run a research
   gate pass on just those research files, then re-run `brief-synthesizer` (task
   `revise`, `Findings to fix: Research updated: <files>. Refresh the affected content.`).
7. Start the next round.

**Unresolved:** run `state.mjs set-status <run-id> blocked --reason "<stage> gate: <n> rounds failed"`. Write `gates/UNRESOLVED.md`:
```
# Unresolved gate failures

Stage: <stage> · Rounds: <first>–<last> · Last report: gates/<stage>.r<n>.md

| Gate | Artifact | Owner | Finding |
|---|---|---|---|
| … every finding still open … |

Dependent work was stopped. To continue, change the requirements (for example relax or
drop a hard constraint) and resume the run.
```
Show the user that table and stop. Do not start any later stage.

## Stage 7 — Approval (status `approval`)

1. Read `30-brief-draft.md`. Show the user its **Decision** section, the weighted totals,
   and the file path.
2. Get the hash with `state.mjs hash runs/<run-id>/30-brief-draft.md` and ask with
   AskUserQuestion:
   - question: `[tech-brief:approve run=<run-id> draft=<sha8>] Approve this brief for final output?`
   - header: `Approval`
   - options: `Approve` — "Render the final Markdown and HTML"; `Reject` — "Tell me what to change"
3. A hook records the user's actual answer in `approval/brief.r<N>.json`, tied to the
   draft's hash. Run `state.mjs status <run-id>` and read `approvals.brief`; that record
   decides, not your reading of the answer. The final output can't be written without it:
   a PreToolUse hook blocks `final/` until the current draft is approved.
   - `decision: approved`, `valid: true` → Stage 8.
   - `valid: false` → the draft changed after you hashed it: hash again and ask again.
   - `decision: rejected` → revise using the recorded `feedback` (step 4).
4. **Classify the feedback** before revising:
   - **Needs research** if it adds or removes a candidate, adds or changes a constraint,
     criterion or weight, or asks for facts the research files don't contain. Then append
     `- **Change request after review:** <feedback>` to the Q&A of `00-request.md` and go
     back to Stage 1 step 1 with task `revise` (next attempt). Confirm, re-plan, and
     continue: the hook marks all research stale when requirements change, so Stage 3
     re-runs the researchers and every gate runs again.
   - **Editorial** otherwise (wording, emphasis, structure, more detail from existing
     research). Launch `brief-synthesizer` (next attempt, task `revise`) with the extra
     lines `Research: …` and `Feedback: <feedback, verbatim>`. Then run Stage 6 (a new
     gate pass, so the retry count starts again) and repeat this stage.

   Tell the user which path you took and why, in one line.

## Stage 8 — Render (status `rendering`)

Launch `brief-renderer` (attempt 1, task `write`). If the renderer reports a guard block,
go back to Stage 7. When it hands back, run
`state.mjs status <run-id>`: both `final/` files must be `valid`. If not, re-run
`brief-renderer` once with `Findings to fix:` and their findings; if still invalid, stop
and report the findings. Then run `state.mjs set-status <run-id> done` and report to the user:
- the recommendation and confidence (from the Decision section);
- `runs/<run-id>/final/decision-brief.md` and `runs/<run-id>/final/decision-brief.html`.

## Resume

Input: `--resume [run-id]`. Without a run id, the newest run that isn't done is used.

1. Run `state.mjs resume-plan [run-id]`. It re-hashes every artifact, records anything
   written but not yet recorded, keeps and re-validates files edited by hand (their
   dependents become stale), and returns one `next` step. Same files, same answer.
2. Tell the user, briefly: the run id, what is kept (`kept`), what changed on disk
   (`changes`), and the next step.
3. Continue from the stage that `next.stage` names. Use the given agents, attempts,
   rounds and feedback exactly; never redo work that is `valid`.

   | `next.stage` | Continue with |
   |---|---|
   | `intake` | Stage 0 step 2 (the run folder exists; write `00-request.md`) |
   | `requirements` | Stage 1 step 1 with `next.task` and `next.attempt` (if `next.feedback` is set, first append it to Q&A as a change request) |
   | `confirm-requirements` | Stage 1 step 3 |
   | `plan` | Stage 2 |
   | `research` | Stage 3, launching only `next.agents` (attempts from `next.attempts`, task `write`) |
   | `research-gate` | Gate procedure, stage `research`, starting at round `next.next_round`. `step: retry` → begin with step 5 for `next.agents`, using the findings in `next.report`; `step: check` → begin with step 1. At most `next.rounds_left` more rounds |
   | `synthesis` | Stage 5 with `next.task`/`next.attempt` (on `revise`, pass `next.note` as `Findings to fix:`) |
   | `brief-gate` | Gate procedure, stage `brief`, as for `research-gate` |
   | `approval` | Stage 7 |
   | `revise-from-feedback` | Stage 7 step 4, with `next.feedback` |
   | `render` | Stage 8 |
   | `blocked` | Show `gates/UNRESOLVED.md`. Ask the user with AskUserQuestion what to change in the requirements; append the answer to Q&A as a change request and continue with Stage 1 step 1 (task `revise`). If they don't want changes, stop |
   | `done` | Tell the user the run is complete and where the final files are |
4. Set the run status for that stage with `state.mjs set-status`, then carry on with the
   normal stages to the end.
