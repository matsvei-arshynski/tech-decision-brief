---
artifact: docs
agent: docs-researcher
run_id: 20261012-2038-azure-service-bus-event-grid-event
attempt: 3
---
# Official documentation

## Summary
Only Azure Service Bus (Standard or Premium tier) has a documented per-customer ordering mechanism for all flows: sessions, with one session per customer key [S1]. Event Grid documents no delivery order, so it cannot meet the ordering constraint [S10][S16]. Event Hubs preserves order within a partition, so a customer key mapped to a partition gives per-customer order [S22][S19]. Cost decides the field at 2,000 messages/s sustained 24x7: one Premium Service Bus messaging unit costs about $677/month [S6], Standard Service Bus is throttled to about 500 round-trip messages/s [S4], and Event Grid event operations alone cost about $3,110/month [S15]. Event Hubs Standard is the only candidate whose cost can fit under $500/month, and only for average messages of roughly 8 KB or less [S18][S23].

## Findings

### Azure Service Bus
- Service Bus has three tiers: Basic (queues only), Standard (adds topics, subscriptions, sessions and transactions, billed per operation) and Premium (dedicated messaging units, fixed price per unit) [S3].
- GA status: the Premium tier reached general availability on July 15, 2016, per the official Azure updates announcement "Service Bus Premium Messaging released to general availability" [S27]. No GA announcement for the Standard or Basic tier was found. The Premium geo-replication GA announcement [S25] covers a feature, not the tier. Premium is documented as the tier for production and mission-critical scenarios [S3].
- Premium namespaces take 1, 2, 4, 8 or 16 messaging units; a namespace has at least one [S3].
- Sessions give FIFO processing: the sender sets a session ID, all messages with that ID form one session, and a consumer holding the session's exclusive lock processes them in order while other sessions run in parallel [S1].
- Sessions are not supported on the Basic tier, and they can only be enabled when the queue or subscription is created [S1].
- Service Bus guarantees ordering only within a single partition [S7].
- Standard tier throttling uses credits: each namespace gets 1,000 credits per second, and each Send or Receive costs 1 credit, so a sustained 2,000 messages/s of sends plus receives (about 4,000 credits/s) is throttled, leaving a ceiling of about 500 round-trip messages/s [S4].
- The quota table lists 1,000 operations per second for Basic and Standard, and no fixed operations-per-second limit for Premium, where throughput depends on the number of messaging units [S2].
- Premium benchmark tests showed about 4 MB/s of ingress and egress per messaging unit; the page says this is a benchmark, not a guarantee [S5].
- Message size limit is 256 KB on Basic and Standard and up to 100 MB over AMQP on Premium (default 1 MB) [S2].
- Dead-lettering, scheduled messages and message deferral are built in, which covers the work-queue pattern [S8].
- Service Bus provides an SLA for all namespaces; Premium with zone redundancy and partitioning gets a higher availability SLA [S7].
- Retail price, eastus, USD: Premium messaging unit $0.9275 per hour; Standard base unit $0.013441 per hour plus a $10 per month meter; Standard operations first 13M per month free, then $0.80 per million (13M to 100M), $0.50 per million (100M to 2,500M) and $0.20 per million above 2,500M; Basic operations $0.05 per million [S6].
- Premium at 730 hours per month costs $677.08 per messaging unit, so one unit (the minimum) is above $500 [S6].
- At 2,000 messages/s for 30 days, a send and a receive per message is 10,368M operations per month, about $2,843 in operation charges on Standard before base meters [S6].

### Event Grid
- Event Grid namespaces (Standard tier) provide HTTP namespace topics with pull delivery, which uses queue-like receive, acknowledge, release, reject and renew-lock operations [S13].
- Push delivery from namespace topics supports Event Hubs and webhooks as destinations; Service Bus is not listed as a namespace push destination [S11].
- Service Bus queues and topics are push destinations for the Basic tier, which is a separate tier from namespaces [S12].
- Event Grid does not guarantee order for event delivery, so subscribers can receive events out of order [S10]. The Basic-tier delivery page says the same [S16].
- Namespace limits per throughput unit (TU): 1,000 events per second or 1 MB per second of ingress (whichever comes first); 2,000 events per second or 2 MB per second of egress; up to 40 TUs per namespace; 7-day retention; 1 MB maximum event size [S9].
- Feature status: pull delivery became GA in November 2023; push delivery to Event Hubs became GA in May 2024; push to webhooks became GA in November 2024; namespace autoscale is in preview (July 2026) [S14].
- Event Grid namespace push to Event Hubs can set a PartitionKey header, which selects the Event Hubs partition [S24].
- Retail price, eastus, USD: namespace Standard TU $0.04 per hour; Standard event operations $0 for the first 1M per month, then $0.60 per million [S15].
- Two TUs at 730 hours cost $58.40 per month. Ingress alone at 5,184M events per month (2,000 per second for 30 days) costs about $3,109.80 in event operations, so at least $3,168 per month before delivery operations [S15][S9] (calculated).

