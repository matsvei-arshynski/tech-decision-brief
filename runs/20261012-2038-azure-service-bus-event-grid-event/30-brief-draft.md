---
artifact: brief
agent: brief-synthesizer
run_id: 20261012-2038-azure-service-bus-event-grid-event
attempt: 1
---
# Tech Decision Brief: Messaging service for six Azure microservices

## 1. Decision
**Recommendation:** none — no candidate meets every hard constraint · **Confidence:** low

No candidate qualifies, so this brief recommends nothing. Azure Service Bus is the only candidate with native per-customer ordering through sessions [S1], but both of its tiers break the budget: one Premium messaging unit costs $677.08 per month, and Standard operation charges reach about $2,843 per month at 2,000 messages/s [S2]. Confidence is low because the average message size, which the requirements do not state, decides the throughput and cost rows for every candidate.

## 2. Context and confirmed requirements
- **Question:** Which Azure messaging service (Service Bus, Event Grid or Event Hubs) should integrate six microservices, given about 2,000 messages/s at peak, per-customer ordering on all flows and a budget under $500/month?
- **Question type:** architecture.
- **Context:** Azure is the fixed cloud. Six microservices; languages, runtime and team are not stated. Average message rate and size are not stated. Traffic is commands and work queues (point-to-point); no pub/sub fan-out is stated.
- **Assumptions (from the requirements):** the budget is in USD; the cost check uses sustained 2,000 messages/s, 24x7, with messages up to 64 KB, as the worst case; "ordering per customer" means messages sharing a customer key are processed in the order sent.
- **H1** Sustains at least 2,000 messages/s at peak (performance).
- **H2** Delivers messages for the same customer in send order, for all message flows (capability).
- **H3** Total messaging cost is under 500 USD per month at the assumed worst-case volume (cost).
- **H4** Runs as a managed service on Azure (compatibility).
- **P1** None stated.

## 3. Options considered
### Azure Service Bus
Standard and Premium both offer sessions: a receiver holds a session's exclusive lock and processes that session's messages in order, while other sessions run in parallel [S1]. Standard is throttled to about 500 round-trip messages/s at 2,000 messages/s [S3]. Premium has no fixed operations-per-second limit [S4], and its units top out at 16 per namespace [S5]; a benchmark of about 4 MB/s per unit implies about 32 units for 64 KB messages at 2,000/s (calculated) [S6]. Premium reached general availability on July 15, 2016 [S7]; no GA announcement for the Standard or Basic tier was found.

### Event Grid
Event Grid namespaces (Standard tier) offer pull delivery [S8], and push delivery to Event Hubs or webhooks [S9]; pull reached GA in November 2023, push to Event Hubs in May 2024, and push to webhooks in November 2024 [S10]. Event Grid does not guarantee delivery order, so subscribers can receive events out of order [S11][S12]. Each throughput unit takes 1,000 events/s or 1 MB/s of ingress, up to 40 units per namespace [S13]; at 2,000 events/s, event operations alone cost about $3,110 per month, so at least $3,168 with two units (calculated) [S14].

### Event Hubs
Event Hubs is a partitioned append-only log: a partition key sends all of one customer's events to one partition, which stores and delivers them in arrival order [S15][S16][S17]. Order is kept only within a partition, and if that partition is unavailable the send fails rather than moving to another one [S17]. On Standard, one throughput unit gives 1 MB/s or 1,000 events/s of ingress, up to 40 units and 32 partitions per hub [S18][S19], and the partition count cannot change after creation [S15]. Premium reached general availability on November 2, 2021 [S20]; no tier-level GA announcement for Standard was found, and one Premium processing unit costs $749.71 per month [S21].

## 4. Evaluation matrix

