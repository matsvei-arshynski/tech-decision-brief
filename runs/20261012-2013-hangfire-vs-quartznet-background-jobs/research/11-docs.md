---
artifact: docs
agent: docs-researcher
run_id: 20261012-2013-hangfire-vs-quartznet-background-jobs
attempt: 2
---
# Official documentation

## Summary
H1 is evaluated on Quartz.NET's latest stable release, 4.4.0, which targets .NET 10 only, so H1 is unmet for Quartz.NET (the 3.22.4 line does list net8.0 and is noted below, but it is not the current stable release). Hangfire 1.8.25 covers all three hard constraints in its current stable release, with recurring cron jobs, per-job time zones, misfire modes, SQL Server storage that installs its own schema, and retries and a dashboard for operators. For the Quartz.NET criteria that 4.4.0 does not decide, the 3.22.4 line is used: it has an ASP.NET Core hosting package for net8.0, documented clustering on AdoJobStore, a schema that the operator must create, and only optional monitoring add-ons (a work-in-progress dashboard, listeners and OpenTelemetry) with no documented automatic retries or persisted run history.

## Findings

### Hangfire
- Hangfire is an open-source .NET background job library for fire-and-forget, delayed and recurring jobs, with persistent storage on SQL Server or Redis. [S4]
- Current stable version is 1.8.25. Hangfire.SqlServer, Hangfire.AspNetCore and Hangfire.Core all use 1.8.25. NuGet lists the package as last updated 2026-08-28. [S1] [S3]
- GitHub marks v1.8.25 as Latest, published 28 Aug (the page shows day and month only; the year is taken from the NuGet date). It is not marked pre-release. [S2]
- Hangfire.SqlServer 1.8.25 depends on Hangfire.Core 1.8.25 and lists .NET Framework 4.5.1, .NET Standard 1.3 and .NET Standard 2.0 targets. [S1]
- Hangfire.AspNetCore lists .NET Standard 2.0 as a compatible target, and NuGet computes net8.0 from that. No page found states "supports .NET 8" directly. [S3]
- Hangfire 1.8.22 changed the test target of Hangfire.Core and Hangfire.SqlServer from netcoreapp3.1 to net8.0. [S2]
- The ASP.NET Core integration uses `services.AddHangfire(...)` with `UseSqlServerStorage(...)`, and `services.AddHangfireServer()`, which is added as an IHostedService. [S7]
- The SQL Server storage installs its schema automatically when the storage is constructed. Setting `PrepareSchemaIfNecessary = false` lets you install or migrate the schema yourself. A dedicated HangFire schema is supported. [S6]
- Recommended SQL Server options from 1.7 include `CommandBatchMaxTimeout`, `SlidingInvisibilityTimeout`, `QueuePollInterval`, `UseRecommendedIsolationLevel` and `DisableGlobalLocks`; the last requires a migration to schema 7. [S9] [S6]
- Several server instances can run at the same time, on one or several machines, and coordinate through distributed locks. The default server ID is machine name plus process ID, so two servers in one process need a manually unique `ServerName`. [S8]
- `RecurringJob.AddOrUpdate` registers or updates a recurring job by its identifier, and the job definition is kept in persistent storage. [S5]
- The Hangfire Server checks recurring jobs on a minute-based interval and enqueues them as fire-and-forget jobs, so the documented granularity is one minute. [S5]
- The API reference takes 5- or 6-part cron expressions and throws a format error on a wrong part count. [S10]
- `RecurringJobOptions.TimeZone` sets a time zone per recurring job. `MisfireHandling` has modes Relaxed (default), Strict and Ignorable. [S9] [S10]
- A built-in dashboard is available through `app.UseHangfireDashboard()`. [S11]
- The dashboard has a Failed jobs page with a Retry button for jobs that have used up their automatic attempts. [S11]
- Automatic retries are on by default for every job. The default is 10 attempts with an increasing delay between them, and each failed attempt is logged as a warning. The attempt count can be changed per method with the `AutomaticRetry` attribute (`Attempts`) or globally through `GlobalJobFilters`. [S30] [S11]
- When the attempts are exhausted, the job moves to the Failed state, with an error log entry, and can be retried manually. [S30]
- Processed jobs end in a final state of Succeeded or Deleted and expire after 24 hours by default. `WithJobExpirationTimeout` sets the expiration globally and must be called after `UseXXXStorage`. Failed is not a final state, so this expiration rule does not describe failed jobs. [S31]
- Hangfire is licensed under LGPLv3 and the core is free for commercial use. Some features, such as batches, are marked Pro. [S4]