### Event Hubs
- GA status: the Premium tier reached general availability on November 2, 2021, per the official Azure updates announcement "General availability: Event Hubs Premium" [S29]. No tier-level GA announcement for the Standard tier was found. The Standard Availability Zones GA announcement of January 23, 2019 [S28] covers a feature, not the tier. Standard is described as the general-purpose tier for most streaming workloads and Premium as the tier for mission-critical workloads [S26]; both are documented with quotas [S17], and the service carries a 99.99% SLA [S20], which are not GA statements.
- Event Hubs is a partitioned append-only log; consumers track their position (offset) in each partition, and events are stored with 1 to 7 days of retention on Standard and up to 90 on Premium [S20].
- Ordering: when a set of events must stay in order, the producer sends them all to one partition, and the consumer reads that partition in order; this trades availability for consistency [S22]. Partitions are chosen by partition key [S19].
- Partition count is fixed after creation on Standard; Premium and Dedicated can add partitions but not remove them [S19].
- Standard tier: 1 throughput unit (TU) gives 1 MB/s or 1,000 events/s of ingress and 2 MB/s or 4,096 events/s of egress; up to 40 TUs per namespace; up to 32 partitions per event hub [S18][S17].
- Premium tier: 1, 2, 4, 6, 8, 10, 12 or 16 processing units (PUs); up to 100 partitions per event hub; ingress events included [S21].
- Retail price, eastus, USD: Standard TU $0.03 per hour; Standard ingress $0.028 per million events; Standard Capture $0.10 per hour; Premium PU $1.027 per hour; Basic TU $0.015 per hour [S23].
- Standard at 2 TUs (minimum for 2,000 events/s): $43.80 TU charges plus $145.15 ingress per month, about $189 [S23][S18] (calculated).
- Standard at 40 TUs (the maximum): $876.00 TU charges plus $145.15 ingress, about $1,021 per month [S23][S17] (calculated).
- Premium at 1 PU: $749.71 per month [S23][S21] (calculated).
- Throughput at 2,000 messages/s: at 20 KB average, 40 MB/s needs the 40-TU maximum; at 64 KB worst case, 128 MB/s needs 128 TUs, over the 40-TU cap [S18][S17] (calculated).
- Event Hubs has a 99.99% SLA and is a fully managed PaaS service [S20].

## Constraint check
| Constraint | Candidate | Status | Evidence |
|---|---|---|---|
| H1 | Azure Service Bus | unknown | Standard is unmet: credit throttling caps sustained round trips at about 500 messages/s [S4]. Premium depends on size: about 4 MB/s per messaging unit benchmark, not a guarantee [S5]; at 64 KB worst case it needs about 32 units, above the 16-unit maximum [S3] (calculated). |
| H2 | Azure Service Bus | met | Sessions give FIFO per session ID on Standard and Premium [S1]. Sessions must be enabled at creation and are unavailable on Basic [S1]. |
| H3 | Azure Service Bus | unmet | Premium: one messaging unit is $677.08 per month [S6] (calculated). Standard: about $2,843 in operation charges at worst case [S6] (calculated). |
| H4 | Azure Service Bus | met | Fully managed Azure messaging service with an SLA for all namespaces [S7]. |
| H1 | Event Grid | unknown | Namespace limits are 1,000 events/s or 1 MB/s per TU, 40 TUs maximum [S9]. Events of about 20 KB or less can reach 2,000 events/s at 40 TUs; at 64 KB worst case, 128 MB/s needs 128 TUs, over the cap (calculated). |
| H2 | Event Grid | unmet | Event Grid does not guarantee order for event delivery [S10][S16]. |
| H3 | Event Grid | unmet | At least $3,168 per month for 2 TUs and ingress alone [S15][S9] (calculated). |
| H4 | Event Grid | met | Managed Azure service with namespaces and push and pull delivery GA [S14][S12]. |
| H1 | Event Hubs | unknown | Standard: 1 TU = 1 MB/s or 1,000 events/s; 40 TU maximum [S18][S17]. Reaches 2,000 messages/s at about 20 KB or less; at 64 KB worst case needs 128 TUs, over the cap (calculated). Premium has no fixed per-PU cap; throughput depends on partitions and workload [S21]. |
| H2 | Event Hubs | met | Events for one customer sent to one partition are read in order [S22][S19]. Event Grid can set PartitionKey for Event Hubs destinations [S24]. |
| H3 | Event Hubs | unmet | Standard at 2 TUs is about $189 per month, but the 64 KB worst case needs 128 TUs; at the 40-TU maximum the cost is about $1,021 per month [S23][S17] (calculated). Under $500 only if average messages are about 8 KB or less (16 TUs) [S23] (calculated). Premium at 1 PU is $749.71 [S23][S21] (calculated). |
| H4 | Event Hubs | met | Fully managed PaaS with a 99.99% SLA [S20]. |

