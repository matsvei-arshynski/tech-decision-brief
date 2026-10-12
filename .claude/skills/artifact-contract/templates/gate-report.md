---
artifact: gate
agent: validator
run_id: <run-id>
stage: <research | brief>
round: <n>
result: <pass | fail>
---
# Gate report: <stage>, round <n>

## Result
<PASS | FAIL> — <n> findings.

## Script gates
| Artifact | STRUCTURE | CITATIONS |
|---|---|---|
| <path relative to the run folder, e.g. research/11-docs.md> | <pass / fail / n/a> | <pass / fail / n/a> |

## Semantic gates
| Gate | Result | Notes |
|---|---|---|
| CURRENCY | <pass / fail / n/a> | <one line> |
| CONSTRAINT-COVERAGE | <pass / fail> | <one line> |

## Findings
<"None." when result is pass; otherwise this table, one row per problem:>
| # | Gate | Artifact | Owner | Finding | Fix hint |
|---|---|---|---|---|---|
| 1 | <gate> | <artifact path> | <owning agent> | <what is wrong, specific> | <what to change> |
