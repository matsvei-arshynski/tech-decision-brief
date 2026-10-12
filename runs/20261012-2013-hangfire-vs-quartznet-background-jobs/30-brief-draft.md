---
artifact: brief
agent: brief-synthesizer
run_id: 20261012-2013-hangfire-vs-quartznet-background-jobs
attempt: 4
---
# Tech Decision Brief: Hangfire or Quartz.NET for recurring jobs on .NET 8 with SQL Server

## 1. Decision
**Recommendation:** Hangfire · **Confidence:** high

Hangfire meets all three hard constraints on its current stable release, 1.8.25 [S1][S2]. Quartz.NET fails H1 because its current stable release, 4.4.0, targets only .NET 10 [S3][S4]; its .NET 8 line, 3.22.4, is not the current release [S5]. Hangfire also has the higher weighted total, 89 against 74.

## 2. Context and confirmed requirements
- **Question:** Which background job library should our .NET 8 ASP.NET Core API use to run recurring jobs with SQL Server storage: Hangfire or Quartz.NET?
- **Stack:** C#/.NET 8, ASP.NET Core API, SQL Server. Team: none stated. Scale: none stated. Other: none stated.
- **Assumed:** the API runs as one or more instances sharing one SQL Server database, so the job store must be shared, not in-memory.
- **Assumed:** the library must be open source or free to use in a commercial product; paid tiers are out of scope.
- **Assumed:** a built-in dashboard is nice to have, not required.
- **H1:** Supports .NET 8 (net8.0) and ASP.NET Core 8 in a current stable release (compatibility).
- **H2:** Stores job and schedule state in SQL Server (a supported SQL Server job store) (compatibility).
- **H3:** Provides recurring jobs: jobs that repeat on a defined schedule, without custom scheduling code (capability).
- **Preferences:** none stated (no P-items).
- **Decision criteria:** six weighted criteria, scored in section 4.

## 3. Options considered
### Hangfire
Hangfire is an open-source library for fire-and-forget, delayed and recurring jobs, with persistent storage on SQL Server or Redis [S6]. Recurring jobs are registered with `RecurringJob.AddOrUpdate` and kept in persistent storage [S7]. SQL Server storage installs its own schema by default [S8]. Per-job time zones and misfire modes are documented in the repository configuration reference [S9]. The dashboard has a Failed jobs page with a Retry button [S10], and automatic retries default to 10 attempts [S11]. The core is licensed under LGPL-3.0 [S12].

### Quartz.NET
Quartz.NET is an open-source (Apache-2.0) .NET port of the Quartz scheduler, with cron triggers and an ADO.NET job store [S4]. The 3.22.4 line lists net8.0 [S5], and the Quartz.AspNetCore 3.22.4 package has a net8.0 dependency group [S13]. `AddQuartz` and `AddQuartzServer` run the scheduler inside the ASP.NET Core process [S14]. For 3.x, Quartz does not create its job store tables; the operator runs the table scripts [S15]. The dashboard is an optional add-on that the docs call a work in progress [S16]. The 3.x tutorial pages document no automatic retries and no persisted run history [S17].

## 4. Evaluation matrix

### Hard constraints
| Constraint | Hangfire | Quartz.NET |
|---|---|---|
| H1 Supports .NET 8 and ASP.NET Core 8 in a current stable release | met [S2][S18] | unmet [S3][S4] |
| H2 Stores job and schedule state in SQL Server | met [S1][S8] | met [S19][S20][S21] |
| H3 Provides recurring jobs without custom scheduling code | met [S7][S9] | met [S22] |

### Weighted criteria
Scores 1–5 (5 = best); total = Σ weight × score.

| Criterion | Weight | Hangfire | Quartz.NET |
|---|---|---|---|
| Recurring schedule expressiveness (cron-style triggers, time zones, misfire handling) | 5 | 4 [S7][S9][S26] | 5 [S22] |
| .NET 8 and ASP.NET Core integration (DI, hosting, supported target frameworks) | 4 | 4 [S2][S23] | 3 [S3][S5][S13] |
| SQL Server setup and operation (schema creation, migrations, shared-store behaviour across instances) | 4 | 5 [S8][S24] | 3 [S15][S25] |
| Monitoring and operator tooling (dashboard, retries, job history) | 3 | 5 [S10][S11] | 2 [S16][S17] |
| Project maturity and release activity (versions, release dates, adoption) | 3 | 4 [S27][S28] | 3 [S29][S30][S31] |
| License terms for commercial use | 2 | 3 [S12][S32] | 5 [S4][S31] |
| **Total** | | **89** | **74** |