## Open issues
- Event Grid ordering was checked for push delivery and the Basic tier. Ordering for pull delivery on namespace topics is not documented in the pages retrieved; H2 for Event Grid is unmet on the push path only [S10][S16].
- Prices come from the Azure Retail Prices API for eastus, USD [S6][S15][S23]. Other regions, enterprise agreements and discounts were not checked. The 730 hours per month, 30-day month and 2-operations-per-message assumptions are mine; peek-lock completion adds another Service Bus operation per message, which would raise the Standard cost further. Verify in the Azure pricing calculator before relying on the figures.
- The Event Grid cost assumes that publishing counts as billable event operations only; delivery operations are not priced here [S15].
- The meaning of the Service Bus Standard "$10 per month" base meter is not stated on the price page [S6].
- Service Bus Premium throughput (about 4 MB/s per messaging unit) comes from a benchmark sample; the page says real throughput depends on the workload [S5].
- Average message size and rate are not stated in the requirements, so H1 for all three candidates and H3 for Event Hubs depend on an assumption not in the source material.
- GA status: the Service Bus Premium GA date (July 15, 2016) [S27] and the Event Hubs Premium GA date (November 2, 2021) [S29] come from the official Azure updates pages as shown in search results. Fetching those pages returned no content, so the dates are not confirmed on the page itself. Not found: a GA announcement for the Service Bus Standard or Basic tier, and one for the Event Hubs Standard tier. The Learn pages retrieved describe production use [S3][S26] and SLAs [S7][S20], which are not GA statements. Event Grid GA dates for specific features are in [S14].
- Operational effort (criterion weight 3) belongs to patterns-researcher. This research covers only the built-in facts above: dead-lettering, deferral and scheduled messages for Service Bus [S8], and offset-based consumption for Event Hubs [S20].

