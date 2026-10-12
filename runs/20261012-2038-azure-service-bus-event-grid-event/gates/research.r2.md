---
artifact: gate
agent: validator
run_id: 20261012-2038-azure-service-bus-event-grid-event
stage: research
round: 2
result: fail
---
# Gate report: research, round 2

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
| CURRENCY | fail | Event Grid GA status and tier are stated and cited; Service Bus and Event Hubs have tiers but no GA status statement. |
| CONSTRAINT-COVERAGE | pass | All 12 hard constraint x candidate pairs are met/unmet/unknown; all 5 criteria x 3 candidates have cited findings. |

## Findings
| # | Gate | Artifact | Owner | Finding | Fix hint |
|---|---|---|---|---|---|
| 1 | CURRENCY | research/11-docs.md | docs-researcher | Azure Service Bus: no Findings bullet states GA status for the tiers (Standard, Premium). The GA bullet says none was found; the only GA citation [S25] is for the Premium geo-replication feature, not the tier. | Add a cited bullet stating the GA status of the Service Bus Standard and Premium tiers (for example from Learn pages, Azure updates or release notes). |
| 2 | CURRENCY | research/11-docs.md | docs-researcher | Event Hubs: no Findings bullet states GA status for the Standard or Premium tier. The GA bullet says none was found; the SLA and tier descriptions [S20][S26] are not GA statements. | Add a cited bullet stating the GA status of the Event Hubs Standard and Premium tiers. |