Score notes: Hangfire scores 4 on schedules because it accepts 5- or 6-part cron and polls on a minute interval, with no documented sub-minute support [S26][S7]. Quartz scores 5 because its cron expressions include a mandatory seconds field and support time zones and misfire instructions [S22]. Hangfire scores 5 on SQL Server operation because it installs its schema and its servers coordinate through distributed locks [S8][S24]. Quartz scores 3 because its operator must run the table scripts and clustering needs synchronised clocks [S15][S25]. Quartz scores 3 on .NET 8 integration because its current release 4.4.0 targets only .NET 10 [S3], although the 3.22.4 hosting package supports net8.0 [S5][S13]. Hangfire scores 4 because its net8.0 support is implied by netstandard2.0 targets with no explicit statement [S2][S23]. Hangfire scores 5 on monitoring because it has a dashboard, a Failed jobs page and automatic retries [S10][S11]. Quartz scores 2 because its 3.x dashboard is a work in progress and no automatic retries or run history are documented [S16][S17]. Hangfire scores 4 on maturity: it has four stable releases in the last 12 months and 10,147 stars, and it is company-backed [S27][S28]. Quartz scores 3: it had 29 stable releases in the last 12 months and 7,092 stars, but it is a community project and its 4.x major line reached GA about five weeks before this brief [S29][S30][S31]. Hangfire scores 3 on licence because LGPL-3.0 is copyleft and its paid tiers add Pro features [S12][S32]. Quartz scores 5 because it is Apache-2.0 with no paid edition found [S4][S31].

## 5. Recommendation and rationale
Hangfire is the recommendation because it is the only candidate with no unmet hard constraint, and it has the higher weighted total (89 against 74). Quartz.NET fails H1 on its current stable release, which targets only .NET 10 [S3][S4]. Its 3.22.4 line targets net8.0 [S5][S13], so Quartz.NET would meet H1 only if the team accepted that older line. Even then, Hangfire leads on the weighted total. Quartz.NET wins on schedule expressiveness (seconds-level cron, documented misfire instructions) and on licence terms [S22][S4]. Choose Quartz.NET instead if seconds-level schedules are a real need and the team accepts the 3.x line, operator-run tables and a weaker monitoring story [S22][S15][S16].

## 6. Risks and mitigations
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| LGPL-3.0 copyleft applies to modifications of the library itself [S12] | medium | medium | Have legal review confirm LGPL-3.0 is acceptable for the product before adoption. This is not a legal opinion. |
| Hangfire has no explicit "supports .NET 8" statement; compatibility rests on netstandard2.0 targets [S2][S18] | low | high | Build a net8.0 ASP.NET Core test project with Hangfire.AspNetCore 1.8.25 and SQL Server storage before committing. |
| Hangfire polls on a one-minute interval, so sub-minute schedules are not supported [S7] | low | medium | Confirm no sub-minute schedules are needed. Use delayed jobs for one-off timing. |
| Succeeded jobs expire after 24 hours by default; history beyond that is unverified [S33] | medium | low | Set `WithJobExpirationTimeout` deliberately and test dashboard history retention. |
| Pro-only features (for example batches) need a paid subscription [S32] | low | low | Use only free Core features. |
| Quartz.NET's current line 4.x targets only .NET 10, so a .NET 8 team on Quartz.NET depends on the older 3.x line [S3][S5] | high | medium | If Quartz.NET is chosen, plan the move to .NET 10 or accept the 3.x line for the product's life. |