## Sources
[S1] Message sessions — https://learn.microsoft.com/azure/service-bus-messaging/message-sessions — retrieved 2026-10-12 — via mcp:mslearn
[S2] Service Bus quotas — https://learn.microsoft.com/azure/service-bus-messaging/service-bus-quotas — retrieved 2026-10-12 — via mcp:mslearn
[S3] Azure Service Bus premium messaging tier — https://learn.microsoft.com/azure/service-bus-messaging/service-bus-premium-messaging — retrieved 2026-10-12 — via mcp:mslearn
[S4] Throttling operations on Azure Service Bus — https://learn.microsoft.com/azure/service-bus-messaging/service-bus-throttling — retrieved 2026-10-12 — via mcp:mslearn
[S5] Best practices for improving performance with Azure Service Bus — https://learn.microsoft.com/azure/service-bus-messaging/service-bus-performance-improvements — retrieved 2026-10-12 — via mcp:mslearn
[S6] Azure Retail Prices API, Service Bus, eastus, USD — https://prices.azure.com/api/retail/prices?$filter=serviceName%20eq%20'Service%20Bus'%20and%20armRegionName%20eq%20'eastus' — retrieved 2026-10-12 — via web
[S7] Reliability in Azure Service Bus — https://learn.microsoft.com/azure/reliability/reliability-service-bus — retrieved 2026-10-12 — via mcp:mslearn
[S8] Azure Service Bus advanced features — https://learn.microsoft.com/azure/service-bus-messaging/advanced-features-overview — retrieved 2026-10-12 — via mcp:mslearn
[S9] Azure Event Grid quotas and limits — https://learn.microsoft.com/azure/event-grid/quotas-limits — retrieved 2026-10-12 — via mcp:mslearn
[S10] Message push delivery and retry with namespace topics — https://learn.microsoft.com/azure/event-grid/namespace-delivery-retry — retrieved 2026-10-12 — via mcp:mslearn
[S11] Azure Event Grid namespaces push delivery overview — https://learn.microsoft.com/azure/event-grid/namespace-push-delivery-overview — retrieved 2026-10-12 — via mcp:mslearn
[S12] Choose the right Event Grid tier for your solution — https://learn.microsoft.com/azure/event-grid/choose-right-tier — retrieved 2026-10-12 — via mcp:mslearn
[S13] Azure Event Grid namespace concepts — https://learn.microsoft.com/azure/event-grid/concepts-event-grid-namespaces — retrieved 2026-10-12 — via mcp:mslearn
[S14] What's new in Azure Event Grid? — https://learn.microsoft.com/azure/event-grid/whats-new — retrieved 2026-10-12 — via mcp:mslearn
[S15] Azure Retail Prices API, Event Grid, eastus, USD — https://prices.azure.com/api/retail/prices?$filter=serviceName%20eq%20'Event%20Grid'%20and%20armRegionName%20eq%20'eastus' — retrieved 2026-10-12 — via web
[S16] Event Grid message delivery and retry — https://learn.microsoft.com/azure/event-grid/delivery-and-retry — retrieved 2026-10-12 — via mcp:mslearn
[S17] Azure Event Hubs quotas and limits — https://learn.microsoft.com/azure/event-hubs/event-hubs-quotas — retrieved 2026-10-12 — via mcp:mslearn
[S18] Scaling with Event Hubs — https://learn.microsoft.com/azure/event-hubs/event-hubs-scalability — retrieved 2026-10-12 — via mcp:mslearn
[S19] Event Hubs features and terminology — https://learn.microsoft.com/azure/event-hubs/event-hubs-features — retrieved 2026-10-12 — via mcp:mslearn
[S20] What is Azure Event Hubs? — https://learn.microsoft.com/azure/event-hubs/event-hubs-about — retrieved 2026-10-12 — via mcp:mslearn
[S21] Azure Event Hubs Premium overview — https://learn.microsoft.com/azure/event-hubs/event-hubs-premium-overview — retrieved 2026-10-12 — via mcp:mslearn
[S22] Performance and scale guidance for Event Hubs and Azure Functions — https://learn.microsoft.com/azure/architecture/serverless/event-hubs-functions/performance-scale — retrieved 2026-10-12 — via mcp:mslearn
[S23] Azure Retail Prices API, Event Hubs, eastus, USD — https://prices.azure.com/api/retail/prices?$filter=serviceName%20eq%20'Event%20Hubs'%20and%20armRegionName%20eq%20'eastus' — retrieved 2026-10-12 — via web
[S24] Custom delivery properties for namespace topics — https://learn.microsoft.com/azure/event-grid/namespace-delivery-properties — retrieved 2026-10-12 — via mcp:mslearn
[S25] Announcing General Availability of Geo-Replication for Azure Service Bus Premium — https://techcommunity.microsoft.com/blog/messagingonazureblog/announcing-general-availability-of-geo-replication-for-azure-service-bus-premium/4413164 — retrieved 2026-10-12 — via web
[S26] Compare Azure Event Hubs tiers — https://learn.microsoft.com/azure/event-hubs/compare-tiers — retrieved 2026-10-12 — via mcp:mslearn
[S27] General availability: Service Bus Premium Messaging released to general availability — https://azure.microsoft.com/updates/service-bus-premium-messaging-released-to-general-availability/ — retrieved 2026-10-12 — via web
[S28] Azure Service Bus and Azure Event Hubs expand availability — https://azure.microsoft.com/en-us/blog/azure-service-bus-and-azure-event-hubs-expand-availability/ — retrieved 2026-10-12 — via web
[S29] General availability: Event Hubs Premium — https://azure.microsoft.com/en-au/updates/general-availability-event-hubs-premium — retrieved 2026-10-12 — via web
