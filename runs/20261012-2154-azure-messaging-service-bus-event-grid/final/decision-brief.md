# Tech Decision Brief: Azure messaging service for six microservices

## 1. Decision
**Recommendation:** Azure Event Hubs · **Confidence:** high

Azure Event Hubs is the only candidate with no unmet hard constraint: partition keys keep each customer's messages in send order [S1], two throughput units cover 2,000 events/s [S2], and the cost is about $189 per month at the confirmed load [S3]. Service Bus is ruled out on cost, since one Premium messaging unit alone is about $677 per month [S4], and Event Grid is ruled out on ordering, since its push delivery does not guarantee order [S5].

## 2. Context and confirmed requirements
- Question: Which Azure messaging service should integrate six microservices, given about 2,000 messages/s at peak, per-customer message ordering and a budget under $500 per month?
- Context: Stack is Microsoft Azure (fixed) with six microservices. Languages, runtimes and existing messaging are not stated. Team and deadline are not stated. Message size, retention and delivery guarantees are not stated.
- Load basis (confirmed in Q&A): sustained 2,000 messages/s around the clock, about 5.2 billion messages per 30-day month.
- Assumed: per-customer ordering is a must-have, meaning messages sharing a customer key are delivered in send order. The $500/month budget is a hard ceiling on list-price cost of the messaging service itself, excluding the microservices' compute.
- H1 (capability): Preserves message order per customer: messages sharing a customer key are delivered in send order to a consumer.
- H2 (performance): Documented maximum throughput of a single deployable configuration is at least 2,000 messages/s.
- H3 (cost): Estimated monthly list-price cost is less than USD 500 at a sustained load of 2,000 messages/s around the clock (about 5.2 billion messages per 30-day month).
- H4 (compatibility): Runs on Microsoft Azure.
- P1: None stated by the user.

## 3. Options considered
### Azure Service Bus
Sessions give first-in, first-out processing per session ID, with an exclusive lock per session [S6], but they must be enabled when the queue or subscription is created [S7]. Standard is limited to 1,000 operations per second per namespace [S8], and its settlement cost alone is about $1,816 per month [S4]. Premium is billed per messaging unit at $0.9275 per unit-hour, about $677 per month for one unit [S4], and scales in steps of 1, 2, 4, 8 and 16 units [S9]. Its benchmark of about 4 MB/s per unit gives no messages-per-second figure [S10].

### Azure Event Grid
Event Grid doesn't guarantee order for event delivery, so subscribers may receive events out of order [S5], and the pull-delivery pages retrieved state no ordering guarantee either [S11]. Each throughput unit gives 1,000 ingress events/s or 1 MB/s, up to 40 units per namespace [S12]. Publish operations at 5.184 billion events per month cost about $3,110, plus about $58 for two units, about $3,168 per month before receive and acknowledge operations [S13][S14].

### Azure Event Hubs
Azure Event Hubs is a fully managed Azure event-streaming service with Kafka, AMQP and HTTPS protocols [S15]. A partition key sends all events with the same key to one partition, where they stay in arrival order [S1], but pinning a key trades availability for consistency: the send fails rather than going to another partition [S16]. A single key cannot use more than one partition's throughput, about 1 MB/s of ingress on Standard [S17]. Standard throughput units give 1 MB/s or 1,000 ingress events/s each, so 2 units cover 2,000 events/s, with up to 40 units per namespace [S2]. Standard costs $0.03 per TU-hour plus $0.028 per million ingress events, about $189 per month at 2 units and about $211 at 3 units [S3]; the Standard SLA is 99.9% [S18].

## 4. Evaluation matrix

### Hard constraints
| Constraint | Azure Service Bus | Azure Event Grid | Azure Event Hubs |
|---|---|---|---|
| H1 Preserves per-customer message order | met [S6][S7] | unmet [S5][S11] | met [S1][S16] |
| H2 Throughput of at least 2,000 messages/s | met (inferred, see Section 8) [S9][S10] | met [S12] | met [S2] |
| H3 Cost under USD 500/month at the confirmed load | unmet [S4] | unmet [S13][S14] | met [S3] |
| H4 Runs on Microsoft Azure | met [S19] | met [S20] | met [S15] |

### Weighted criteria
Scores 1–5 (5 = best); total = Σ weight × score.