### Hard constraints
| Constraint | Azure Service Bus | Event Grid | Event Hubs |
|---|---|---|---|
| H1 Sustains at least 2,000 messages/s at peak | unknown [S3][S6] — Standard unmet at about 500 round trips/s; Premium depends on message size | unknown [S13] — two units suffice only for about 1 KB events; 40-unit cap reached at about 20 KB | unknown [S18][S19][S22] — Standard: two units suffice only for about 1 KB events; Premium has no fixed unit cap |
| H2 Same-customer messages delivered in send order | met [S1] — sessions give FIFO per session ID; enabled at creation; not on Basic | unmet [S11][S12] — no delivery order guarantee | met [S15][S23] — one customer's events sent to one partition are read in order |
| H3 Cost under 500 USD per month at worst case | unmet [S2] — Premium one unit $677.08; Standard about $2,843 in operations at 2,000/s (calculated) | unmet [S14][S13] — at least $3,168 per month (calculated) | unmet [S21][S18] — Premium one unit $749.71; Standard at 40 units about $1,021; 64 KB needs 128 units; under $500 only for about 8 KB average (16 units) |
| H4 Runs as a managed service on Azure | met [S24] — fully managed, with an SLA for all namespaces | met [S10][S25] — managed service with GA push and pull delivery | met [S16] — fully managed PaaS with a 99.99% SLA |

### Weighted criteria
Scores 1–5 (5 = best); total = Σ weight × score.

| Criterion | Weight | Azure Service Bus | Event Grid | Event Hubs |
|---|---|---|---|---|
| Peak throughput limits | 5 | 2 [S3][S6] — Standard capped near 500 round trips/s; Premium rests on a benchmark | 3 [S13] — two units suffice at about 1 KB; 40-unit cap | 3 [S18][S19] — two units suffice at about 1 KB; 40-unit cap on Standard |
| Per-customer ordering support | 5 | 5 [S1] — native FIFO per session | 1 [S11][S12] — no delivery order guarantee | 4 [S15][S17] — partition key keeps one customer in order; order lost if the pinned partition is unavailable |
| Monthly cost at assumed volume | 4 | 2 [S2] — Premium unit $677.08 minimum; Standard about $2,843 | 1 [S14] — at least $3,168 | 3 [S21][S19] — about $189 at two units with small messages; over budget at 64 KB |
| Messaging pattern fit | 3 | 5 [S26][S27] — competing consumers with dead-lettering | 2 [S28][S29] — publish-subscribe push; pull can approximate work queues | 2 [S15] — log streaming; competing consumers capped at partition count |
| Operational effort for six services | 3 | 4 [S30][S27] — dead-lettering, deferral and scheduled messages built in; dead-letter queue not cleaned up automatically | 2 [S11] — dead-lettering needs Blob Storage and is off by default | 2 [S31] — no dead-lettering; failures handled in consumer code |
| **Total** | | **70** | **36** | **59** |

## 5. Recommendation and rationale
No candidate is recommended. Azure Service Bus has the highest total (70), but it fails H3, so it is not eligible. Event Grid (36) fails H2 and H3. Event Hubs (59) fails H3 at the 64 KB worst case: Standard cannot carry that load, and Premium costs $749.71 per month [S21][S18]. The hard constraints decide first, and no candidate clears them, so the totals do not change the outcome.

I would choose Event Hubs if the average message is about 8 KB or less and the team accepts a partition-key design: Standard then fits under $500 per month at 16 units [S21], and it keeps per-customer order [S15]. It has no dead-lettering, so consumers must handle failures [S31]. I would choose Azure Service Bus only if the budget rises to at least one Premium messaging unit ($677.08 per month) [S2] and a load test at the confirmed message size shows 2,000 messages/s [S6].

## 6. Risks and mitigations
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Message size is unstated. At 64 KB and 2,000 messages/s the stream is 128 MB/s, beyond the 40 MB/s that 40 Event Hubs Standard units carry [S18] | high | high | Confirm average and maximum message size and rate with the user, then re-run the H1 and H3 checks |
| Service Bus Premium throughput rests on a benchmark of about 4 MB/s per unit, not a guarantee [S6] | medium | high | Load test at the confirmed size and tier before any choice |
| Event Grid does not guarantee order, so per-customer order would need custom work [S11] | high | high | Keep Event Grid off ordered flows |
| Event Hubs pins a customer to one partition; if that partition is unavailable, sends fail [S17] | medium | medium | Accept the trade-off, or add producer-side retry logic |
| Event Hubs Standard partition count cannot change after creation [S15], and changing it remaps keys [S32] | medium | high | Set the partition count at creation with headroom, within the 32-partition Standard limit [S19] |
| Event Hubs has no dead-lettering; failed events are handled in consumer code [S31] | high | medium | Build retry and failure handling into each consumer |
| Prices are East US list prices in USD; discounts and other regions were not checked [S2] | medium | medium | Verify in the Azure pricing calculator for the target region and agreement |

