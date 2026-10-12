---
artifact: patterns
agent: patterns-researcher
run_id: 20261012-2154-azure-messaging-service-bus-event-grid
attempt: 1
---
# Architecture patterns and trade-offs

## Summary
Event Hubs is the only candidate that passes all four hard constraints on the cited evidence: partition-key ordering, a documented ceiling of 40,000 events/s at the 40-TU Standard limit, and about $189/month for 2 TUs plus ingress at the confirmed load. Service Bus Premium passes ordering and throughput but its smallest billable unit (one messaging unit) costs about $677/month, which already exceeds the budget; Service Bus Standard fails throughput (1,000 credits per second per namespace). Event Grid fails per-customer ordering because it doesn't guarantee delivery order, and its per-event operation pricing comes to about $3,170/month even for publishing alone. Message size and the billable operation count per message are not stated in the request, so the throughput and cost figures below are computed with the stated assumptions listed under Open issues.

## Findings

### Azure Service Bus
- Service Bus fits competing consumers on queues and publish-subscribe on topics; ordering needs message sessions, which give exclusive, ordered handling of a sequence of related messages [S1][S2].
- Sessions must be enabled when the queue or subscription is created and can't be enabled or disabled afterwards [S3].
- Without sessions, sequence numbers guarantee queuing order but not processing order, so per-customer order needs one session ID per customer [S1].
- A session-enabled queue or subscription can't carry regular (non-session) messages, so the whole flow would have to use sessions [S1].
- Standard tier allows 1,000 operations per second per namespace; Premium has no fixed operations-per-second limit and its throughput follows its messaging units [S4].
- Standard throttling uses 1,000 credits per second per namespace, with 1 credit per message for each send or receive, so 2,000 messages/s sent and received needs 4,000 credits/s, about four times the allowance [S5].
- Premium messaging units are dedicated CPU and memory; the benchmark is about 4 MB/s of ingress plus egress per messaging unit, a byte figure rather than a messages-per-second figure [S7].
- The documented Premium scaling steps go 1 to 2 to 4 to 8 to 16 messaging units [S8].
- Message size is 256 KB on Standard; Premium defaults to 1 MB and allows up to 100 MB per message over AMQP [S4].
- Premium list price is $0.9275 per messaging unit-hour, about $677/month for one unit and $1,354/month for two at 730 hours per month [S9]; Premium is typically started at one or two units [S6].
- Standard list price has 13M operations per month included, then $0.80 per million up to 100M, $0.50 per million up to 2,500M and $0.20 per million above that, plus a base of $10/month and $0.013441/hour [S9].
- At 5.184 billion messages per 30-day month with two billable operations each (send and receive), Standard costs about $2,863/month; with a third operation (peek-lock complete) about $3,900/month (arithmetic on the stated load and [S9]).
- Batching reduces billable operations in pay-per-operation tiers [S10].
- Dead-lettering is built in on every queue and subscription [S2].
- Throttled requests appear in Azure Monitor request metrics; the guidance is to scale Premium up when CPU is above 75% or memory is above 60% [S5][S7].
- Zone redundancy is automatic in supported regions at no extra cost, and the availability SLA is higher with Premium, a zone region and partitioning [S11].
- Service Bus is not designed for long-term storage and has no backup or restore of message data [S11].
- Service Bus provides an availability SLA for all namespaces and is a managed Azure service [S11].

