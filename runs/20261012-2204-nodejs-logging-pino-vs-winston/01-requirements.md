---
artifact: requirements
agent: requirements-formalizer
run_id: 20261012-2204-nodejs-logging-pino-vs-winston
attempt: 2
---
# Requirements

## Question
Which Node.js logging library should a new service use: pino or winston?

## Question type
library

## Candidates
1. **pino** — fast JSON-first Node.js logger with a small core and out-of-process transports
2. **winston** — configurable Node.js logger with multiple transports and formats

## Context
- Stack: Node.js LTS release, deployed on containers. Exact LTS line, languages, framework and cloud or orchestrator not stated.
- Team: None stated.
- Scale: None stated. Logging throughput is a top priority (Q&A), but no numeric target was given.
- Other: The request carries a test directive (`--simulate-fault CITATIONS:ecosystem:always`), which is not a requirement. Throughput-first is a ranking, not a hard constraint: no measurable target was stated, and only public documentation is used as evidence.
- Assumed: the target runtime is the Node.js LTS line that is current on the decision date (2026-10-12).
- Assumed: the service is new, so there is no existing logging library to migrate from.
- Assumed: the container platform is not chosen yet, so platform-specific fit is not a hard constraint.

## Hard constraints
| ID | Constraint | Dimension |
|---|---|---|
| H1 | The library's license is MIT (the only acceptable license). | license |

## Preferences
| ID | Preference |
|---|---|
| P1 | Logging throughput ranks above feature breadth when the two conflict. |

## Decision criteria
| Criterion | Weight (1–5) | Dimension | Why it matters |
|---|---|---|---|
| Performance overhead (documented design for low per-log cost, throughput) | 5 | performance | Throughput is the top priority, and logging runs on every request. |
| Maintenance and maturity (release recency, release cadence, adoption) | 4 | maturity | A new service needs a logger that stays maintained for its lifetime. |
| Operations integration (stdout and container log shipping, transports, OpenTelemetry integration) | 3 | operations | Logs must reach the team's monitoring from containers without custom glue. |
| Logging capability (structured JSON output, child loggers, redaction, log levels) | 3 | capability | The service needs structured, filterable logs with sensitive-field protection, but feature breadth ranks below throughput. |

## Open questions
None.
