---
artifact: ecosystem
agent: ecosystem-researcher
run_id: 20261012-2013-hangfire-vs-quartznet-background-jobs
attempt: 1
---
# Ecosystem and maturity

## Summary
Hangfire is the more established and more frequently released project: its latest stable release is 1.8.25 (2026-08-28), with four stable releases in the last 12 months, and its Core library and SQL Server storage are free under LGPL-3.0, with paid subscription editions for private forks and extras. Quartz.NET is also actively maintained and Apache-2.0 licensed with no paid edition found, but its latest major line, 4.x (4.4.0, 2026-10-07), targets only .NET 10; the 3.x line (3.22.4, 2026-10-08) still targets net8.0. Quartz.NET had 29 stable releases in the last 12 months, many of them in the 4.0 to 4.4 series that is only about five weeks old at GA. Neither project publishes a maintainer count or a named-customer list on its official pages, so backing and adoption are judged from registry and repository figures.

## Findings

### Hangfire
- Latest stable release is v1.8.25, published 2026-08-28 (UTC date of the GitHub release, as stated on the release page). [S1][S2]
- Stable releases in the last 12 months (2025-10-12 to 2026-10-12): v1.8.22 (2025-11-07), v1.8.23 (2026-02-05), v1.8.24 (2026-07-16), v1.8.25 (2026-08-28); four in total, no prereleases. [S1]
- Repository: 10,147 stars, 1,753 forks, last push 2026-10-09; GitHub reports 945 open issues and pull requests combined. [S3]
- Backing: the copyright holder and operator is Hangfire OÜ, a company; the official site names it only in the footer. [S4][S10]
- Adoption: Hangfire.Core has 416,488,319 total NuGet downloads. [S9]
- Official pages name no notable users or customers; the logos on the home page are course platforms, not adopters. [S10]
- License: Hangfire Core and SQL Server storage are offered under LGPL-3.0 (the license text grants "version 3 of the License, or (at your option) any later version", which is LGPL-3.0-or-later); the package carries LICENSE.md. GitHub reports the SPDX id as NOASSERTION because the project is dual-licensed. [S4][S3][S6]
- Free "Open" tier: Hangfire Core under LGPL-3.0, free for commercial use, SQL Server 2008 R2 and later, community support only. [S5]
- Paid editions (all per organisation per year): Startup at $500 adds Hangfire Pro under EULA, Redis storage and a private NuGet feed; Business at $1,500 adds Hangfire Ace and Core under EULA, source code access and helpdesk support; Enterprise at $4,500 adds a royalty-free EULA, custom license terms and priority support. [S5]
- The LICENSE text says the LGPL option sits beside a commercial subscription that allows distribution of private forks and modifications. [S4]
- Target frameworks: Hangfire.Core 1.8.25 targets netstandard1.3, netstandard2.0, .NET Framework 4.5.1, 4.6 (no explicit net8.0 group). [S6]
- Hangfire.SqlServer 1.8.25 targets netstandard2.0 (no explicit net8.0 group). [S7]
- Hangfire.AspNetCore 1.8.25 targets netstandard2.0, net461 and netcoreapp3.0 (framework reference), with the same LICENSE.md file license. [S8]
- v1.8.25 release notes: dashboard translations and grammar fixes in Hangfire.Core, a new `SqlServerStorageOptions.DisableFetchSemaphores` option in Hangfire.SqlServer; no breaking changes listed. [S2]

