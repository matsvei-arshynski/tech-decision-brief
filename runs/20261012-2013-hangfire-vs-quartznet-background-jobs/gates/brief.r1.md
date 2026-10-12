---
artifact: gate
agent: validator
run_id: 20261012-2013-hangfire-vs-quartznet-background-jobs
stage: brief
round: 1
result: fail
---
# Gate report: brief, round 1

## Result
FAIL — 5 findings.

## Script gates
| Artifact | STRUCTURE | CITATIONS |
|---|---|---|
| 30-brief-draft.md | pass | pass |

## Semantic gates
| Gate | Result | Notes |
|---|---|---|
| CURRENCY | n/a | Brief stage. |
| CONSTRAINT-COVERAGE | fail | (a) fails for Quartz.NET H1: brief says unmet, but both research Constraint check tables record met. Other statuses follow the merge rule. (b) pass: Hangfire has no unmet. (c) pass: Hangfire has no unknown. Scores 2 and 4 in the matrix are not supported by research findings (findings 2 to 5). |

## Findings
| # | Gate | Artifact | Owner | Finding | Fix hint |
|---|---|---|---|---|---|
| 1 | CONSTRAINT-COVERAGE | 30-brief-draft.md (sections 1, 3, 4 H1 row, 5); research/11-docs.md and research/12-ecosystem.md (Constraint check, H1 Quartz.NET) | docs-researcher | Brief marks H1 for Quartz.NET as unmet. Both research Constraint check tables record H1 Quartz.NET as met (docs: "met, only on the 3.x line"; ecosystem: "met"). The unmet reading appears only in Summary and Evidence prose. The merge rule over the research gives met, so the brief status does not follow it. Brief cannot fix this from the research as it stands. | State which Quartz.NET line H1 evaluates and set the H1 Quartz.NET status cell to match in both research files. If the line is 4.4.0 (latest stable), the cell is unmet and the Evidence says so. If it is 3.22.4, the cell is met and the brief must not say unmet. Resolve the coordinator question in research/12-ecosystem.md Open issues. |
| 2 | CONSTRAINT-COVERAGE | 30-brief-draft.md (section 4, Monitoring row, Quartz.NET score 2 [S23]); research/11-docs.md Open issues; research/12-ecosystem.md Findings | docs-researcher | Quartz.NET monitoring score 2 rests on "no dashboard in the 3.x docs index" [S23]. research/11-docs.md Open issues says the monitoring criterion for Quartz.NET has no finding. research/12-ecosystem.md cites the 4.4.0 release notes for a run-statistics chart and a misfire feed [S13]; the brief does not mention either. | Add cited findings on Quartz.NET monitoring and job history for the line the brief scores. Then either re-cite the score to those findings or state in research why the 4.4.0 run-statistics and misfire-feed findings do not apply to the scored line. |
| 3 | CONSTRAINT-COVERAGE | 30-brief-draft.md (section 4, Monitoring row, Hangfire score 4 [S14]); research/11-docs.md Open issues | docs-researcher | Hangfire monitoring score 4 covers "dashboard, retries, job history". The only cited finding is the dashboard (UseHangfireDashboard [S11]). research/11-docs.md Open issues says automatic retries and job-history depth were not verified. | Add cited findings on Hangfire automatic retries and job history in research/11-docs.md, or state that the score is based on the dashboard alone and bring the evidence for the other two parts. |
| 4 | CONSTRAINT-COVERAGE | 30-brief-draft.md (section 4, .NET 8 and ASP.NET Core integration row, Quartz.NET score 2 [S3][S21]); research/11-docs.md Findings and Open issues | docs-researcher | Quartz.NET integration score 2 cites [S3], which supports net8.0 for 3.22.4, and [S21], the troubleshooting page that research/11-docs.md says documents ASP.NET Core hosting only for 4.x. No cited finding shows a 3.x hosting gap; research/11-docs.md lists 3.x hosting as "not verified". | Add a cited finding on ASP.NET Core hosting for the 3.22.4 line (or a cited statement that it is absent from the 3.x docs). Then cite that finding for the score. Do not cite the 4.x-only page as evidence for the 3.x score. |
| 5 | CONSTRAINT-COVERAGE | 30-brief-draft.md (section 4, SQL Server setup and operation row, Quartz.NET score 2 [S19][S20]); research/11-docs.md Open issues | docs-researcher | Quartz.NET SQL Server operations score 2 cites [S20], the best-practices page that research/11-docs.md ([S16]) gives as clustering evidence for 4.x only. The 3.x clustering and SQL Server setup gap is an open issue, not a cited finding. | Add a cited finding that records the 3.x SQL Server setup and clustering gap with a source, or cite 3.x-specific evidence. Do not cite 4.x-only clustering docs for the 3.x score. |