## 7. Adoption plan
1. Confirm the average and maximum message size and the sustained rate with the user, then re-run the H1 and H3 checks.
2. Confirm whether the $500 budget is fixed. Service Bus Premium starts at $677.08 per month [S2]; Event Hubs Standard fits only for small messages [S21].
3. If Event Hubs stays in scope: set the partition count at creation [S15], use the customer key as the partition key [S15], and plan consumer-side failure handling [S31].
4. If Service Bus stays in scope: run a load test at the confirmed size and tier, since Premium throughput is benchmark-only [S6].
5. Verify prices in the Azure pricing calculator for the target region [S2].

## 8. Open questions
- Average and maximum message size and rate are not stated. H1 for all three candidates, and H3 for Event Hubs, depend on them.
- Event Grid ordering: H2 is unmet based on the push and Basic-tier delivery pages [S11][S12]. Ordering for pull delivery on namespace topics was not documented in the pages retrieved; the pull model adds no ordering guarantee there [S29].
- Event Hubs H3: the docs research marked it unmet and the patterns research marked it unknown. This brief uses unmet, as the merge rule requires.
- Event Grid push destinations: the docs research lists Event Hubs and webhooks [S9]; the patterns research lists Event Hubs only. This does not change the decision.
- The GA dates for Service Bus Premium [S7] and Event Hubs Premium [S20] come from search results; the pages returned no content when fetched. No GA announcement was found for the Standard tiers.
- Regional availability of Event Grid namespaces, and zone redundancy for Event Hubs Standard, were not verified; zone redundancy cannot be enabled on an existing older namespace [S32].
- The meaning of the Service Bus Standard "$10 per month" base meter is not stated on the price page [S2].