### Azure Event Grid
- Event Grid fits publish-subscribe event routing with filters on subscriptions; namespace topics support push and pull delivery [S12][S14].
- Pull delivery uses queue-like semantics with receive, acknowledge, release, reject and renew-lock operations [S14].
- Event Grid doesn't guarantee order for event delivery, so subscribers may receive events out of order [S12][S13].
- The pull-delivery pages retrieved for this run don't state an ordering guarantee for queue subscriptions either [S14].
- Each Standard throughput unit gives 1,000 events/s or 1 MB/s of ingress and 2,000 events/s or 2 MB/s of egress; a namespace can have up to 40 TUs [S15].
- Maximum event size is 1 MB, batches are 1 MB, a request holds up to 1,000 events and event retention is at most 7 days [S15].
- Standard throughput unit list price is $0.04/hour (about $29/month per TU); event operations are $0.60 per million after the first 1M included [S16].
- Pricing bills per operation, with each operation counted per 64 KB unit of data [S17].
- At 5.184 billion published events and 2 TUs, publishing alone costs about $3,110 in operations plus about $58 in TUs, roughly $3,170/month, before receive and acknowledge operations (arithmetic on the stated load and [S16][S17]).
- Autoscale for Event Grid namespaces is in preview as of the July 2026 release [S18].
- Namespace metrics include successful published and received events, dead-lettered events and dropped events [S19].
- Push delivery is at least once with retries; zone redundancy is automatic in supported regions, and the SLA covers event publishing [S12][S20].
- Event Hubs is the only push destination supported for namespace topics; the Java pull-delivery SDK is a beta package [S14][S21].

### Azure Event Hubs
- Event Hubs fits partitioned event streaming: a log per partition, read by consumers that each own one partition per consumer group [S24][S27].
- Event Hubs guarantees ordering only within a single partition; a partition key sends all events with the same key to one partition, where they are delivered in order of arrival [S23][S22].
- Pinning a key trades availability for consistency: if that partition is unavailable the send returns an error instead of going to another partition [S22].
- A single customer key therefore can't use more than one partition's throughput, about 1 MB/s of ingress on Standard [S24].
- Standard throughput units give 1 MB/s or 1,000 events/s of ingress and 2 MB/s or 4,096 events/s of egress each, up to 40 TUs per namespace [S25].
- Standard allows up to 32 partitions per event hub, and partitions can only be increased on Premium and Dedicated, so the count is fixed at creation on Standard [S25][S24]; partitions can't be decreased after creation [S29].
- Each consumer group allows one owning consumer per partition, so the partition count caps consumer parallelism per group [S27][S24].
- Ingress above the TU capacity is throttled with ServiceBusy errors; auto-inflate scales TUs up only and has no charge for the feature [S26][S27].
- Maximum publish size is 1 MB per publish, single event or batch [S25].
- Standard throughput unit list price is $0.03/hour, about $21.90/month per TU; Standard ingress is $0.028 per million events, about $145/month at 5.184 billion events [S28].
- At 2 TUs the total is about $189/month (about $44 for TUs plus about $145 for ingress; arithmetic on [S28] and the stated load).
- Standard retention is up to 7 days; Premium and Dedicated retention is up to 90 days [S30].
- Event Hubs has no built-in dead-letter queue, so poison-message handling is custom; consumers need storage for checkpoints [S29][S23].
- Standard has an SLA of 99.9% and Dedicated 99.99%; zone redundancy is available in the Premium and Dedicated tiers [S29][S30].

## Constraint check
| Constraint | Candidate | Status | Evidence |
|---|---|---|---|
| H1 | Azure Service Bus | met | Sessions give FIFO per session ID, with the session feature set at creation [S1][S3]. |
| H2 | Azure Service Bus | met | Premium tier only (Standard unmet at 1,000 credits/s per namespace [S5]). Premium scales to 16 messaging units [S8] with about 4 MB/s per unit [S7]; the messages-per-second ceiling is inferred from those byte figures and the message-size assumption. |
| H3 | Azure Service Bus | unmet | Premium needs at least one messaging unit at about $677/month [S9]; Standard is about $2,863/month unbatched [S9]. |
| H4 | Azure Service Bus | met | Fully managed Azure service with a namespace SLA [S11]. |
| H1 | Azure Event Grid | unmet | Event Grid doesn't guarantee delivery order [S12][S13]; no ordering guarantee found for pull delivery [S14]. |
| H2 | Azure Event Grid | met | 1,000 events/s ingress per TU, up to 40 TUs per namespace, so 2 TUs cover 2,000 events/s and the ceiling is 40,000 events/s [S15]. |
| H3 | Azure Event Grid | unmet | About $3,170/month at 2 TUs with publish operations only [S16][S17]. |
| H4 | Azure Event Grid | met | Fully managed Azure service [S20]. |
| H1 | Azure Event Hubs | met | Partition key gives ordered delivery per key within one partition [S22][S23]; a key can't use more than one partition's throughput [S24]. |
| H2 | Azure Event Hubs | met | Up to 40 TUs at 1,000 events/s each gives 40,000 events/s; 2 TUs cover the 2,000 events/s need [S25]. |
| H3 | Azure Event Hubs | met | About $189/month at 2 TUs including ingress at the confirmed load [S28]. |
| H4 | Azure Event Hubs | met | Fully managed Azure service with a published SLA [S29][S30]. |

