---
artifact: docs
agent: docs-researcher
run_id: 20261012-2154-azure-messaging-service-bus-event-grid
attempt: 1
---
# Official documentation

## Summary
On documented evidence, Azure Event Hubs is the only candidate that meets all four hard constraints: partition-key ordering, 2 throughput units for 2,000 events/s, and about $189 to $211 per month at the confirmed load of 5.184 billion messages. Azure Service Bus offers per-session FIFO, but its Premium tier costs at least $677 per month for one messaging unit, and Standard's 1,000 operations/s limit does not fit per-message settlement at 2,000 messages/s. Azure Event Grid documents no ordering guarantee for namespace delivery, and its per-event operation charge puts publish alone near $3,170 per month. Costs are my calculations from retail list prices, using 730 hours per month; the gaps are listed under Open issues.

## Findings

### Azure Service Bus
- Tiers: Basic (queues only), Standard (topics, subscriptions, sessions, transactions, duplicate detection, billed per operation on shared capacity), and Premium (dedicated messaging units). [S1]
- Premium namespaces take 1, 2, 4, 8 or 16 messaging units (MUs); the MU is the single priced unit, and operations are not charged separately on Premium. [S1][S6]
- Basic and Standard are limited to 1,000 operations per second; Premium has no fixed operations-per-second limit and its throughput depends on the MU count. [S2]
- The Premium benchmark is about 4 MB/s per MU of ingress and egress; the sample uses no advanced features, so real throughput depends on the workload. [S3]
- Peek-lock is the default receive mode: the client receives a message and then sends a separate complete request. ReceiveAndDelete combines both steps to cut the operation count, at the cost of delivery assurance. [S3]
- Sessions give FIFO processing: a sender sets a session ID, a session receiver holds an exclusive lock on that session, and sessions are supported on Standard and Premium, not Basic. [S4]
- Premium has a higher SLA when the namespace is Premium, zone-redundant and partitioned; the percentages are not in the retrieved text. [S5]
- Retail list prices (USD, armRegionName eq 'eastus'): Premium MU $0.9275 per hour; Standard base unit $10 per month; Standard operations $0.0 for the first 13M per month, $0.8 per million from 13M, $0.5 per million from 100M, and $0.2 per million from 2,500M. [S7]
- Cost at 5.184 billion messages per month, Premium: one MU costs $0.9275 × 730 = $677.08 per month before any messages, so H3 cannot be met on Premium. [S7]
- Cost at 5.184 billion messages per month, Standard, settlement only: 87M × $0.8 + 2,400M × $0.5 + 2,684M × $0.2 = $1,806.40, plus $10 base, about $1,816 per month. This counts only one peek-lock complete per message and no sends or receives. [S3][S7]
- The Well-Architected guidance says batching reduces billable operations on pay-per-operation tiers. [S8]

### Azure Event Grid
- Namespaces (Standard tier) support pull delivery, where queue subscriptions receive, acknowledge, release, reject and renew locks, and push delivery. The only push destination currently supported is Event Hubs. [S11][S12]
- Per throughput unit (TU), namespaces allow 1,000 ingress events/s or 1 MB/s (whichever comes first) and 2,000 egress events/s or 2 MB/s. A namespace can have up to 40 TUs, the maximum event size is 1 MB, and retention is up to 7 days. [S9]
- Ordering: Event Grid namespace push delivery states "Event Grid doesn't guarantee order for event delivery, so subscribers may receive them out of order." The pull-delivery pages retrieved do not describe any ordering guarantee either. [S10][S11]
- Events over 64 KB are charged in 64 KB increments, so each event of 64 KB or less is one billable operation. [S16]
- Standard tier list prices (USD, armRegionName eq 'eastus'): $0.04 per TU-hour; event operations $0.0 for the first 1M per month, then $0.6 per million. [S15][S14]
- Cost at 5.184 billion events per month: 2 TU = $0.04 × 2 × 730 = $58.40; publish event operations = (5,184M − 1M) × $0.6 = $3,109.80; total about $3,168 per month before receive and acknowledge operations. This assumes events of 64 KB or less. [S15][S16]
- Autoscale for namespaces is in preview (July 2026 release notes); this assessment does not rely on it. [S13]
- The pull-delivery data-plane SDK for Java is in beta. [S18]
- The Event Grid availability SLA covers event publishing; the percentage is not in the retrieved text. [S17]

