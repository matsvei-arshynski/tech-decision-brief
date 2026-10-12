---
artifact: gate
agent: validator
run_id: 20261012-2103-express5-vs-fastify-node22
stage: research
round: 1
result: fail
---
# Gate report: research, round 1

## Result
FAIL — 1 findings.

## Script gates
| Artifact | STRUCTURE | CITATIONS |
|---|---|---|
| research/11-docs.md | pass | pass |
| research/12-ecosystem.md | pass | fail |

## Semantic gates
| Gate | Result | Notes |
|---|---|---|
| CURRENCY | pass | Express 5.3.0 (2026-10-09) and Fastify 5.12.5 (2026-09-16) are stated and cited; Fastify 6 alpha is marked not stable and is not relied on. |
| CONSTRAINT-COVERAGE | pass | H1-H4 x both candidates have met/unmet/unknown in the docs table; all five criteria have cited findings for both candidates. |

## Findings
| # | Gate | Artifact | Owner | Finding | Fix hint |
|---|---|---|---|---|---|
| 1 | CITATIONS | research/12-ecosystem.md | ecosystem-researcher | Script finding: "[injected] simulated failure on attempt 1 (--simulate-fault); fix: re-run the owner" | Re-run the owner and rewrite the artifact so the CITATIONS script gate passes. |
