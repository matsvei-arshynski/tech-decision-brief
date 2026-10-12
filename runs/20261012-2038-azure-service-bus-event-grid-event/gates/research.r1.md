---
artifact: gate
agent: validator
run_id: 20261012-2038-azure-service-bus-event-grid-event
stage: research
round: 1
result: fail
---
# Gate report: research, round 1

## Result
FAIL — 2 findings.

## Script gates
| Artifact | STRUCTURE | CITATIONS |
|---|---|---|
| research/11-docs.md | pass | pass |
| research/14-patterns.md | pass | pass |

## Semantic gates
| Gate | Result | Notes |
|---|---|---|
| CURRENCY | fail | GA status is missing for Azure Service Bus and Event Hubs; Event Grid has GA status and tier cited [S14]. |
| CONSTRAINT-COVERAGE | pass | All 12 hard constraint × candidate pairs are met/unmet/unknown; all 5 criteria × 3 candidates have cited findings. |

## Findings
| # | Gate | Artifact | Owner | Finding | Fix hint |
|---|---|---|---|---|---|
| 1 | CURRENCY | research/11-docs.md | docs-researcher | Azure Service Bus: no Findings bullet states GA status with a citation. Tiers (Basic, Standard, Premium) are cited [S3], but the Open issues say the pages retrieved have no explicit GA statement. An SLA is not a GA statement. | Add a cited Findings bullet under Azure Service Bus that states GA status (for example, from a Learn page or the Azure updates feed) together with the relevant tier. |
| 2 | CURRENCY | research/11-docs.md | docs-researcher | Event Hubs: no Findings bullet states GA status with a citation. Tiers and prices are cited, but the Open issues say no explicit GA statement was found. | Add a cited Findings bullet under Event Hubs that states GA status and the relevant tier (Standard or Premium). |
