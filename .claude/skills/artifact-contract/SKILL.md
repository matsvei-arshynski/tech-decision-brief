---
name: artifact-contract
description: "File layout, required sections, citation format and quality gates for every Tech Decision Brief workflow artifact. Use when writing, revising or validating any file in a runs/<run-id>/ folder."
user-invocable: false
---

# Artifact contract

Every run folder has the same shape. File names are fixed; never invent new ones.

```
runs/<YYYYMMDD-HHMM>-<slug>/
  00-request.md            coordinator         verbatim request + Q&A log
  01-requirements.md       requirements-formalizer
  02-plan.md               coordinator         selected agents + reasons
  research/11-docs.md      docs-researcher
  research/12-ecosystem.md ecosystem-researcher   (library questions)
  research/14-patterns.md  patterns-researcher    (architecture questions)
  gates/<stage>.r<N>.md    validator           stage = research | brief, N = attempt
  30-brief-draft.md        brief-synthesizer
  approval/*.json          hooks only — never write these
  final/decision-brief.md  brief-renderer      after approval only
  final/decision-brief.html
  workflow-state.json      hooks + state.mjs only — never write this
```

## Front matter (every Markdown artifact)

```yaml
---
artifact: docs          # requirements | docs | ecosystem | patterns | gate | brief
agent: docs-researcher
run_id: 20261012-1015-background-jobs-dotnet
attempt: 1
---
```

## Templates

Read the template before writing. Keep every heading exactly as written, in order.

| Artifact | Template |
|---|---|
| `01-requirements.md` | `templates/requirements.md` |
| `research/*.md` | `templates/research.md` |
| `30-brief-draft.md`, `final/decision-brief.md` | `templates/brief.md` |
| `final/decision-brief.html` | `templates/brief.html` |

Template paths are relative to this skill's folder: `.claude/skills/artifact-contract/`.

Research artifacts: `# Title`, then `## Summary`, `## Findings` (one `### <Candidate>` per
candidate, in requirements order), `## Constraint check` (table: Constraint | Candidate |
met / unmet / unknown | Evidence), `## Open issues`, `## Sources`.

Brief: 9 sections, always present and in this order. Write "Not applicable — <reason>"
rather than leaving a section out.
1. Decision · 2. Context and confirmed requirements · 3. Options considered ·
4. Evaluation matrix · 5. Recommendation and rationale · 6. Risks and mitigations ·
7. Adoption plan · 8. Open questions · 9. Sources

Ordering: candidates in requirements order; matrix criteria by weight (descending), then
by name.

## Citations

Inline marker after each claim: `... supports recurring jobs [S2].`
Source list entry, one per line under `## Sources`:

```
[S2] Recurring tasks — https://docs.example.org/recurring — retrieved 2026-10-12 — via mcp:mslearn
```

`via` is one of `mcp:mslearn`, `mcp:context7`, `web`.

## Quality gates

| Gate | Checked by | Rule |
|---|---|---|
| STRUCTURE | `scripts/validate.mjs` (hook, on write) | Front matter + required headings in order |
| CITATIONS | `scripts/validate.mjs` (hook, on write) | Every Findings bullet has `[Sn]`; every `[Sn]` defined; no unused sources |
| CURRENCY | validator | Each candidate's current version and its release date are stated and cited |
| CONSTRAINT-COVERAGE | validator | Every hard constraint is a matrix row; the recommendation violates none and has no `unknown` on one |

Self-check before you return: run through the STRUCTURE and CITATIONS rules yourself.