### Quartz.NET
- Latest stable release by version is 4.4.0, published 2026-10-07 (UTC), and the latest 3.x release is 3.22.4, published 2026-10-08 (UTC). [S11][S18]
- Stable releases in the last 12 months (2025-10-12 to 2026-10-12): 29 (including 4.0.0 GA on 2026-09-03 and the 3.x patch line through 3.22.4); the 4.0.0 release candidates, betas and alphas (2026-08-22 to 2026-09-03) are prereleases and are not counted. [S11]
- Repository: 7,092 stars, 1,708 forks, last push 2026-10-11; GitHub reports 7 open issues and pull requests combined. [S12]
- Backing: the project is an open-source community project; the official site names the copyright holder as Marko Lahma and lists no company or foundation. [S20]
- Adoption: the Quartz package has 185,458,906 total NuGet downloads. [S19]
- Official pages name no notable users, adopters or sponsors. [S20]
- License: Apache-2.0 for the repository and the NuGet package (license expression in the package). [S12][S14][S18]
- No paid or commercial edition of Quartz.NET was found on the official site or in the repository. [S20]
- Target frameworks, quartz 4.4.0: the package has a single dependency group, net10.0, with Microsoft.Extensions 10.0.0 dependencies; the NuGet page says "This package targets .NET 10.0". [S14][S18]
- Target frameworks, quartz 4.2.4: a single net10.0 group, with no net8.0 group. [S16]
- The main-branch Quartz.csproj declares a single TargetFramework, net10.0. [S17]
- Target frameworks, quartz 3.22.4: net10.0, net9.0, net8.0, .NET Framework 4.6.2 and 4.7.2, netstandard2.0; Apache-2.0. [S15]
- Official site: the 3.x line is "still maintained" and the current release line is 4.x, which targets .NET 10. [S20]
- v4.4.0 release notes: additions only for the public API (an app on 4.3 compiles unchanged); behaviour changes include cancelled runs recorded as Cancelled, vetoed firings appearing in the misfire feed, triggers that fail five times in a row parked in ERROR, and SendMailJob and NativeJob no longer retrying by default. [S13]
- v4.4.0 release notes: the run-statistics chart needs SQL Server 2012 or later; fixes cover a BLOB foreign key and a pre-2016 install script for the SQL Server job store. [S13]

## Constraint check
| Constraint | Candidate | Status | Evidence |
|---|---|---|---|
| H1 | Hangfire | met | Hangfire.Core, Hangfire.SqlServer and Hangfire.AspNetCore 1.8.25 target netstandard2.0, which net8.0 consumes; no explicit net8.0 group is listed [S6][S7][S8] |
| H1 | Quartz.NET | met | Quartz 3.22.4 (current 3.x stable) lists a net8.0 group [S15]; latest major 4.4.0 targets only net10.0 [S14][S17] (see Open issues) |
| H2 | Hangfire | met | Hangfire.SqlServer 1.8.25 is a published package with SQL Server storage options [S7][S2]; the Open tier lists SQL Server storage [S5] |
| H2 | Quartz.NET | met | Release notes for 4.4.0 cover the SQL Server job store (install script, BLOB foreign key, run statistics on SQL Server 2012+) [S13] |
| H3 | Hangfire | n/a | outside this research |
| H3 | Quartz.NET | n/a | outside this research |

## Open issues
- Quartz.NET H1: the latest major line (4.x, 4.4.0 and 4.2.4 verified) targets only net10.0, so it cannot be restored by a net8.0 project as published. The net8.0 match is the 3.x line (3.22.4), which is the current stable release for .NET 8. The H1 reading ("a current stable release") decides whether Quartz.NET meets H1; the coordinator should confirm which Quartz line to evaluate. The 4.x dependency graph was read from the nuspec and cross-checked against the csproj and NuGet page.
- Hangfire H1: no explicit net8.0 target is listed for any Hangfire package; compatibility with net8.0 rests on netstandard2.0. Whether Hangfire.AspNetCore supports ASP.NET Core 8 in practice is a docs-researcher question.
- Maintainer counts: no active-maintainer count is visible for either project (no contributors data was retrieved). Hangfire backing is a company (Hangfire OÜ); Quartz.NET is a community project with one named copyright holder.
- Notable users: no official adopter list was found for either project; adoption rests on NuGet downloads and GitHub stars only.
- Quartz.NET SQL Server job store: the official ADO.NET job store documentation page returned HTTP 404; SQL Server support is evidenced from the 4.4.0 release notes only. The docs-researcher should confirm the schema and configuration.
- Open-issue counts are not comparable: GitHub counts include pull requests, so Hangfire (945) and Quartz.NET (7) are not directly comparable.
- Quartz.NET 4.x maturity: 4.0.0 reached GA on 2026-09-03, so the major line has about five weeks of release history.
- Hangfire LGPL-3.0: the requirements assume free use in a commercial product. LGPL-3.0 is a copyleft license that applies to modifications of the library itself; a legal review should confirm it is acceptable for the product. This is not a legal opinion.

