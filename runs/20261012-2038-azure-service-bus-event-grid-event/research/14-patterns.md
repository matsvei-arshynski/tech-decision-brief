---
artifact: patterns
agent: patterns-researcher
run_id: 20261012-2038-azure-service-bus-event-grid-event
attempt: 1
---
# Architecture patterns and trade-offs

## Summary
No candidate meets every hard constraint at the stated worst case. Azure Service Bus is the only candidate with native per-customer ordering (sessions) and a clear fit for command and work-queue traffic, but Standard is capped at 1,000 operations per second per namespace and Premium's one-messaging-unit minimum costs about $677 per month, over the $500 budget. Event Grid has no ordering guarantee, so it fails H2 outright, and at 2,000 events per second its publish operations alone cost about $3,150 per month. Event Hubs keeps per-customer order through partition keys and is the only candidate under budget at small messages (about $191 per month on Standard), but Standard tops out at 40 throughput units (40 MB/s), so 64 KB messages cannot be sustained, and Premium costs about $750 per processing unit. The average message size, which the requirements do not state, decides the throughput and Event Hubs cost rows.

## Findings

### Azure Service Bus
- Pattern fit: queues with competing consumers match the stated command and work-queue traffic; each message goes to one consumer, and failed work is retried or dead-lettered [S8][S10].
- Ordering: sessions give first-in-first-out processing for messages that share a session ID; a receiver holds an exclusive lock on the session, so one customer's messages are processed in order while other customers proceed in parallel [S2]. Sessions are available on Standard and Premium, not Basic [S2], and can only be enabled when the queue or subscription is created [S11].
- Ordering limit: sequence numbers alone do not guarantee processing order; sessions are needed for that [S2]. A dead-lettered message moved back to the main queue loses its original order [S2].
- Throughput, Standard: the Standard tier allows 1,000 credits per second per namespace, and each send or receive costs one credit, so 2,000 messages per second of sends alone exceeds the limit and is throttled [S4]. The operations-per-second quota is listed as 1,000 for Standard [S1].
- Throughput, Premium: Premium has no fixed operations-per-second limit; capacity depends on the number of messaging units (1, 2, 4, 8 or 16 per namespace) [S1][S3]. A Microsoft benchmark measured about 4 MB/s per messaging unit for ingress plus egress, but the benchmark does not use advanced features, so this is a starting point, not a guarantee [S5]. Premium messages can be up to 100 MB over AMQP, but large messages reduce throughput [S3].
- Message size: Standard limits a message to 256 KB, including properties [S1]. At 2,000 messages per second, 64 KB messages are 128 MB/s, which is far above the benchmark figure for one messaging unit [S3][S5].
- Cost, Standard: the Standard base charge is $10 per month, the first 13 million operations per month are included, and operations are then billed per million in tiers ($0.80, $0.50 and $0.20) [S6][S7]. At 2,000 messages per second, 24 x 7 (5.256 billion messages per month), with a send and a receive per message (10.5 billion operations), the calculated cost is about $2,880 per month; with send only it is about $1,830 per month. Both exceed $500 [S7].
- Cost, Premium: the messaging unit is $0.9275 per hour, about $677 per month for one unit at 730 hours, and a namespace has at least one unit [S3][S7]. This exceeds $500 before any messages are counted.
- Operations: a message that fails is retried until `MaxDeliveryCount` (default 10) and then moves to the dead-letter queue [S2][S10]. The dead-letter queue is not cleaned up automatically [S10]. Premium exposes CPU and memory metrics and supports automatic scaling of messaging units [S3]. Standard throttling returns errors that the SDK retry policy can handle, and throttling does not lose data [S5].
- Connections: a namespace allows 1,000 Net Messaging connections or 5,000 AMQP connections [S26].
- Messaging pattern fit, publish-subscribe: topics and subscriptions allow up to 2,000 subscriptions per topic [S1], so fan-out is possible but not needed here.
- Does not fit: there is no capture or replay of the message stream [S9].

