---
artifact: plan
agent: coordinator
run_id: 20261012-2038-azure-service-bus-event-grid-event
---
# Plan

## Question type
architecture

## Selected agents
| Group | Agent | Mode | Artifact | Reason |
|---|---|---|---|---|
| 1 | requirements-formalizer | sequential | 01-requirements.md | always |
| 2 | docs-researcher | parallel | research/11-docs.md | always |
| 2 | patterns-researcher | parallel | research/14-patterns.md | question type is architecture |
| 3 | brief-synthesizer | sequential | 30-brief-draft.md | always |
| 4 | brief-renderer | sequential | final/decision-brief.md, final/decision-brief.html | always, after approval |

## Not selected
| Agent | Reason |
|---|---|
| ecosystem-researcher | question type is not library |
