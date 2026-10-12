---
artifact: request
agent: coordinator
run_id: 20261012-2154-azure-messaging-service-bus-event-grid
---
# Request

## Original request
For integrating 6 microservices on Azure: Azure Service Bus, Event Grid or Event Hubs? About 2k messages/s at peak, ordering per customer, budget under $500/month.

## Q&A
- **Q:** What load basis should the $500/month budget be judged on?
  **A:** Sustained 2k msg/s (2,000 messages/s around the clock, about 5.2 billion messages per 30-day month)