| Criterion | Weight | Azure Service Bus | Azure Event Grid | Azure Event Hubs |
|---|---|---|---|---|
| Per-customer ordering model (keys, sessions, partitions, delivery guarantees) | 5 | 4 [S6][S7] | 1 [S5] | 3 [S1][S16][S17] |
| Monthly cost at the confirmed load | 4 | 1 [S4] | 1 [S13][S14] | 5 [S3] |
| Throughput headroom above 2,000 messages/s at peak | 4 | 2 [S9][S10] | 4 [S12] | 4 [S2] |
| Operational effort for six microservices | 3 | 3 [S21][S9] | 2 [S22] | 3 [S23] |
| Service maturity and published SLA | 2 | 3 [S19] | 2 [S20][S24] | 4 [S18] |
| **Total** | | **47** | **35** | **68** |

## 5. Recommendation and rationale
Azure Event Hubs wins because it is the only candidate that passes all four hard constraints: ordering per key [S1], 2,000 events/s with two throughput units [S2], and about $189 per month at the confirmed load [S3]. Its ordering holds within a partition, so one customer cannot use more than about 1 MB/s of ingress on Standard [S17]. Choose Service Bus instead only if per-session processing with an exclusive lock per session is required and the budget rises to at least about $677 per month for Premium [S4][S9].

## 6. Risks and mitigations
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| One customer's traffic is capped at one partition, about 1 MB/s of ingress on Standard [S17] | medium | high | Measure per-customer peak volume before go-live and spread load across keys. Premium costs about $749 per month per unit, above the budget [S3]. |
| Pinning a key means a send fails when its partition is unavailable instead of going elsewhere [S16] | low | high | Retry sends with backoff and monitor partition health. |
| Adding partitions changes the key-to-partition mapping and can cause out-of-order delivery [S25] | medium | high | Set the partition count at creation and drain existing partitions before any increase. |
| Messages above 1 KB raise the throughput-unit count, for example about 4 units at 2 KB [S2][S3] | medium | medium | Confirm message size; at 2 KB the cost is about $233 per month, still under budget. |
| Costs are list prices and exclude taxes, capture, geo-replication and other meters [S3] | medium | medium | Re-price the chosen configuration with all meters before sign-off. |
| No built-in dead-letter queue, and consumers need storage for checkpoints [S23] | medium | medium | Build poison-message handling and checkpoint storage into each consumer. |

## 7. Adoption plan
1. Confirm message size, retention and per-customer peak volume, since they set the unit count and the per-key limit (Section 8).
2. Create an Event Hubs namespace on the Standard tier with 2 throughput units, with 3 units as headroom at about $211 per month [S3].
3. Use the customer identifier as the partition key so each customer's events stay in send order [S1].
4. Set the partition count at creation, since Standard partition counts are fixed [S17], and drain partitions before any later increase [S25].
5. Build dead-letter handling and checkpoint storage into each consumer [S23].
6. Load-test at 2,000 messages/s with the expected message size, and re-price the configuration with all meters before approval [S3].

## 8. Open questions
- Message size, retention and per-customer peak volume are not stated. The Event Hubs unit counts assume messages of 1 KB or less, and one customer key is capped at about 1 MB/s of ingress on Standard [S17].
- Service Bus H2 is marked met only by inference from the 4 MB/s per unit benchmark, since no messages-per-second figure was documented [S10]. This does not change the recommendation, because Service Bus fails H3 [S4].
- Event Grid pull-delivery ordering is not documented in the pages retrieved, so its unmet status rests on the push-delivery statement [S11].
- SLA percentages for Service Bus and Event Grid, and the SLA for Event Hubs Premium, were not retrieved [S19][S20].
- General availability status for each tier was not separately confirmed.
- Costs are USD list prices for East US, using a 730-hour month and a 30-day message count as assumptions. Taxes, discounts and other meters are excluded [S3].

