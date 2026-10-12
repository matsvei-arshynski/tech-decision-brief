---
artifact: ecosystem
agent: ecosystem-researcher
run_id: 20261012-2204-nodejs-logging-pino-vs-winston
attempt: 4
---
# Ecosystem and maturity

## Summary
Both candidates are MIT-licensed, so hard constraint H1 is met for each. On maturity, pino is the more actively released project: its latest stable release, 10.4.0, is from 2026-10-02, and it shipped 8 releases in the 12 months to 2026-10-12. Winston's latest stable release, 3.19.0, is from 2025-12-07, it is its only release in the last 12 months, and it followed a gap of about ten months after 3.18.0 at the end of September 2025. Adoption is high for both: pino had about 228 million npm downloads in the last month against about 121 million for winston, while winston has more GitHub stars (24,523 against 18,239). No paid or commercial edition was found for either.

## Findings

### pino
- Latest stable release is 10.4.0, published 2026-10-02 [S5]; the npm `latest` tag also points to 10.4.0 [S1].
- Release cadence: 8 stable GitHub releases between 2025-10-18 and 2026-10-02, which is the count for the 12 months to 2026-10-12 [S5].
- Repository was last pushed on 2026-10-06, with 18,239 stars, 1,006 forks and 168 open issues [S7].
- npm lists four maintainer accounts: matteo.collina, jsumners, watson and davidmarkclements [S1]. This is a registry listing, not a count of active maintainers.
- Adoption: 228,227,707 npm downloads for the period 2026-09-12 to 2026-10-11 [S3].
- License is MIT (SPDX `MIT`) according to the repository metadata and the npm package [S7][S1].
- No paid or commercial edition appears in the repository or registry metadata reviewed [S7][S1].
- The OpenTelemetry companion package `pino-opentelemetry-transport` is version 4.0.2, licensed MIT, and published from the pinojs repository [S10]. It is a separate package with its own version and is not part of the pino core license.

### winston
- Latest stable release is 3.19.0, published 2025-12-07 [S6]; the npm `latest` tag also points to 3.19.0 [S2].
- Release cadence: 1 stable GitHub release (3.19.0) in the 12 months to 2026-10-12. The previous release, 3.18.3, was on 2025-09-30, which is outside that window [S6]. Before that, the release before 3.18.0 was 3.17.0 on 2024-11-10 [S6].
- Repository was last pushed on 2026-07-20, with 24,523 stars, 1,854 forks and 542 open issues [S8].
- npm lists eight maintainer accounts [S2]. The original copyright holder named in the LICENSE file is Charlie Robbins [S11]. This is a registry listing, not a count of active maintainers.
- Adoption: 120,556,549 npm downloads for the period 2026-09-12 to 2026-10-11 [S4].
- License is MIT (SPDX `MIT`) according to the repository metadata, the npm package and the LICENSE file [S8][S2][S11].
- No paid or commercial edition appears in the repository or registry metadata reviewed [S8][S2].
- The OpenTelemetry companion package `@opentelemetry/winston-transport` is version 0.33.0 and licensed Apache-2.0, not MIT. It is a separate package from winston and is not covered by winston's MIT license [S9].

## Constraint check
| Constraint | Candidate | Status | Evidence |
|---|---|---|---|
| H1 | pino | met | [S7], [S1] |
| H1 | winston | met | [S8], [S2], [S11] |

## Open issues
- Notable users were not researched. Only official pages were in scope, and no official user list was retrieved for either candidate, so the adoption evidence is limited to download counts and stars.
- Active maintainer counts (for example, committers in the last year) were not verified. The npm maintainer lists are a registry listing and do not show activity.
- Backing organisation: the GitHub organisation names (pinojs, winstonjs) were not confirmed as sponsoring or foundation-backed on an official page.
- Paid or commercial editions: none was found in the repository and registry metadata reviewed. No dedicated search for a commercial offering was run, so this is not exhaustive.
- Download counts are a single last-month snapshot taken on 2026-10-12, so they do not show a trend.
- The pino GitHub releases fetch was truncated after the first 33 entries. Those entries cover the full 12-month window, so the release count is unaffected.

## Sources
[S1] pino — npm registry latest version metadata — https://registry.npmjs.org/pino/latest — retrieved 2026-10-12 — via web
[S2] winston — npm registry latest version metadata — https://registry.npmjs.org/winston/latest — retrieved 2026-10-12 — via web
[S3] pino — npm downloads API, last month — https://api.npmjs.org/downloads/point/last-month/pino — retrieved 2026-10-12 — via web
[S4] winston — npm downloads API, last month — https://api.npmjs.org/downloads/point/last-month/winston — retrieved 2026-10-12 — via web
[S5] pinojs/pino releases — GitHub REST API — https://api.github.com/repos/pinojs/pino/releases — retrieved 2026-10-12 — via web
[S6] winstonjs/winston releases — GitHub REST API — https://api.github.com/repos/winstonjs/winston/releases — retrieved 2026-10-12 — via web
[S7] pinojs/pino repository metadata — GitHub REST API — https://api.github.com/repos/pinojs/pino — retrieved 2026-10-12 — via web
[S8] winstonjs/winston repository metadata — GitHub REST API — https://api.github.com/repos/winstonjs/winston — retrieved 2026-10-12 — via web
[S9] @opentelemetry/winston-transport — npm registry latest version metadata — https://registry.npmjs.org/@opentelemetry%2Fwinston-transport/latest — retrieved 2026-10-12 — via web
[S10] pino-opentelemetry-transport — npm registry latest version metadata — https://registry.npmjs.org/pino-opentelemetry-transport/latest — retrieved 2026-10-12 — via web
[S11] winstonjs/winston LICENSE file — https://github.com/winstonjs/winston/blob/master/LICENSE — retrieved 2026-10-12 — via web