## 7. Adoption plan
1. **Build a spike.** Create a new .NET 8 ASP.NET Core project and add the NuGet packages Hangfire.AspNetCore and Hangfire.SqlServer, both version 1.8.25 [S2][S1]. Done when the project restores and runs on net8.0.
2. **Wire up Hangfire in Program.cs.** Call `services.AddHangfire(...)` with `UseSqlServerStorage(...)`, and call `services.AddHangfireServer()` so the job server runs inside the API process [S23]. Read the SQL Server connection string from configuration, not from source code. Map the dashboard with `app.UseHangfireDashboard()` [S10]. Done when the API starts and the dashboard page loads.
3. **Agree on schema handling with the DBA.** By default Hangfire creates its SQL Server schema on first start [S8]. If the application account may not create tables, set `PrepareSchemaIfNecessary = false` and install the schema yourselves [S8]. Decide this before any shared environment is touched.
4. **Write one recurring job.** Put the work in a plain method, then register it once at startup with `RecurringJob.AddOrUpdate`, giving it a fixed identifier and a 5-part cron expression. Set the time zone explicitly with `RecurringJobOptions.TimeZone` and choose a `MisfireHandling` mode [S7][S26][S9]. Keep the schedule at one-minute granularity or coarser, because the server polls each minute [S7]. Calling `AddOrUpdate` again with the same identifier updates the job, so schedule changes do not need new code [S7].
5. **Test a failure on purpose.** Make the job method throw on its first run. Confirm in the logs that each failed attempt is recorded as a warning and that Hangfire retries it, by default up to 10 attempts [S11]. Then make it fail every time and confirm it moves to the Failed jobs page, where you can press Retry [S10][S11]. Use the `AutomaticRetry` attribute if the team needs a different attempt count for one job [S11].
6. **Test two instances against one database.** Run two copies of the API against the same SQL Server database. If both run in one process, give each server a unique `ServerName` [S24]. Servers coordinate through distributed locks [S24], so check that the recurring job runs once per scheduled time and not once per instance. Stop one instance and confirm the other keeps the job running.
7. **Set the history retention.** Succeeded jobs expire after 24 hours by default [S33]. Decide how long the team needs to see succeeded job history, then set it with `WithJobExpirationTimeout` after `UseSqlServerStorage` [S33]. Check on the dashboard that the chosen retention is what you see.
8. **Stay on free Core features.** Do not use Pro-only features such as batches, since they need a paid subscription [S32].
9. **Get the LGPL-3.0 review signed off.** Before production, have legal review confirm that LGPL-3.0 is acceptable for the product [S12]. Do not ship until this is recorded.
10. **Write a short operator runbook before go-live.** Cover where failed jobs appear, how to press Retry, how to find the recurring job identifiers, and how to change a schedule through `AddOrUpdate` [S10][S7]. Hand it to whoever will be on call for the API.

## 8. Open questions
- **Quartz.NET H1 reading:** H1 is evaluated on the latest stable release (4.4.0, net10.0 only), so Quartz.NET is unmet [S3][S4]. If H1 is read as "any maintained line", Quartz.NET would meet H1 on 3.22.4 [S5]. Hangfire still leads on the weighted total (89 against 74), so the recommendation does not change. The ecosystem research still marks this cell "met"; the docs research (attempt 2) marks it "unmet", and this brief applies the merge rule, which gives unmet.
- **Hangfire .NET 8:** no official "supports .NET 8" statement was found. H1 is met on target compatibility and the net8.0 test target [S2][S18].
- **Hangfire cron:** the published recurring-jobs page does not state the cron field count. The API reference says 5- or 6-part cron, but does not say whether the sixth part is seconds [S26].
- **Hangfire time zone and misfire options:** these come from the repository reference, not the published docs site [S9].
- **Hangfire lifecycle:** no official LTS, support or end-of-life policy was found for 1.8.x.
- **Quartz 3.22.4 release date:** GitHub lists the release as 08 Oct without a year, and NuGet shows "last updated" 10/5/2026. The publish date is not confirmed [S34].
- **Quartz 3.x integration:** the health check and shutdown option wording was taken from a summarising fetch and should be verified against the source [S14].
- **Adoption:** no official adopter list was found for either project. Adoption rests on NuGet downloads and GitHub stars only.