### Event Grid
- Pattern fit: publish-subscribe event distribution with push delivery to subscribers [S14][S16]. Namespace topics also offer pull delivery with queue-like semantics (receive, acknowledge, release, reject, renew lock), which can approximate competing consumers [S15]. Namespace push delivery currently supports only Event Hubs as a destination [S13].
- Ordering: Event Grid does not guarantee order for event delivery, so subscribers may receive events out of order [S13][S14]. The pull model does not add an ordering guarantee in the documentation reviewed [S15]. This fails H2 for all message flows.
- Throughput: namespace ingress is 1,000 events per second or 1 MB per second per throughput unit, whichever comes first; egress is 2,000 events per second or 2 MB per second per unit; the maximum is 40 units per namespace [S12]. For 2,000 events per second, two units suffice only if the average event is about 1 KB or smaller; at 64 KB the stream is 128 MB/s, which needs 128 units and is above the 40-unit maximum [S12].
- Event size: the maximum event size is 1 MB, and events are retained for up to 7 days on namespace topics [S12].
- Cost: the Standard throughput unit is $0.04 per hour; the Standard event operation is $0.60 per million beyond the included first million [S17]. Acknowledge, release, reject and renew operations are not billed, except rejected events that need dead-lettering [S18]. At 5.256 billion published events per month, the calculated publish cost is about $3,150 per month plus two throughput units (about $58), so about $3,200 per month. This exceeds $500.
- Operations: push delivery retries at least once; the default is up to 10 delivery attempts, and an event is dead-lettered after its time to live or its attempt limit, whichever comes first [S13]. Dead-lettering requires a Blob Storage account and is not on by default [S13]. The pull model shifts polling and pacing to the consumer [S15].
- Regional availability: limits are per region [S12]. Regional availability of namespaces was not verified.

### Event Hubs
- Pattern fit: event streaming. Events are an append-only log, consumers read each partition with a checkpoint, and consumer groups give fan-out [S20][S23]. Competing-consumer parallelism is capped at the partition count, because one epoch consumer owns each partition at a time [S20]. This fits ordered streams well and point-to-point work queues poorly.
- Ordering: Event Hubs guarantees order only within a partition [S23]. A partition key hashes all events for one customer to the same partition, and they are stored and delivered in the order they arrived [S20][S21]. Pinning to a partition trades availability for consistency: if that partition is unavailable the send fails rather than moving to another partition [S21].
- Partition count: Standard allows 32 partitions per event hub and the count cannot be changed after creation; Premium and Dedicated allow increases [S19][S22]. Changing the partition count changes the key-to-partition mapping, which affects ordering [S22].
- Throughput, Standard: one throughput unit gives 1 MB/s or 1,000 events per second for ingress, and 2 MB/s or 4,096 events per second for egress; the maximum is 40 units per namespace [S19][S20]. 2,000 events per second needs at least two units when events average 1 KB or less. At 64 KB the stream is 128 MB/s, which exceeds the 40 MB/s that 40 units can carry [S19].
- Throughput, Premium: Premium processing units have no fixed per-unit limit in the quota table; the guidance is about 1 to 2 MB/s ingress per partition [S19][S20]. The largest message is 1 MB on Standard and Premium, and 20 MB on Dedicated [S19].
- Cost, Standard: a throughput unit is $0.03 per hour and ingress is $0.028 per million events [S24]. At two units, 730 hours and 5.256 billion events per month, the calculated cost is about $191 per month ($44 units plus $147 ingress). Three units for headroom give about $213 per month. Retention of 1 day at 1 KB per event is about 173 GB per day, above the 168 GB included for two units, which adds a small storage charge [S22].
- Cost, Premium: a processing unit is $1.027 per hour, about $750 per month for one unit [S25]. This exceeds $500.
- Operations: Event Hubs has no dead-lettering [S9]. Consumers must checkpoint and handle failed events in their own code [S20][S21]. Auto-inflate scales throughput units up with no added charge [S22]. Standard retention is 1 hour by default and up to 7 days [S20][S19]. The service is fully managed by Microsoft across tiers [S23].
- Does not fit: per-message settlement and per-message time to live are not available on the log [S9][S20].