### Azure Event Hubs
- Tiers: Basic, Standard (up to 40 TUs), Premium (up to 16 processing units, PUs, with availability zones from the first PU) and Dedicated (capacity units). [S19][S26]
- Standard: 1 TU = 1 MB/s or 1,000 ingress events/s, so 2,000 events/s needs 2 TUs and the namespace can scale to 40 TUs. [S19]
- Standard retention is up to 7 days; Premium retention is up to 90 days. [S19]
- A partition key sends events with the same key to the same partition, where they are kept in arrival order; the consumer that reads that partition receives them in order. [S20]
- Pinning events to a partition trades availability for consistency: if that partition is unavailable, the send fails rather than going to another partition. [S21]
- Adding partitions changes the key-to-partition hash, which can cause out-of-order delivery; drain existing partitions before increasing the count. [S22]
- Retail list prices (USD, armRegionName eq 'eastus'): Standard TU $0.03 per hour; Standard ingress events $0.028 per million; Premium PU $1.027 per hour. [S24]
- Standard billing is per TU-hour plus per-million ingress events; Premium and Dedicated bill per unit with ingress included. [S23]
- Cost at 5.184 billion events per month, Standard: 2 TU = $0.03 × 2 × 730 = $43.80 plus ingress 5,184M × $0.028 = $145.15, total $188.95; 3 TU (headroom) = $65.70 + $145.15 = $210.85. [S24]
- Cost, Premium: one PU = $1.027 × 730 = $749.71 per month minimum, above the $500 budget. [S24][S26]
- The Well-Architected reliability guidance gives an SLA of 99.9% for Standard and 99.99% for Dedicated. [S25]
- Event Hubs is a fully managed Azure event-streaming service with Kafka, AMQP and HTTPS protocols. [S27]

## Constraint check
| Constraint | Candidate | Status | Evidence |
|---|---|---|---|
| H1 | Azure Service Bus | met | Sessions give FIFO per session ID; Standard and Premium support sessions [S4] |
| H1 | Azure Event Grid | unmet | Namespace push delivery does not guarantee order; no ordering guarantee found for pull delivery [S10][S11] |
| H1 | Azure Event Hubs | met | Same partition key keeps events in arrival order within that partition; ordering holds per partition [S20][S21] |
| H2 | Azure Service Bus | unknown | Standard is limited to 1,000 operations/s, so peek-lock settlement at 2,000 messages/s exceeds it [S2][S3]; Premium states no fixed ops/s and about 4 MB/s per MU, with no messages/s figure [S2][S3] |
| H2 | Azure Event Grid | met | 2 TUs give 2,000 ingress events/s; up to 40 TUs per namespace [S9] |
| H2 | Azure Event Hubs | met | Standard: 1 TU = 1,000 ingress events/s, 2 TUs for 2,000/s, up to 40 TUs [S19] |
| H3 | Azure Service Bus | unmet | Premium 1 MU = $677.08/month minimum; Standard settlement alone is about $1,816/month [S7] |
| H3 | Azure Event Grid | unmet | 2 TUs $58.40 plus publish operations about $3,109.80 per month, before receive and acknowledge [S15][S16] |
| H3 | Azure Event Hubs | met | Standard 2 TU $188.95 per month, 3 TU $210.85 per month [S24] |
| H4 | Azure Service Bus | met | Azure messaging service [S1] |
| H4 | Azure Event Grid | met | Azure event routing service with namespace pull and push delivery [S12][S17] |
| H4 | Azure Event Hubs | met | Azure fully managed event-streaming service [S27] |

## Open issues
- Message size, retention and delivery guarantees are not stated in the requirements. The Event Grid cost assumes events of 64 KB or less; Service Bus Premium throughput depends on message size; the Event Hubs cost assumes events are billed one per message.
- Service Bus Premium messages-per-second capacity is not documented; only the 4 MB/s per MU benchmark was found. H2 for Service Bus stays unknown until a message size is set.
- Service Bus: whether a batched send or receive counts as one billable operation was not confirmed. The Standard figures above assume one peek-lock complete per message. ReceiveAndDelete was not costed.
- Event Grid: pull-delivery ordering was not explicitly documented; the only explicit statement is for push delivery. Receive and acknowledge operation billing was not confirmed, so $3,168 is a lower bound.
- SLA percentages for Service Bus and Event Grid were not retrieved. The consolidated Microsoft SLA page did not list these services [S28]. Event Hubs Premium's SLA was not found.
- Lifecycle: general-availability status was not separately confirmed for each service or tier beyond the current documentation.
- Pricing: retail figures come from the Azure Retail Prices API for armRegionName eq 'eastus' in USD, and the pricing pages mask their numbers. Taxes, capture, geo-replication and other meters are excluded. The 730-hour month and 30-day message count are assumptions.