### Quartz.NET
- Quartz.NET is an open-source (Apache License 2.0) .NET port of the Quartz scheduler, with cron triggers and an ADO.NET job store. [S14]
- Latest stable release overall is 4.4.0, released 2026-10-07 (GitHub Latest and NuGet "last updated" 10/7/2026). It is not marked pre-release. [S12] [S13]
- Quartz.NET 4.x targets .NET 10 only. The README says "Quartz.NET 4 targets .NET 10, and nothing else." NuGet 4.4.0 lists only net10.0. [S14] [S12]
- The 3.x line is maintained on its own branch and supports .NET Standard 2.0 and .NET Framework 4.6.2 or later. [S14]
- Quartz 3.22.4 lists net8.0, netstandard2.0, net9.0 and net10.0 assets, with net8.0 depending on Microsoft.Extensions.Logging.Abstractions >= 2.1.1. NuGet shows last updated 10/5/2026. [S15]
- GitHub lists v3.22.4 as published 08 Oct, and v4.4.0 as 07 Oct. Neither release note mentions .NET 8 or a target change. The GitHub page shows day and month only. [S13]
- A cron expression has 6 or 7 fields; seconds is the first, mandatory field, and year is optional. [S20]
- Cron triggers support `InTimeZone(...)` and misfire instructions. The documented constants are `DoNothing`, `FireOnceNow`, and `SmartPolicy` (the default, which CronTrigger treats as FireOnceNow). [S20]
- For 4.x, the best-practices guide shows a cron trigger with `CronTriggerMisfireInstruction.DoNothing` and an `InTimeZone` setting. [S16]
- For 4.x clustering, every node needs the same scheduler name, a unique instance ID (`AUTO` generates one), clustering turned on, and a persistent store (`UseClustering()`). [S16]
- For 4.x hosting, `services.AddQuartz(...)` and `services.AddQuartzHostedService(q => q.WaitForJobsToComplete = true)` register Quartz with ASP.NET Core. [S17]
- For 4.x, `UseSqlServer(...)` on the persistent store builder configures the SQL Server driver. The API docs note it requires unreferenced code and suggests a DbDataSource for trimmed apps. [S18]
- For 3.x, the ADO.NET job store is `AdoJobStore` with `JobStoreTX`, and the provider list includes SqlServer. From 3.2 on .NET Core, the default provider is Microsoft.Data.SqlClient. [S19]
- For 3.x, Quartz.NET does not create or migrate its job store tables. The operator runs the table creation scripts, which cover the supported providers and use a configurable table prefix (`qrtz_` on the 3.x database page, `QRTZ_` on the job stores page). Different prefixes let several scheduler instances share one database. [S25] [S19]
- For 3.x, clustering needs `quartz.jobStore.clustered` set to true on AdoJobStore (`JobStoreTX` or `JobStoreCMT`). Every node uses the same properties except thread pool size and `quartz.scheduler.instanceId`, which must be unique per node (`AUTO` generates one). Nodes need clocks within about one second of each other, and a non-clustered instance must not use the same tables. [S24]
- For 3.x, the ASP.NET Core hosting package is Quartz.AspNetCore 3.22.4, which has a net8.0 dependency group. `services.AddQuartz(...)` and `services.AddQuartzServer(options => options.WaitForJobsToComplete = true)` run the scheduler inside the ASP.NET Core process and start and stop it with the application. [S22] [S23]
- For 3.x, `AddQuartzServer` also registers a health check named `quartz-scheduler`, which reports unhealthy when the scheduler is not running or cannot reach its store. [S23]
- For 3.x, Quartz.Dashboard is an optional add-on package, documented on the 3.x docs site. It is a Blazor dashboard that runs inside the ASP.NET Core app and needs Quartz 3.16 or later on .NET 8 or newer. It shows the scheduler summary, jobs and triggers with search, currently executing jobs, a live event log, and pause, resume, trigger-now and unschedule actions. The docs call it a work in progress. [S26]
- For 3.x, the Quartz.Dashboard page says optional history plugins populate execution history, but it names no run-history view, failed-job view or misfire view. [S26]
- For 3.x, the trigger and job listeners interface offers JobToBeExecuted, JobWasExecuted, JobExecutionVetoed and TriggerMisfired callbacks. Listeners are not stored in the job store, must be re-registered on each start, and must never throw. [S27]
- For 3.x, the OpenTelemetry integration (`OpenTelemetry.Instrumentation.Quartz`, `AddQuartzInstrumentation`) requires Quartz 3.1 or later. The page does not list which signals are emitted. [S28]
- The 3.x docs tutorial pages cover jobs, triggers, listeners and job stores. None of them describes automatic retries for failed jobs or persisted run history. [S29] [S27]
- The 3.x docs index has no separate monitoring page and no built-in dashboard. The dashboard is an add-on, documented as described above. [S21] [S26]
- The 4.4.0 release adds a run-statistics chart (SQL Server 2012 or later), a misfire feed that includes vetoed firings, and a rule that triggers failing five times in a row are parked in ERROR. These are 4.x features and are not part of the 3.22.4 line. [S32]