## Constraint check
| Constraint | Candidate | Status | Evidence |
|---|---|---|---|
| H1 | Azure Service Bus | unknown | Standard: unmet at 2,000 messages/s, 1,000 credits/s per namespace [S4]. Premium: no fixed limit, about 4 MB/s per unit in a benchmark [S5], depends on message size and unit count [S1][S3]. |
| H2 | Azure Service Bus | met | Sessions give ordered processing per session ID [S2]. |
| H3 | Azure Service Bus | unmet | Standard about $2,880/month at worst case [S6][S7]; Premium one unit about $677/month before messages [S3][S7]. |
| H4 | Azure Service Bus | met | Fully managed Azure broker [S3]. |
| H1 | Event Grid | unknown | Namespace limit 1,000 events/s and 1 MB/s per unit, max 40 units [S12]. Met for about 1 KB average events; at 64 KB the stream is 128 MB/s, above the 40-unit maximum [S12]. |
| H2 | Event Grid | unmet | No guarantee of event delivery order [S13][S14]. |
| H3 | Event Grid | unmet | About $3,200/month at 2,000 events/s publish plus units [S17][S18]. |
| H4 | Event Grid | met | Fully managed publish-subscribe service [S16]. |
| H1 | Event Hubs | unknown | Standard: met at 2 units for events up to about 1 KB; 64 KB messages need 128 units, above the 40-unit maximum [S19]. Premium: no fixed unit limit, per-partition guidance only [S19][S20]. |
| H2 | Event Hubs | met | Partition key keeps one customer's events in order within one partition [S20][S21]. |
| H3 | Event Hubs | unknown | Standard about $191/month at 2 units and small messages [S22][S24]; Premium one unit about $750 [S25]. Standard cannot carry 64 KB messages, so its cost at the worst case is not determined. |
| H4 | Event Hubs | met | Microsoft manages clusters for all tiers [S23]. |

## Open issues
- Average and maximum message size are not stated. The Service Bus Premium and Event Hubs throughput rows, and the Event Hubs Standard cost row, depend on it. The requirements use 64 KB as the cost worst case, which Standard Event Hubs and Standard Service Bus cannot sustain at 2,000 messages per second. Confirm the size with the user.
- Service Bus Premium throughput per messaging unit is only a benchmark figure [S5]; no published guarantee for the workload was found. A load test is needed to confirm H1.
- Service Bus Standard's 1,000-credit limit is stated per namespace [S4]. Spreading traffic over several namespaces was not priced or assessed.
- Event Hubs Premium per-processing-unit throughput is not published as a fixed number [S19]; the figure above is guidance only.
- Event Grid Basic tier pricing and limits beyond the 5,000 events or 5 MB per second per custom topic publish rate [S12] were not retrieved.
- Event Grid pull delivery was checked for ordering only in the documentation reviewed; no ordering guarantee was found, and none was documented.
- Regional availability of Event Grid namespaces and zone redundancy for Event Hubs Standard were not verified. Zone redundancy cannot be enabled on an existing older namespace [S22].
- Cost figures are calculated from list prices in East US in US dollars (retail prices API, not tax-inclusive, no discounts) for 730 hours per month. They exclude capture, egress, and storage beyond the included retention, and they are not quotes.

