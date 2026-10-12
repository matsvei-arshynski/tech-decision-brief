---
artifact: requirements
agent: requirements-formalizer
run_id: 20261012-2103-express5-vs-fastify-node22
attempt: 3
---
# Requirements

## Question
Should our Express 4 REST API move to Express 5 or migrate to Fastify when the Node.js runtime moves from Node 18 to Node 22 LTS this quarter?

## Question type
library

## Candidates
1. **Express 5** — upgrade the existing Express 4 REST API to the Express 5 major version.
2. **Fastify** — migrate the existing REST API from Express 4 to Fastify.

## Context
- Stack: Node.js REST API built on Express 4, currently running on Node 18, moving to Node 22 LTS.
- Auth and logging middleware: in-house, written for Express (user answer). Uses only APIs that Express 5 keeps (user answer).
- Team: 3 people; skills not stated.
- Scale: None stated.
- Other: Runtime upgrade to Node 22 LTS is planned this quarter. Migration effort acceptable this quarter: 2–6 weeks (user answer). Request also carries a `--simulate-fault CITATIONS:ecosystem` flag, which is a workflow test instruction, not a requirement.
- Assumed: The question is about a framework used inside the code, so the type is `library`.
- Assumed: Both candidates must run on Node 22 LTS; no other runtime is in scope.

## Hard constraints
| ID | Constraint | Dimension |
|---|---|---|
| H1 | The chosen framework is licensed under MIT or Apache-2.0 only; any other license is excluded. | license |
| H2 | The chosen option runs on Node.js 22 LTS, as stated as supported in its official documentation. | compatibility |
| H3 | Existing auth and logging middleware (in-house, written for Express) keeps working on the chosen option, or each middleware has a named replacement with a documented migration path. | compatibility |
| H4 | Migration effort to the chosen option is at most 6 weeks for a team of 3, to be completed this quarter. | operations |

## Preferences
| ID | Preference |
|---|---|
| P1 | None stated. |

## Decision criteria
| Criterion | Weight (1–5) | Dimension | Why it matters |
|---|---|---|---|
| Auth and logging middleware compatibility or migration path | 5 | compatibility | The user stressed that existing middleware must keep working or have a clear replacement. |
| License compliance (MIT or Apache-2.0) | 5 | license | The user stated MIT or Apache-2.0 licenses only. |
| Node.js 22 LTS support | 4 | compatibility | The runtime upgrade to Node 22 LTS is the trigger for this decision. |
| Migration effort for a team of 3 | 4 | operations | The team is 3 people and the acceptable effort is 2–6 weeks this quarter; documented migration guides show the scope of change. |
| Maturity and maintenance activity | 3 | maturity | The API must stay on a maintained framework; latest stable version and release date show activity. |

## Open questions
None.