## Open issues
- Message size is not stated. The Event Hubs TU counts and Service Bus throughput figures assume messages of 1 KB or less; at 2 KB Event Hubs needs about 4 TUs (about $233/month), still under budget.
- Standard Service Bus billable operations per message depend on receive mode and batching. The throughput credit model counts one credit per message [S5], while billing reduces with batching [S10]. The batched billing case was not quantified, and the Standard tier is unmet on throughput either way.
- Maximum messaging units per Premium namespace is inferred from the documented scaling steps [S8]; no quota row for it was retrieved.
- The Service Bus Premium messages-per-second ceiling is inferred from the MB/s benchmark [S7], not a documented messages-per-second figure.
- Event Grid pull delivery ordering is not documented in the pages retrieved [S14]; the unmet status relies on the general no-order statement [S12][S13].
- Event Grid operation count per event beyond publish (receive, acknowledge) and the boundary between the "Standard Event Operations" and "Standard Operations" meters were not confirmed; the publish-only cost is the lower bound used here [S16].
- Prices come from the Azure Retail Prices API for East US in USD at list price, before taxes, discounts and reserved pricing [S9][S16][S28]. The pricing web pages rendered placeholders, so they were used only for included-operations and billing-unit statements [S17].
- Service Bus, Event Hubs and Event Grid SLA percentages for each tier were not retrieved from the SLA pages; only the Standard and Dedicated Event Hubs figures and the Service Bus SLA scope are cited [S11][S29].
- Event Grid namespace autoscale is in preview [S18], and the Java pull SDK is beta [S21]; both are flagged, not relied on.