## Sources
[S1] Service Bus quotas — https://learn.microsoft.com/azure/service-bus-messaging/service-bus-quotas — retrieved 2026-10-12 — via mcp:mslearn
[S2] Message sessions — https://learn.microsoft.com/azure/service-bus-messaging/message-sessions — retrieved 2026-10-12 — via mcp:mslearn
[S3] Azure Service Bus premium messaging tier — https://learn.microsoft.com/azure/service-bus-messaging/service-bus-premium-messaging — retrieved 2026-10-12 — via mcp:mslearn
[S4] Throttling operations on Azure Service Bus — https://learn.microsoft.com/azure/service-bus-messaging/service-bus-throttling — retrieved 2026-10-12 — via mcp:mslearn
[S5] Best practices for improving performance with Azure Service Bus — https://learn.microsoft.com/azure/service-bus-messaging/service-bus-performance-improvements — retrieved 2026-10-12 — via mcp:mslearn
[S6] Service Bus pricing — https://azure.microsoft.com/pricing/details/service-bus/ — retrieved 2026-10-12 — via web
[S7] Azure Retail Prices API, Service Bus, East US — https://prices.azure.com/api/retail/prices?$filter=serviceName%20eq%20'Service%20Bus'%20and%20armRegionName%20eq%20'eastus' — retrieved 2026-10-12 — via web
[S8] Competing Consumers pattern — https://learn.microsoft.com/azure/architecture/patterns/competing-consumers — retrieved 2026-10-12 — via mcp:mslearn
[S9] Choose between Azure Event Grid, Event Hubs, and Service Bus — https://learn.microsoft.com/azure/service-bus-messaging/compare-messaging-services — retrieved 2026-10-12 — via mcp:mslearn
[S10] Overview of Service Bus dead-letter queues — https://learn.microsoft.com/azure/service-bus-messaging/service-bus-dead-letter-queues — retrieved 2026-10-12 — via mcp:mslearn
[S11] Enable message sessions for an Azure Service Bus queue or a subscription — https://learn.microsoft.com/azure/service-bus-messaging/enable-message-sessions — retrieved 2026-10-12 — via mcp:mslearn
[S12] Azure Event Grid quotas and limits — https://learn.microsoft.com/azure/event-grid/quotas-limits — retrieved 2026-10-12 — via mcp:mslearn
[S13] Message push delivery and retry with namespace topics — https://learn.microsoft.com/azure/event-grid/namespace-delivery-retry — retrieved 2026-10-12 — via mcp:mslearn
[S14] Asynchronous messaging options — https://learn.microsoft.com/azure/architecture/guide/technology-choices/messaging — retrieved 2026-10-12 — via mcp:mslearn
[S15] Pull delivery with HTTP — https://learn.microsoft.com/azure/event-grid/pull-delivery-overview — retrieved 2026-10-12 — via mcp:mslearn
[S16] What is Azure Event Grid? — https://learn.microsoft.com/azure/event-grid/overview — retrieved 2026-10-12 — via mcp:mslearn
[S17] Azure Retail Prices API, Event Grid, East US — https://prices.azure.com/api/retail/prices?$filter=serviceName%20eq%20'Event%20Grid'%20and%20armRegionName%20eq%20'eastus' — retrieved 2026-10-12 — via web
[S18] Azure Event Grid pricing — https://azure.microsoft.com/pricing/details/event-grid/ — retrieved 2026-10-12 — via web
[S19] Azure Event Hubs quotas and limits — https://learn.microsoft.com/azure/event-hubs/event-hubs-quotas — retrieved 2026-10-12 — via mcp:mslearn
[S20] Event Hubs features and terminology — https://learn.microsoft.com/azure/event-hubs/event-hubs-features — retrieved 2026-10-12 — via mcp:mslearn
[S21] Availability and consistency in Event Hubs — https://learn.microsoft.com/azure/event-hubs/event-hubs-availability-and-consistency — retrieved 2026-10-12 — via mcp:mslearn
[S22] Event Hubs frequently asked questions — https://learn.microsoft.com/azure/event-hubs/event-hubs-faq — retrieved 2026-10-12 — via mcp:mslearn
[S23] Reliability in Azure Event Hubs — https://learn.microsoft.com/azure/reliability/reliability-event-hubs — retrieved 2026-10-12 — via mcp:mslearn
[S24] Azure Retail Prices API, Event Hubs Standard, East US — https://prices.azure.com/api/retail/prices?$filter=serviceName%20eq%20'Event%20Hubs'%20and%20armRegionName%20eq%20'eastus'%20and%20skuName%20eq%20'Standard' — retrieved 2026-10-12 — via web
[S25] Azure Retail Prices API, Event Hubs Premium, East US — https://prices.azure.com/api/retail/prices?$filter=serviceName%20eq%20'Event%20Hubs'%20and%20armRegionName%20eq%20'eastus'%20and%20skuName%20eq%20'Premium' — retrieved 2026-10-12 — via web
[S26] Azure subscription and service limits, quotas, and constraints — https://learn.microsoft.com/azure/azure-resource-manager/management/azure-subscription-service-limits — retrieved 2026-10-12 — via mcp:mslearn
