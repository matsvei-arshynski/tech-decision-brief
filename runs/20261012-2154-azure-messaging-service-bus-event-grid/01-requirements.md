---
artifact: requirements
agent: requirements-formalizer
run_id: 20261012-2154-azure-messaging-service-bus-event-grid
attempt: 2
---
# Requirements

## Question
Which Azure messaging service should integrate six microservices, given about 2,000 messages/s at peak, per-customer message ordering and a budget under $500 per month?

## Question type
architecture

## Candidates
1. **Azure Service Bus** — Azure brokered messaging with queues, topics and sessions.
2. **Azure Event Grid** — Azure event routing service with push-based event delivery.
3. **Azure Event Hubs** — Azure partitioned event streaming (log-based ingestion).

## Context
- Stack: Microsoft Azure (cloud, fixed); six microservices; languages, runtimes and existing messaging, if any, not stated.
- Team: None stated.
- Scale: About 2,000 messages/s at peak. Budget load basis confirmed by the user in Q&A: sustained 2,000 messages/s around the clock, about 5.2 billion messages per 30-day month.
- Other: Deadline none stated. Message size, retention and delivery guarantees not stated.
- Assumed: "Ordering per customer" is a must-have (not a preference) and means messages sharing a customer key are delivered in the order they were sent.
- Assumed: The budget of "under $500/month" is a hard ceiling on list-price cost for the messaging service itself, excluding the microservices' own compute.

## Hard constraints
| ID | Constraint | Dimension |
|---|---|---|
| H1 | Preserves message order per customer: messages sharing a customer key are delivered in send order to a consumer. | capability |
| H2 | Documented maximum throughput of a single deployable configuration is at least 2,000 messages/s. | performance |
| H3 | Estimated monthly list-price cost is less than USD 500 at a sustained load of 2,000 messages/s around the clock (about 5.2 billion messages per 30-day month). | cost |
| H4 | Runs on Microsoft Azure. | compatibility |

## Preferences
| ID | Preference |
|---|---|
| P1 | None stated by the user. |

## Decision criteria
| Criterion | Weight (1–5) | Dimension | Why it matters |
|---|---|---|---|
| Per-customer ordering model (keys, sessions, partitions, delivery guarantees) | 5 | capability | Ordering per customer was stressed in the request and decides whether a candidate fits the flow at all. |
| Monthly cost at the confirmed load | 4 | cost | The $500/month budget was stressed, and cost differs by pricing model (per operation, per throughput unit, per event). The load basis is the sustained 2,000 messages/s confirmed in Q&A. |
| Throughput headroom above 2,000 messages/s at peak | 4 | performance | The 2,000 messages/s peak was stated; headroom shows how much growth the choice tolerates. |
| Operational effort for six microservices | 3 | operations | Six services share one messaging backbone; tiers, partitions, scaling and monitoring add operating work. |
| Service maturity and published SLA | 2 | maturity | A production-grade, generally available service with a published SLA reduces adoption risk. |

## Open questions
None.
