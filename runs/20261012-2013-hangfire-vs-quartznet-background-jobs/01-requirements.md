---
artifact: requirements
agent: requirements-formalizer
run_id: 20261012-2013-hangfire-vs-quartznet-background-jobs
attempt: 1
---
# Requirements

## Question
Which background job library should our .NET 8 ASP.NET Core API use to run recurring jobs with SQL Server storage: Hangfire or Quartz.NET?

## Question type
library

## Candidates
1. **Hangfire** — .NET background job library with recurring jobs, SQL Server storage and a built-in dashboard
2. **Quartz.NET** — .NET port of the Quartz scheduler with cron-style triggers and ADO.NET job stores, including SQL Server

## Context
- Stack: C#/.NET 8, ASP.NET Core API, SQL Server
- Team: None stated.
- Scale: None stated.
- Other: None stated.
- Assumed: The API runs as one or more instances that share one SQL Server database, so the job store must be shared, not in-memory.
- Assumed: The library must be open source or free to use in a commercial product; paid tiers are not in scope.
- Assumed: A built-in monitoring dashboard is nice to have, not required.

## Hard constraints
| ID | Constraint | Dimension |
|---|---|---|
| H1 | Supports .NET 8 (net8.0) and ASP.NET Core 8 in a current stable release | compatibility |
| H2 | Stores job and schedule state in SQL Server (a supported SQL Server job store) | compatibility |
| H3 | Provides recurring jobs: jobs that repeat on a defined schedule, without custom scheduling code | capability |

## Preferences
| ID | Preference |
|---|---|
| — | None stated. |

## Decision criteria
| Criterion | Weight (1–5) | Dimension | Why it matters |
|---|---|---|---|
| Recurring schedule expressiveness (cron-style triggers, time zones, misfire handling) | 5 | capability | Recurring jobs are the stated need; schedule depth decides how much custom code is required. |
| SQL Server setup and operation (schema creation, migrations, shared-store behaviour across instances) | 4 | operations | The team uses SQL Server and the API may run on several instances, so the store must be easy to run. |
| .NET 8 and ASP.NET Core integration (DI, hosting, supported target frameworks) | 4 | compatibility | The API is on .NET 8 and the library must fit its hosting model. |
| Monitoring and operator tooling (dashboard, retries, job history) | 3 | operations | Operators need to see failed or late recurring jobs; a general concern, not stated as critical. |
| Project maturity and release activity (versions, release dates, adoption) | 3 | maturity | A background job library is a long-lived dependency; recent maintenance reduces risk. |
| License terms for commercial use | 2 | license | Must be usable in a commercial product, per the assumption above; not a differentiator unless terms conflict. |

## Open questions
None.
