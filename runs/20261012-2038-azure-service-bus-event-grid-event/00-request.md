---
artifact: request
agent: coordinator
run_id: 20261012-2038-azure-service-bus-event-grid-event
---
# Request

## Original request
For integrating 6 microservices on Azure: Azure Service Bus, Event Grid or Event Hubs? About 2k messages/s at peak, ordering per customer, budget under $500/month.

## Q&A
- **Q:** Is the traffic mainly point-to-point commands and work queues, pub/sub domain events with fan-out to several subscribers, or both?
  **A:** Commands and work queues
- **Q:** Must per-customer ordering hold for all message flows, or only for specific flows?
  **A:** All flows