## Sources
[S1] Message sessions — https://learn.microsoft.com/azure/service-bus-messaging/message-sessions — retrieved 2026-10-12 — via mcp:mslearn
[S2] Azure Service Bus - advanced features — https://learn.microsoft.com/azure/service-bus-messaging/advanced-features-overview — retrieved 2026-10-12 — via mcp:mslearn
[S3] Enable message sessions for an Azure Service Bus queue or a subscription — https://learn.microsoft.com/azure/service-bus-messaging/enable-message-sessions — retrieved 2026-10-12 — via mcp:mslearn
[S4] Service Bus quotas — https://learn.microsoft.com/azure/service-bus-messaging/service-bus-quotas — retrieved 2026-10-12 — via mcp:mslearn
[S5] Throttling operations on Azure Service Bus — https://learn.microsoft.com/azure/service-bus-messaging/service-bus-throttling — retrieved 2026-10-12 — via mcp:mslearn
[S6] Azure Service Bus premium messaging tier — https://learn.microsoft.com/azure/service-bus-messaging/service-bus-premium-messaging — retrieved 2026-10-12 — via mcp:mslearn
[S7] Best practices for improving performance with Azure Service Bus — https://learn.microsoft.com/azure/service-bus-messaging/service-bus-performance-improvements — retrieved 2026-10-12 — via mcp:mslearn
[S8] Automatically update messaging units of an Azure Service Bus namespace — https://learn.microsoft.com/azure/service-bus-messaging/automate-update-messaging-units — retrieved 2026-10-12 — via mcp:mslearn
[S9] Azure Retail Prices API, Service Bus (eastus, USD) — https://prices.azure.com/api/retail/prices — retrieved 2026-10-12 — via web
[S10] Architecture best practices for Azure Service Bus — https://learn.microsoft.com/azure/well-architected/service-guides/azure-service-bus — retrieved 2026-10-12 — via mcp:mslearn
[S11] Reliability in Azure Service Bus — https://learn.microsoft.com/azure/reliability/reliability-service-bus — retrieved 2026-10-12 — via mcp:mslearn
[S12] Message push delivery and retry with namespace topics — https://learn.microsoft.com/azure/event-grid/namespace-delivery-retry — retrieved 2026-10-12 — via mcp:mslearn
[S13] Asynchronous messaging options — https://learn.microsoft.com/azure/architecture/guide/technology-choices/messaging — retrieved 2026-10-12 — via mcp:mslearn
[S14] Pull delivery with HTTP — https://learn.microsoft.com/azure/event-grid/pull-delivery-overview — retrieved 2026-10-12 — via mcp:mslearn
[S15] Azure Event Grid quotas and limits — https://learn.microsoft.com/azure/event-grid/quotas-limits — retrieved 2026-10-12 — via mcp:mslearn
[S16] Azure Retail Prices API, Event Grid (eastus, USD) — https://prices.azure.com/api/retail/prices — retrieved 2026-10-12 — via web
[S17] Azure Event Grid pricing — https://azure.microsoft.com/pricing/details/event-grid/ — retrieved 2026-10-12 — via web
[S18] What's new in Azure Event Grid — https://learn.microsoft.com/azure/event-grid/whats-new — retrieved 2026-10-12 — via mcp:mslearn
[S19] Monitor data reference for Azure Event Grid's pull delivery — https://learn.microsoft.com/azure/event-grid/monitor-pull-reference — retrieved 2026-10-12 — via mcp:mslearn
[S20] Reliability in Azure Event Grid — https://learn.microsoft.com/azure/reliability/reliability-event-grid — retrieved 2026-10-12 — via mcp:mslearn
[S21] Receive events using pull delivery with Java — https://learn.microsoft.com/azure/event-grid/receive-events-from-namespace-topics-java — retrieved 2026-10-12 — via mcp:mslearn
[S22] Availability and consistency in Event Hubs — https://learn.microsoft.com/azure/event-hubs/event-hubs-availability-and-consistency — retrieved 2026-10-12 — via mcp:mslearn
[S23] Reliability in Azure Event Hubs — https://learn.microsoft.com/azure/reliability/reliability-event-hubs — retrieved 2026-10-12 — via mcp:mslearn
[S24] Event Hubs features and terminology — https://learn.microsoft.com/azure/event-hubs/event-hubs-features — retrieved 2026-10-12 — via mcp:mslearn
[S25] Azure Event Hubs quotas and limits — https://learn.microsoft.com/azure/event-hubs/event-hubs-quotas — retrieved 2026-10-12 — via mcp:mslearn
[S26] Scaling with Event Hubs — https://learn.microsoft.com/azure/event-hubs/event-hubs-scalability — retrieved 2026-10-12 — via mcp:mslearn
[S27] Event Hubs frequently asked questions — https://learn.microsoft.com/azure/event-hubs/event-hubs-faq — retrieved 2026-10-12 — via mcp:mslearn
[S28] Azure Retail Prices API, Event Hubs (eastus, USD) — https://prices.azure.com/api/retail/prices — retrieved 2026-10-12 — via web
[S29] Architecture best practices for Azure Event Hubs — https://learn.microsoft.com/azure/well-architected/service-guides/azure-event-hubs — retrieved 2026-10-12 — via mcp:mslearn
[S30] What is Azure Event Hubs? — https://learn.microsoft.com/azure/event-hubs/event-hubs-about — retrieved 2026-10-12 — via mcp:mslearn