## Sources
[S1] Hangfire releases (GitHub API) — https://api.github.com/repos/HangfireIO/Hangfire/releases?per_page=30 — retrieved 2026-10-12 — via web
[S2] Hangfire v1.8.25 release notes — https://github.com/HangfireIO/Hangfire/releases/tag/v1.8.25 — retrieved 2026-10-12 — via web
[S3] Hangfire repository (GitHub API) — https://api.github.com/repos/HangfireIO/Hangfire — retrieved 2026-10-12 — via web
[S4] Hangfire LICENSE.md — https://raw.githubusercontent.com/HangfireIO/Hangfire/master/LICENSE.md — retrieved 2026-10-12 — via web
[S5] Hangfire pricing — https://www.hangfire.io/pricing/ — retrieved 2026-10-12 — via web
[S6] Hangfire.Core 1.8.25 nuspec (NuGet) — https://api.nuget.org/v3-flatcontainer/hangfire.core/1.8.25/hangfire.core.nuspec — retrieved 2026-10-12 — via web
[S7] Hangfire.SqlServer 1.8.25 nuspec (NuGet) — https://api.nuget.org/v3-flatcontainer/hangfire.sqlserver/1.8.25/hangfire.sqlserver.nuspec — retrieved 2026-10-12 — via web
[S8] Hangfire.AspNetCore 1.8.25 nuspec (NuGet) — https://api.nuget.org/v3-flatcontainer/hangfire.aspnetcore/1.8.25/hangfire.aspnetcore.nuspec — retrieved 2026-10-12 — via web
[S9] Hangfire.Core package search, download totals (NuGet) — https://azuresearch-usnc.nuget.org/query?q=packageid:Hangfire.Core&prerelease=false — retrieved 2026-10-12 — via web
[S10] Hangfire official site — https://www.hangfire.io/ — retrieved 2026-10-12 — via web
[S11] Quartz.NET releases (GitHub API) — https://api.github.com/repos/quartznet/quartznet/releases?per_page=100 — retrieved 2026-10-12 — via web
[S12] Quartz.NET repository (GitHub API) — https://api.github.com/repos/quartznet/quartznet — retrieved 2026-10-12 — via web
[S13] Quartz.NET v4.4.0 release notes — https://github.com/quartznet/quartznet/releases/tag/v4.4.0 — retrieved 2026-10-12 — via web
[S14] Quartz 4.4.0 nuspec (NuGet) — https://api.nuget.org/v3-flatcontainer/quartz/4.4.0/quartz.nuspec — retrieved 2026-10-12 — via web
[S15] Quartz 3.22.4 nuspec (NuGet) — https://api.nuget.org/v3-flatcontainer/quartz/3.22.4/quartz.nuspec — retrieved 2026-10-12 — via web
[S16] Quartz 4.2.4 nuspec (NuGet) — https://api.nuget.org/v3-flatcontainer/quartz/4.2.4/quartz.nuspec — retrieved 2026-10-12 — via web
[S17] Quartz.csproj on main (GitHub raw) — https://raw.githubusercontent.com/quartznet/quartznet/main/src/Quartz/Quartz.csproj — retrieved 2026-10-12 — via web
[S18] Quartz 4.4.0 package page (NuGet) — https://www.nuget.org/packages/Quartz/4.4.0 — retrieved 2026-10-12 — via web
[S19] Quartz package search, download totals (NuGet) — https://azuresearch-usnc.nuget.org/query?q=packageid:Quartz&prerelease=false — retrieved 2026-10-12 — via web
[S20] Quartz.NET official site — https://www.quartz-scheduler.net/ — retrieved 2026-10-12 — via web