## 9. Sources
[S1] Hangfire.SqlServer 1.8.25 (NuGet) — https://www.nuget.org/packages/Hangfire.SqlServer — retrieved 2026-10-12 — via web
[S2] Hangfire.AspNetCore (NuGet) — https://www.nuget.org/packages/Hangfire.AspNetCore — retrieved 2026-10-12 — via web
[S3] Quartz (NuGet) — https://www.nuget.org/packages/Quartz — retrieved 2026-10-12 — via web
[S4] Quartz.NET README (GitHub) — https://github.com/quartznet/quartznet/blob/main/README.md — retrieved 2026-10-12 — via web
[S5] Quartz 3.22.4 (NuGet) — https://www.nuget.org/packages/Quartz/3.22.4 — retrieved 2026-10-12 — via web
[S6] Hangfire home page — https://www.hangfire.io/ — retrieved 2026-10-12 — via web
[S7] Hangfire docs: Performing recurrent tasks — https://docs.hangfire.io/en/latest/background-methods/performing-recurrent-tasks.html — retrieved 2026-10-12 — via web
[S8] Hangfire docs: Using SQL Server — https://docs.hangfire.io/en/latest/configuration/using-sql-server.html — retrieved 2026-10-12 — via web
[S9] Hangfire configuration reference (repo) — https://github.com/hangfireio/hangfire/blob/main/_autodocs/configuration.md — retrieved 2026-10-12 — via mcp:context7
[S10] Hangfire docs: Send email tutorial (dashboard, automatic retries, Failed jobs page) — https://github.com/hangfireio/hangfire.documentation/blob/main/tutorials/send-email.rst — retrieved 2026-10-12 — via mcp:context7
[S11] Hangfire docs: Dealing with exceptions (automatic retries) — https://github.com/hangfireio/hangfire.documentation/blob/main/background-processing/dealing-with-exceptions.rst — retrieved 2026-10-12 — via mcp:context7
[S12] Hangfire LICENSE.md — https://raw.githubusercontent.com/HangfireIO/Hangfire/master/LICENSE.md — retrieved 2026-10-12 — via web
[S13] Quartz.AspNetCore 3.22.4 (NuGet) — https://www.nuget.org/packages/Quartz.AspNetCore/3.22.4 — retrieved 2026-10-12 — via web
[S14] Quartz.NET 3.x ASP.NET Core integration — https://www.quartz-scheduler.net/documentation/quartz-3.x/packages/aspnet-core-integration.html — retrieved 2026-10-12 — via web
[S15] Quartz.NET 3.x database schema — https://www.quartz-scheduler.net/documentation/quartz-3.x/db/ — retrieved 2026-10-12 — via web
[S16] Quartz.Dashboard (3.x docs) — https://www.quartz-scheduler.net/documentation/quartz-3.x/packages/dashboard.html — retrieved 2026-10-12 — via web
[S17] Quartz.NET 3.x tutorial directory (GitHub) — https://github.com/quartznet/quartznet/tree/main/docs/documentation/quartz-3.x/tutorial — retrieved 2026-10-12 — via web
[S18] Hangfire releases (GitHub) — https://github.com/HangfireIO/Hangfire/releases — retrieved 2026-10-12 — via web
[S19] Quartz.NET public API reference (UseSqlServer) — https://github.com/quartznet/quartznet/blob/main/src/Quartz.Tests.Unit/Verify/PublicApiTest_Quartz.verified.txt — retrieved 2026-10-12 — via mcp:context7
[S20] Quartz.NET v4.4.0 release notes — https://github.com/quartznet/quartznet/releases/tag/v4.4.0 — retrieved 2026-10-12 — via web
[S21] Quartz.NET 3.x job stores (GitHub docs) — https://github.com/quartznet/quartznet/blob/main/docs/documentation/quartz-3.x/tutorial/job-stores.md — retrieved 2026-10-12 — via web
[S22] Quartz.NET 3.x cron triggers (GitHub docs) — https://github.com/quartznet/quartznet/blob/main/docs/documentation/quartz-3.x/tutorial/crontriggers.md — retrieved 2026-10-12 — via web
[S23] Hangfire docs: ASP.NET Core applications (getting started) — https://github.com/hangfireio/hangfire.documentation/blob/main/getting-started/aspnet-core-applications.rst — retrieved 2026-10-12 — via mcp:context7
[S24] Hangfire docs: Running multiple server instances — https://github.com/hangfireio/hangfire.documentation/blob/main/background-processing/running-multiple-server-instances.rst — retrieved 2026-10-12 — via mcp:context7
[S25] Quartz.NET 3.x Advanced (Enterprise) Features — https://www.quartz-scheduler.net/documentation/quartz-3.x/tutorial/advanced-enterprise-features.html — retrieved 2026-10-12 — via web
[S26] Hangfire RecurringJobManager reference (repo) — https://github.com/hangfireio/hangfire/blob/main/_autodocs/api-reference/RecurringJobManager.md — retrieved 2026-10-12 — via mcp:context7
[S27] Hangfire releases (GitHub API) — https://api.github.com/repos/HangfireIO/Hangfire/releases?per_page=30 — retrieved 2026-10-12 — via web
[S28] Hangfire repository (GitHub API) — https://api.github.com/repos/HangfireIO/Hangfire — retrieved 2026-10-12 — via web
[S29] Quartz.NET releases (GitHub API) — https://api.github.com/repos/quartznet/quartznet/releases?per_page=100 — retrieved 2026-10-12 — via web
[S30] Quartz.NET repository (GitHub API) — https://api.github.com/repos/quartznet/quartznet — retrieved 2026-10-12 — via web
[S31] Quartz.NET official site — https://www.quartz-scheduler.net/ — retrieved 2026-10-12 — via web
[S32] Hangfire pricing — https://www.hangfire.io/pricing/ — retrieved 2026-10-12 — via web
[S33] Hangfire docs: Background methods (states and expiration) — https://github.com/hangfireio/hangfire.documentation/blob/main/background-methods/index.rst — retrieved 2026-10-12 — via mcp:context7
[S34] Quartz.NET releases (GitHub) — https://github.com/quartznet/quartznet/releases — retrieved 2026-10-12 — via web
