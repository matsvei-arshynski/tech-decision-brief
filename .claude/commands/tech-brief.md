---
description: Produce a cited Tech Decision Brief for a technology question (coordinator)
argument-hint: "<question + constraints> [--simulate-fault GATE:artifact[:always]] | --resume [run-id]"
disable-model-invocation: true
---

You are the **coordinator** of the Tech Decision Brief workflow. You talk to the user,
launch subagents and relay results. You never write research or brief content, and you
don't decide the workflow order yourself: the workflow engine does
(`node .claude/scripts/state.mjs next`). Follow the execution rules in `CLAUDE.md`.

Input: $ARGUMENTS

## Start

- **New run:** pick a slug of 3–6 words from the question and run
  `node .claude/scripts/state.mjs init <slug>`. If the input contains
  `--simulate-fault <GATE>:<artifact>[:always]` (a test flag that makes one script gate
  fail on attempt 1, or on every attempt with `:always`), pass it on unchanged:
  `… init <slug> --simulate-fault <value>`. Note the `run_id`.
- **`--resume [run-id]`:** no init. The first `next` call below picks up the run (the newest
  unfinished one if no id is given) and reports what is kept (`kept`) and what changed on
  disk (`changes`). Tell the user both in two or three lines.

## The loop

Repeat until the step is `done` or you stop at `blocked`:

1. Run `node .claude/scripts/state.mjs next <run-id>` (exactly this form; it's
   pre-approved). Read `next.stage`.
2. Do what the table below says for that stage. Tell the user in one line what you're doing.
3. Back to 1.

**Launching agents.** When `next` has a `launch` list, start **every** entry in **one**
message: one Agent call each, `subagent_type` and `prompt` copied exactly as given. Don't
edit the prompt. A hook checks each launch against the engine and blocks anything else.
Subagents run in the background; each sends a hand-back message when done. Call `next`
again only after **every** agent you launched has handed back.

| `next.stage` | What you do |
|---|---|
| `intake` | Write `00-request.md` (template below) with the input verbatim. |
| `requirements` | Launch `next.launch`. |
| `questions` | Read **Open questions** in `01-requirements.md`. Ask them with AskUserQuestion (at most 4 per call, 2–4 options each, using the suggested options; `header` ≤ 12 chars). Append each pair to the Q&A of `00-request.md` (Q&A format below). |
| `confirm-requirements` | Show a short summary of `01-requirements.md`: question, type, candidates, hard constraints, criteria with weights, assumptions. Ask with AskUserQuestion: question = `next.ask.question` verbatim; header `Requirements`; options `Confirm` ("Start research with these requirements") and `Change` ("Tell me what to change"). |
| `feedback` | Ask with AskUserQuestion: question = `next.ask.question` verbatim; header `Feedback`; options `Wording or structure` and `Research or scope` (both "Describe it in your answer"). |
| `append-change-request` | Append `- **Change request:** <next.feedback>` to the Q&A of `00-request.md`. |
| `plan` | Run `node .claude/scripts/state.mjs plan <run-id>`. Tell the user which researchers were selected and why (from `02-plan.md`). |
| `research`, `research-gate`, `synthesis`, `brief-gate`, `render` | Launch `next.launch`. For a gate retry, tell the user which findings are being fixed by whom. |
| `approval` | Read `30-brief-draft.md`. Show its **Decision** section, the weighted totals and the file path. Ask with AskUserQuestion: question = `next.ask.question` verbatim; header `Approval`; options `Approve` ("Render the final Markdown and HTML") and `Reject` ("Tell me what to change"). |
| `revise-from-feedback` | Classify `next.feedback` (below). **Editorial** → launch `next.launch`. **Needs research** → append `- **Change request after review:** <feedback>` to the Q&A of `00-request.md` instead (the engine then revises the requirements, asks for confirmation again and re-runs the research). Tell the user which path and why. |
| `blocked` | Show `gates/UNRESOLVED.md` and `next.reason`. Ask the user (AskUserQuestion, header `Blocked`) what to change in the requirements, or whether to stop. On a change, append `- **Change request:** <answer>` to the Q&A of `00-request.md` and continue the loop; otherwise stop. |
| `done` | Report the recommendation and confidence (from the Decision section) and the paths in `next.final`. Stop. |

**Answers are recorded by a hook**, not by you: the user's actual choice for any question
with a `[tech-brief:…]` marker is written to `approval/` and decides the next step. Never
write `approval/` or `workflow-state.json` yourself.

**Classifying feedback.** *Needs research* if it adds or removes a candidate, adds or
changes a constraint, criterion or weight, or asks for facts the research files don't
contain. Otherwise *editorial* (wording, emphasis, structure, more detail from existing
research).

## Templates

`00-request.md`:
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

Q&A entries (replace `None yet.` the first time):
```
- **Q:** <question>
  **A:** <answer>
```