## 9. Sources
[S1] Scaling with Event Hubs (partitions and partition keys) — https://learn.microsoft.com/azure/event-hubs/event-hubs-scalability — retrieved 2026-10-12 — via mcp:mslearn
[S2] Azure Event Hubs quotas and limits — https://learn.microsoft.com/azure/event-hubs/event-hubs-quotas — retrieved 2026-10-12 — via mcp:mslearn
[S3] Azure Retail Prices API, Event Hubs, armRegionName eq 'eastus' — https://prices.azure.com/api/retail/prices?$filter=serviceName%20eq%20%27Event%20Hubs%27%20and%20armRegionName%20eq%20%27eastus%27 — retrieved 2026-10-12 — via web
[S4] Azure Retail Prices API, Service Bus, armRegionName eq 'eastus' — https://prices.azure.com/api/retail/prices?$filter=serviceName%20eq%20%27Service%20Bus%27%20and%20armRegionName%20eq%20%27eastus%27 — retrieved 2026-10-12 — via web
[S5] Message push delivery and retry with namespace topics — https://learn.microsoft.com/azure/event-grid/namespace-delivery-retry — retrieved 2026-10-12 — via mcp:mslearn
[S6] Message sessions — https://learn.microsoft.com/azure/service-bus-messaging/message-sessions — retrieved 2026-10-12 — via mcp:mslearn
[S7] Enable message sessions for an Azure Service Bus queue or a subscription — https://learn.microsoft.com/azure/service-bus-messaging/enable-message-sessions — retrieved 2026-10-12 — via mcp:mslearn
[S8] Azure subscription and service limits, quotas, and constraints (Service Bus) — https://learn.microsoft.com/azure/azure-resource-manager/management/azure-subscription-service-limits — retrieved 2026-10-12 — via mcp:mslearn
[S9] Azure Service Bus premium messaging tier — https://learn.microsoft.com/azure/service-bus-messaging/service-bus-premium-messaging — retrieved 2026-10-12 — via mcp:mslearn
[S10] Best practices for improving performance with Azure Service Bus — https://learn.microsoft.com/azure/service-bus-messaging/service-bus-performance-improvements — retrieved 2026-10-12 — via mcp:mslearn
[S11] Pull delivery with HTTP — https://learn.microsoft.com/azure/event-grid/pull-delivery-overview — retrieved 2026-10-12 — via mcp:mslearn
[S12] Azure Event Grid quotas and limits — https://learn.microsoft.com/azure/event-grid/quotas-limits — retrieved 2026-10-12 — via mcp:mslearn
[S13] Azure Retail Prices API, Event Grid, armRegionName eq 'eastus' — https://prices.azure.com/api/retail/prices?$filter=serviceName%20eq%20%27Event%20Grid%27%20and%20armRegionName%20eq%20%27eastus%27 — retrieved 2026-10-12 — via web
[S14] Azure Event Grid namespaces, CloudEvents support — https://learn.microsoft.com/azure/event-grid/namespaces-cloud-events — retrieved 2026-10-12 — via mcp:mslearn
[S15] What is Azure Event Hubs? — https://learn.microsoft.com/azure/event-hubs/event-hubs-about — retrieved 2026-10-12 — via mcp:mslearn
[S16] Availability and consistency in Event Hubs — https://learn.microsoft.com/azure/event-hubs/event-hubs-availability-and-consistency — retrieved 2026-10-12 — via mcp:mslearn
[S17] Event Hubs features and terminology — https://learn.microsoft.com/azure/event-hubs/event-hubs-features — retrieved 2026-10-12 — via mcp:mslearn
[S18] Architecture best practices for Azure Event Hubs, reliability — https://learn.microsoft.com/azure/well-architected/service-guides/azure-event-hubs#reliability — retrieved 2026-10-12 — via mcp:mslearn
[S19] Reliability in Azure Service Bus — https://learn.microsoft.com/azure/reliability/reliability-service-bus — retrieved 2026-10-12 — via mcp:mslearn
[S20] Reliability in Azure Event Grid — https://learn.microsoft.com/azure/reliability/reliability-event-grid — retrieved 2026-10-12 — via mcp:mslearn
[S21] Azure Service Bus - advanced features — https://learn.microsoft.com/azure/service-bus-messaging/advanced-features-overview — retrieved 2026-10-12 — via mcp:mslearn
[S22] What's new in Azure Event Grid? — https://learn.microsoft.com/azure/event-grid/whats-new — retrieved 2026-10-12 — via mcp:mslearn
[S23] Reliability in Azure Event Hubs — https://learn.microsoft.com/azure/reliability/reliability-event-hubs — retrieved 2026-10-12 — via mcp:mslearn
[S24] Receive events using pull delivery with Java — https://learn.microsoft.com/azure/event-grid/receive-events-from-namespace-topics-java — retrieved 2026-10-12 — via mcp:mslearn
[S25] Dynamically add partitions to an event hub — https://learn.microsoft.com/azure/event-hubs/dynamically-add-partitions — retrieved 2026-10-12 — via mcp:mslearn