## 9. Sources
[S1] Message sessions — https://learn.microsoft.com/azure/service-bus-messaging/message-sessions — retrieved 2026-10-12 — via mcp:mslearn
[S2] Azure Retail Prices API, Service Bus, eastus, USD — https://prices.azure.com/api/retail/prices?$filter=serviceName%20eq%20'Service%20Bus'%20and%20armRegionName%20eq%20'eastus' — retrieved 2026-10-12 — via web
[S3] Throttling operations on Azure Service Bus — https://learn.microsoft.com/azure/service-bus-messaging/service-bus-throttling — retrieved 2026-10-12 — via mcp:mslearn
[S4] Service Bus quotas — https://learn.microsoft.com/azure/service-bus-messaging/service-bus-quotas — retrieved 2026-10-12 — via mcp:mslearn
[S5] Azure Service Bus premium messaging tier — https://learn.microsoft.com/azure/service-bus-messaging/service-bus-premium-messaging — retrieved 2026-10-12 — via mcp:mslearn
[S6] Best practices for improving performance with Azure Service Bus — https://learn.microsoft.com/azure/service-bus-messaging/service-bus-performance-improvements — retrieved 2026-10-12 — via mcp:mslearn
[S7] General availability: Service Bus Premium Messaging released to general availability — https://azure.microsoft.com/updates/service-bus-premium-messaging-released-to-general-availability/ — retrieved 2026-10-12 — via web
[S8] Azure Event Grid namespace concepts — https://learn.microsoft.com/azure/event-grid/concepts-event-grid-namespaces — retrieved 2026-10-12 — via mcp:mslearn
[S9] Azure Event Grid namespaces push delivery overview — https://learn.microsoft.com/azure/event-grid/namespace-push-delivery-overview — retrieved 2026-10-12 — via mcp:mslearn
[S10] What's new in Azure Event Grid? — https://learn.microsoft.com/azure/event-grid/whats-new — retrieved 2026-10-12 — via mcp:mslearn
[S11] Message push delivery and retry with namespace topics — https://learn.microsoft.com/azure/event-grid/namespace-delivery-retry — retrieved 2026-10-12 — via mcp:mslearn
[S12] Event Grid message delivery and retry — https://learn.microsoft.com/azure/event-grid/delivery-and-retry — retrieved 2026-10-12 — via mcp:mslearn
[S13] Azure Event Grid quotas and limits — https://learn.microsoft.com/azure/event-grid/quotas-limits — retrieved 2026-10-12 — via mcp:mslearn
[S14] Azure Retail Prices API, Event Grid, eastus, USD — https://prices.azure.com/api/retail/prices?$filter=serviceName%20eq%20'Event%20Grid'%20and%20armRegionName%20eq%20'eastus' — retrieved 2026-10-12 — via web
[S15] Event Hubs features and terminology — https://learn.microsoft.com/azure/event-hubs/event-hubs-features — retrieved 2026-10-12 — via mcp:mslearn
[S16] What is Azure Event Hubs? — https://learn.microsoft.com/azure/event-hubs/event-hubs-about — retrieved 2026-10-12 — via mcp:mslearn
[S17] Availability and consistency in Event Hubs — https://learn.microsoft.com/azure/event-hubs/event-hubs-availability-and-consistency — retrieved 2026-10-12 — via mcp:mslearn
[S18] Azure Event Hubs quotas and limits — https://learn.microsoft.com/azure/event-hubs/event-hubs-quotas — retrieved 2026-10-12 — via mcp:mslearn
[S19] Scaling with Event Hubs — https://learn.microsoft.com/azure/event-hubs/event-hubs-scalability — retrieved 2026-10-12 — via mcp:mslearn
[S20] General availability: Event Hubs Premium — https://azure.microsoft.com/en-au/updates/general-availability-event-hubs-premium — retrieved 2026-10-12 — via web
[S21] Azure Retail Prices API, Event Hubs, eastus, USD — https://prices.azure.com/api/retail/prices?$filter=serviceName%20eq%20'Event%20Hubs'%20and%20armRegionName%20eq%20'eastus' — retrieved 2026-10-12 — via web
[S22] Azure Event Hubs Premium overview — https://learn.microsoft.com/azure/event-hubs/event-hubs-premium-overview — retrieved 2026-10-12 — via mcp:mslearn
[S23] Performance and scale guidance for Event Hubs and Azure Functions — https://learn.microsoft.com/azure/architecture/serverless/event-hubs-functions/performance-scale — retrieved 2026-10-12 — via mcp:mslearn
[S24] Reliability in Azure Service Bus — https://learn.microsoft.com/azure/reliability/reliability-service-bus — retrieved 2026-10-12 — via mcp:mslearn
[S25] Choose the right Event Grid tier for your solution — https://learn.microsoft.com/azure/event-grid/choose-right-tier — retrieved 2026-10-12 — via mcp:mslearn
[S26] Competing Consumers pattern — https://learn.microsoft.com/azure/architecture/patterns/competing-consumers — retrieved 2026-10-12 — via mcp:mslearn
[S27] Overview of Service Bus dead-letter queues — https://learn.microsoft.com/azure/service-bus-messaging/service-bus-dead-letter-queues — retrieved 2026-10-12 — via mcp:mslearn
[S28] Asynchronous messaging options — https://learn.microsoft.com/azure/architecture/guide/technology-choices/messaging — retrieved 2026-10-12 — via mcp:mslearn
[S29] Pull delivery with HTTP — https://learn.microsoft.com/azure/event-grid/pull-delivery-overview — retrieved 2026-10-12 — via mcp:mslearn
[S30] Azure Service Bus advanced features — https://learn.microsoft.com/azure/service-bus-messaging/advanced-features-overview — retrieved 2026-10-12 — via mcp:mslearn
[S31] Choose between Azure Event Grid, Event Hubs, and Service Bus — https://learn.microsoft.com/azure/service-bus-messaging/compare-messaging-services — retrieved 2026-10-12 — via mcp:mslearn
[S32] Event Hubs frequently asked questions — https://learn.microsoft.com/azure/event-hubs/event-hubs-faq — retrieved 2026-10-12 — via mcp:mslearn
