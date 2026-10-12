---
artifact: requirements
agent: requirements-formalizer
run_id: 20261012-2038-azure-service-bus-event-grid-event
attempt: 2
---
# Requirements

## Question
Which Azure messaging service (Service Bus, Event Grid or Event Hubs) should integrate six microservices, given about 2,000 messages/s at peak, per-customer ordering on all flows and a budget under $500/month?

## Question type
architecture

## Candidates
1. **Azure Service Bus** — managed message broker with queues and topics, sessions for ordered processing
2. **Event Grid** — managed event routing service for push-based event delivery to subscribers
3. **Event Hubs** — managed high-throughput event streaming service with partitioned logs

## Context
- Stack: Azure (cloud fixed); six microservices; languages and runtime not stated
- Team: None stated
- Scale: About 2,000 messages/s at peak; average rate and message size not stated
- Other: Traffic is commands and work queues (point-to-point), with no pub/sub fan-out stated. Per-customer ordering applies to all message flows. Assumed: the budget is in USD. Assumed: the cost check uses sustained 2,000 messages/s, 24x7, with messages up to 64 KB, as the worst case. Assumed: "ordering per customer" means messages sharing a customer key are processed in the order sent.

## Hard constraints
| ID | Constraint | Dimension |
|---|---|---|
| H1 | Sustains at least 2,000 messages/s at peak | performance |
| H2 | Delivers messages for the same customer in send order, for all message flows (ordering per customer) | capability |
| H3 | Total messaging cost is under 500 USD per month at the assumed worst-case volume | cost |
| H4 | Runs as a managed service on Azure | compatibility |

## Preferences
| ID | Preference |
|---|---|
| P1 | None stated |

## Decision criteria
| Criterion | Weight (1–5) | Dimension | Why it matters |
|---|---|---|---|
| Per-customer ordering support | 5 | capability | Stated requirement, applies to all flows; decides whether ordered processing is native (sessions, partition keys) or needs custom work |
| Peak throughput limits | 5 | performance | Stated 2,000 messages/s at peak; limits per tier or namespace decide headroom |
| Monthly cost at assumed volume | 4 | cost | Stated budget under $500/month; pricing tiers differ widely |
| Operational effort for six services | 3 | operations | Team not stated; scaling, retries and dead-lettering built in reduce custom operations |
| Messaging pattern fit | 3 | capability | Stated traffic is commands and work queues (point-to-point); fit of each service to queue-style work is compared |

## Open questions
None.