## Constraint check
| Constraint | Candidate | Status | Evidence |
|---|---|---|---|
| H1 | Hangfire | met | .NET 8 via netstandard2.0 compatibility (net8.0 computed) [S3]; Hangfire.Core test target moved to net8.0 in 1.8.22 [S2]. No explicit "supports .NET 8" statement found. |
| H1 | Quartz.NET | unmet | H1 is evaluated on the latest stable release, 4.4.0, which lists only net10.0 [S12] [S14]. The 3.22.4 line lists net8.0 [S15] and is recorded under Findings, but it is not the current stable release. |
| H2 | Hangfire | met | SQL Server storage with automatic schema install [S6]; Hangfire.SqlServer 1.8.25 on NuGet [S1]. |
| H2 | Quartz.NET | met | 4.x: `UseSqlServer` on the persistent store [S18]. 3.x: AdoJobStore with SqlServer provider and operator-run table scripts [S19] [S25]. |
| H3 | Hangfire | met | Cron-based recurring jobs via AddOrUpdate, minute-based polling [S5]; time zone and misfire options [S9] [S10]. |
| H3 | Quartz.NET | met | Cron triggers with InTimeZone and misfire instructions [S20]; 4.x example [S16]. |

## Open issues
- Quartz.NET H1 line: H1 is decided on the latest stable release, 4.4.0 (GitHub "Latest", NuGet 4.4.0), which is unmet. If the requirement is read as "any maintained line", H1 would be met on 3.22.4, and the brief must then say so. The coordinator makes that call. research/12-ecosystem.md is owned by ecosystem-researcher, and its H1 Quartz.NET cell still reads "met" and must be set to unmet to match this file. docs-researcher did not change that file.
- Quartz 3.22.4 date conflict: GitHub lists the release as 08 Oct (year not shown), while NuGet shows last updated 10/5/2026. The NuGet "last updated" value is not a publish date, so the release date is not confirmed. The 2026 year is inferred from NuGet.
- Quartz 3.x ASP.NET Core hosting: the Quartz.AspNetCore 3.22.4 package page and the 3.x integration page were read through a summarizing fetch. The health check and shutdown option are quoted from that summary; wording should be checked against the source before publication.
- Quartz 3.x clustering: `clusterCheckinInterval` and any rule requiring the same scheduler name on every node are not covered by the 3.x clustering page [S24]. Clustering on SQL Server has no SQL Server-specific guidance in the 3.x docs.
- Quartz 3.x SQL Server setup: the table prefix is `qrtz_` on the 3.x database page [S25] and `QRTZ_` on the job stores page [S19]. The case difference is not resolved. The SQL Server-specific 3.x setup page returned HTTP 404 in an earlier attempt, and the exact path of the SQL Server script was not verified.
- Quartz 3.x monitoring: the dashboard is documented as a work in progress [S26], and the page names no run-history or failed-job view, so Quartz 3.x job history is not documented as a feature. The OpenTelemetry page does not list emitted signals [S28].
- Quartz 3.x retries: no automatic retry feature for Quartz.NET 3.x jobs was found in the 3.x docs reviewed [S29]. The 4.4.0 retry changes (SendMailJob and NativeJob no longer retry by default) apply to 4.x [S32] and are not evidence for the 3.22.4 line.
- Hangfire job history: the 24-hour default expiry for succeeded jobs is documented [S31]. How far the dashboard can show history after expiry, and the depth of failed-job history, were not verified.
- Hangfire seconds: the published recurring-jobs page does not state the cron field count [S5]. The API reference says 5- or 6-part [S10], but it does not say whether the sixth part is seconds. Sub-minute schedules are not supported by the minute-based polling [S5].
- Hangfire time zone and misfire options come from the repo's `_autodocs` reference files [S9] [S10], not the published docs site, which does not cover them.
- Hangfire .NET 8 support: no official "supports .NET 8" statement was found. H1 is marked met based on target compatibility and the net8.0 test target.
- Hangfire lifecycle: no official LTS, support or end-of-life policy was found for Hangfire 1.8.x.
- Quartz 4.x lifecycle: no support or end-of-life policy was checked, because the 4.x line is not usable on .NET 8.
- Dates were read from registry and GitHub pages through a summarizing fetch. Years on GitHub release pages were not shown; they are inferred from NuGet.
- Hangfire retry and expiry statements come from the Hangfire documentation repository through Context7 [S30] [S31], not from the published docs site, which returned HTTP 404 for the retries page.