## Sources
[S1] Azure Service Bus premium messaging tier — https://learn.microsoft.com/azure/service-bus-messaging/service-bus-premium-messaging — retrieved 2026-10-12 — via mcp:mslearn
[S2] Azure subscription and service limits, quotas, and constraints (Service Bus) — https://learn.microsoft.com/azure/azure-resource-manager/management/azure-subscription-service-limits — retrieved 2026-10-12 — via mcp:mslearn
[S3] Best practices for improving performance with Azure Service Bus — https://learn.microsoft.com/azure/service-bus-messaging/service-bus-performance-improvements — retrieved 2026-10-12 — via mcp:mslearn
[S4] Message sessions — https://learn.microsoft.com/azure/service-bus-messaging/message-sessions — retrieved 2026-10-12 — via mcp:mslearn
[S5] Reliability in Azure Service Bus — https://learn.microsoft.com/azure/reliability/reliability-service-bus — retrieved 2026-10-12 — via mcp:mslearn
[S6] Azure Service Bus pricing — https://azure.microsoft.com/pricing/details/service-bus/ — retrieved 2026-10-12 — via web
[S7] Azure Retail Prices API, Service Bus, armRegionName eq 'eastus' — https://prices.azure.com/api/retail/prices?$filter=serviceName%20eq%20%27Service%20Bus%27%20and%20armRegionName%20eq%20%27eastus%27 — retrieved 2026-10-12 — via web
[S8] Architecture best practices for Azure Service Bus, cost optimization — https://learn.microsoft.com/azure/well-architected/service-guides/azure-service-bus#cost-optimization — retrieved 2026-10-12 — via mcp:mslearn
[S9] Azure Event Grid quotas and limits — https://learn.microsoft.com/azure/event-grid/quotas-limits — retrieved 2026-10-12 — via mcp:mslearn
[S10] Message push delivery and retry with namespace topics — https://learn.microsoft.com/azure/event-grid/namespace-delivery-retry — retrieved 2026-10-12 — via mcp:mslearn
[S11] Pull delivery with HTTP — https://learn.microsoft.com/azure/event-grid/pull-delivery-overview — retrieved 2026-10-12 — via mcp:mslearn
[S12] Azure Event Grid namespace concepts — https://learn.microsoft.com/azure/event-grid/concepts-event-grid-namespaces — retrieved 2026-10-12 — via mcp:mslearn
[S13] What's new in Azure Event Grid? — https://learn.microsoft.com/azure/event-grid/whats-new — retrieved 2026-10-12 — via mcp:mslearn
[S14] Azure Event Grid pricing — https://azure.microsoft.com/pricing/details/event-grid/ — retrieved 2026-10-12 — via web
[S15] Azure Retail Prices API, Event Grid, armRegionName eq 'eastus' — https://prices.azure.com/api/retail/prices?$filter=serviceName%20eq%20%27Event%20Grid%27%20and%20armRegionName%20eq%20%27eastus%27 — retrieved 2026-10-12 — via web
[S16] Azure Event Grid namespaces, CloudEvents support — https://learn.microsoft.com/azure/event-grid/namespaces-cloud-events — retrieved 2026-10-12 — via mcp:mslearn
[S17] Reliability in Azure Event Grid — https://learn.microsoft.com/azure/reliability/reliability-event-grid — retrieved 2026-10-12 — via mcp:mslearn
[S18] Receive events using pull delivery with Java — https://learn.microsoft.com/azure/event-grid/receive-events-from-namespace-topics-java — retrieved 2026-10-12 — via mcp:mslearn
[S19] Azure Event Hubs quotas and limits — https://learn.microsoft.com/azure/event-hubs/event-hubs-quotas — retrieved 2026-10-12 — via mcp:mslearn
[S20] Scaling with Event Hubs (partitions and partition keys) — https://learn.microsoft.com/azure/event-hubs/event-hubs-scalability — retrieved 2026-10-12 — via mcp:mslearn
[S21] Availability and consistency in Event Hubs — https://learn.microsoft.com/azure/event-hubs/event-hubs-availability-and-consistency — retrieved 2026-10-12 — via mcp:mslearn
[S22] Dynamically add partitions to an event hub — https://learn.microsoft.com/azure/event-hubs/dynamically-add-partitions — retrieved 2026-10-12 — via mcp:mslearn
[S23] Azure Event Hubs pricing — https://azure.microsoft.com/pricing/details/event-hubs/ — retrieved 2026-10-12 — via web
[S24] Azure Retail Prices API, Event Hubs, armRegionName eq 'eastus' — https://prices.azure.com/api/retail/prices?$filter=serviceName%20eq%20%27Event%20Hubs%27%20and%20armRegionName%20eq%20%27eastus%27 — retrieved 2026-10-12 — via web
[S25] Architecture best practices for Azure Event Hubs, reliability — https://learn.microsoft.com/azure/well-architected/service-guides/azure-event-hubs#reliability — retrieved 2026-10-12 — via mcp:mslearn
[S26] Azure Event Hubs Premium overview — https://learn.microsoft.com/azure/event-hubs/event-hubs-premium-overview — retrieved 2026-10-12 — via mcp:mslearn
[S27] What is Azure Event Hubs? — https://learn.microsoft.com/azure/event-hubs/event-hubs-about — retrieved 2026-10-12 — via mcp:mslearn
[S28] Microsoft Online Services SLA (consolidated page, October 2026 edition) — https://www.microsoft.com/licensing/docs/view/Service-Level-Agreements-SLA-for-Online-Services?lang=1 — retrieved 2026-10-12 — via web