## Sources
[S1] Hangfire.SqlServer 1.8.25 (NuGet) — https://www.nuget.org/packages/Hangfire.SqlServer — retrieved 2026-10-12 — via web
[S2] Hangfire releases (GitHub) — https://github.com/HangfireIO/Hangfire/releases — retrieved 2026-10-12 — via web
[S3] Hangfire.AspNetCore (NuGet) — https://www.nuget.org/packages/Hangfire.AspNetCore — retrieved 2026-10-12 — via web
[S4] Hangfire home page — https://www.hangfire.io/ — retrieved 2026-10-12 — via web
[S5] Hangfire docs: Performing recurrent tasks — https://docs.hangfire.io/en/latest/background-methods/performing-recurrent-tasks.html — retrieved 2026-10-12 — via web
[S6] Hangfire docs: Using SQL Server — https://docs.hangfire.io/en/latest/configuration/using-sql-server.html — retrieved 2026-10-12 — via web
[S7] Hangfire docs: ASP.NET Core applications (getting started) — https://github.com/hangfireio/hangfire.documentation/blob/main/getting-started/aspnet-core-applications.rst — retrieved 2026-10-12 — via mcp:context7
[S8] Hangfire docs: Running multiple server instances — https://github.com/hangfireio/hangfire.documentation/blob/main/background-processing/running-multiple-server-instances.rst — retrieved 2026-10-12 — via mcp:context7
[S9] Hangfire configuration reference (repo) — https://github.com/hangfireio/hangfire/blob/main/_autodocs/configuration.md — retrieved 2026-10-12 — via mcp:context7
[S10] Hangfire RecurringJobManager reference (repo) — https://github.com/hangfireio/hangfire/blob/main/_autodocs/api-reference/RecurringJobManager.md — retrieved 2026-10-12 — via mcp:context7
[S11] Hangfire docs: Send email tutorial (dashboard, automatic retries, Failed jobs page) — https://github.com/hangfireio/hangfire.documentation/blob/main/tutorials/send-email.rst — retrieved 2026-10-12 — via mcp:context7
[S12] Quartz (NuGet) — https://www.nuget.org/packages/Quartz — retrieved 2026-10-12 — via web
[S13] Quartz.NET releases (GitHub) — https://github.com/quartznet/quartznet/releases — retrieved 2026-10-12 — via web
[S14] Quartz.NET README (GitHub) — https://github.com/quartznet/quartznet/blob/main/README.md — retrieved 2026-10-12 — via web
[S15] Quartz 3.22.4 (NuGet) — https://www.nuget.org/packages/Quartz/3.22.4 — retrieved 2026-10-12 — via web
[S16] Quartz.NET best practices (GitHub docs) — https://github.com/quartznet/quartznet/blob/main/docs/documentation/best-practices.md — retrieved 2026-10-12 — via mcp:context7
[S17] Quartz.NET troubleshooting (GitHub docs) — https://github.com/quartznet/quartznet/blob/main/docs/documentation/troubleshooting.md — retrieved 2026-10-12 — via mcp:context7
[S18] Quartz.NET public API reference (UseSqlServer) — https://github.com/quartznet/quartznet/blob/main/src/Quartz.Tests.Unit/Verify/PublicApiTest_Quartz.verified.txt — retrieved 2026-10-12 — via mcp:context7
[S19] Quartz.NET 3.x job stores (GitHub docs) — https://github.com/quartznet/quartznet/blob/main/docs/documentation/quartz-3.x/tutorial/job-stores.md — retrieved 2026-10-12 — via web
[S20] Quartz.NET 3.x cron triggers (GitHub docs) — https://github.com/quartznet/quartznet/blob/main/docs/documentation/quartz-3.x/tutorial/crontriggers.md — retrieved 2026-10-12 — via web
[S21] Quartz.NET 3.x documentation index — https://www.quartz-scheduler.net/documentation/quartz-3.x/ — retrieved 2026-10-12 — via web
[S22] Quartz.AspNetCore 3.22.4 (NuGet) — https://www.nuget.org/packages/Quartz.AspNetCore/3.22.4 — retrieved 2026-10-12 — via web
[S23] Quartz.NET 3.x ASP.NET Core integration — https://www.quartz-scheduler.net/documentation/quartz-3.x/packages/aspnet-core-integration.html — retrieved 2026-10-12 — via web
[S24] Quartz.NET 3.x Advanced (Enterprise) Features — https://www.quartz-scheduler.net/documentation/quartz-3.x/tutorial/advanced-enterprise-features.html — retrieved 2026-10-12 — via web
[S25] Quartz.NET 3.x database schema — https://www.quartz-scheduler.net/documentation/quartz-3.x/db/ — retrieved 2026-10-12 — via web
[S26] Quartz.Dashboard (3.x docs) — https://www.quartz-scheduler.net/documentation/quartz-3.x/packages/dashboard.html — retrieved 2026-10-12 — via web
[S27] Quartz.NET 3.x trigger and job listeners — https://www.quartz-scheduler.net/documentation/quartz-3.x/tutorial/trigger-and-job-listeners.html — retrieved 2026-10-12 — via web
[S28] Quartz.NET 3.x OpenTelemetry integration — https://www.quartz-scheduler.net/documentation/quartz-3.x/packages/opentelemetry-integration.html — retrieved 2026-10-12 — via web
[S29] Quartz.NET 3.x tutorial directory (GitHub) — https://github.com/quartznet/quartznet/tree/main/docs/documentation/quartz-3.x/tutorial — retrieved 2026-10-12 — via web
[S30] Hangfire docs: Dealing with exceptions (automatic retries) — https://github.com/hangfireio/hangfire.documentation/blob/main/background-processing/dealing-with-exceptions.rst — retrieved 2026-10-12 — via mcp:context7
[S31] Hangfire docs: Background methods (states and expiration) — https://github.com/hangfireio/hangfire.documentation/blob/main/background-methods/index.rst — retrieved 2026-10-12 — via mcp:context7
[S32] Quartz.NET v4.4.0 release notes — https://github.com/quartznet/quartznet/releases/tag/v4.4.0 — retrieved 2026-10-12 — via web
