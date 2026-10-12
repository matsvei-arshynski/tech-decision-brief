---
artifact: ecosystem
agent: ecosystem-researcher
run_id: 20261012-2103-express5-vs-fastify-node22
attempt: 2
---
# Ecosystem and maturity

## Summary
Express 5 is maintained by the Express Technical Committee under OpenJS Foundation notices, with its latest stable release 5.3.0 published on 2026-10-09, three days before this research. Express 4 still receives 4.22.x releases, but no official end-of-life date is published and paid third-party security support is offered. Fastify is an OpenJS Foundation At-Large project with five lead maintainers and a steady release cadence; its latest stable release is 5.12.5 (2026-09-16), with v6 in alpha. Both are MIT-licensed with no paid edition of the framework itself, and both have large adoption signals (Express about 620M and Fastify about 64M npm downloads in the last month). Fastify shows the more active release history; Express 5 shows the broader user base.

## Findings

### Express 5
- Latest stable release is 5.3.0, published 2026-10-09 (GitHub release v5.3.0, not a prerelease); npm dist-tag `latest` also points to 5.3.0. [S1][S2]
- Release cadence: 3 Express 5.x stable releases in the 12 months to 2026-10-12 (5.2.0 and 5.2.1 on 2025-12-01, 5.3.0 on 2026-10-09); the previous 5.x release before that was 5.1.0 on 2025-03-31. [S1]
- The latest Express 4 release is 4.22.2 (2026-05-11); 3 Express 4.x releases fall in the 12-month window. [S1]
- Backing: expressjs.com carries "Copyright OpenJS Foundation and Express.js contributors" and OpenJS Foundation trademark notices. [S6]
- Governance: the GitHub README names a Technical Committee of 8 current members (plus emeriti and triagers) and the original author TJ Holowaychuk; the README does not explicitly name a backing organisation. [S4]
- Adoption: about 619.7 million npm downloads for the period 2026-09-12 to 2026-10-11. [S8] The GitHub repository has 69,627 stars and 25,208 forks. [S3]
- License: MIT, per the GitHub repository metadata and the README license section. [S3][S4]
- Commercial edition: no paid edition of Express itself was found. A third-party partner, HeroDevs, offers "Never-Ending Support" that includes critical security patches for Express 4 after its end of life. [S5][S6]
- Express 4 security history: the security-updates page lists 4.21.2 as the most recent 4.x security fix and gives no end-of-life date for Express 4. [S7]
- Express 5 breaking-change scope (for maturity context only; compatibility is owned by docs-researcher): the migration guide lists removed methods, changed path-matching syntax, changed `req.body` initialisation and changed rejected-promise handling in middleware. [S9]

### Fastify
- Latest stable release is 5.12.5, published 2026-09-16 (npm dist-tag `latest`). [S10][S11]
- Pre-release: v6.0.0-alpha.0 to alpha.4 were published between 2026-08-11 and 2026-09-17 and are not stable. [S10]
- Release cadence: at least 23 stable Fastify 5.x releases in the 12 months to 2026-10-12 (visible entries run back to 5.6.2 on 2025-11-09; older entries in the window were not visible, so this is a lower bound). [S10]
- Backing: "an At-Large Project in the OpenJS Foundation", hosted by the foundation. [S13][S14]
- Maintainers: five lead maintainers are listed (Matteo Collina, Tomas Della Vedova, KaKa Ng, Manuel Spigolon, James Sumners). [S13]
- Sponsors: the README names NearForm and Platformatic as sponsors that support team members, with financial contributions through Open Collective. [S13]
- All-time contributor counts from the GitHub contributors API: delvedor 774, mcollina 762, Eomm 197 (these are all-time, not a measure of current activity). [S18]
- Adoption: about 63.8 million npm downloads for 2026-09-12 to 2026-10-11. [S17] The GitHub repository has 37,265 stars and 3,061 forks. [S12]
- License: MIT, per the GitHub repository metadata and the README. [S12][S13]
- Commercial edition: no paid edition of Fastify itself was found. HeroDevs is named as a partner that provides commercial security fixes for unsupported versions. [S13][S16]
- LTS: v5.0.0 was released 2024-09-17 with its end of LTS listed as TBD; v4 LTS ended 2025-06-30. [S16]
- Fastify's official migration guide gives the v4 support end date as 2025-06-30, consistent with the LTS table. [S15]

## Constraint check
| Constraint | Candidate | Status | Evidence |
|---|---|---|---|
| H1 | Express 5 | met | MIT per GitHub repository metadata and README [S3][S4] |
| H1 | Fastify | met | MIT per GitHub repository metadata and README [S12][S13] |
| H2 | Express 5 | unknown | Minimum Node.js is 18 [S9]; no Node.js 22 support statement was found in the ecosystem sources. Docs-researcher owns this. |
| H2 | Fastify | met | v5.0.0 LTS lists Node.js 20 and 22 as tested versions [S16]; docs-researcher should confirm the official support statement. |
| H3 | Express 5 | unknown | Middleware compatibility is outside ecosystem research; the migration guide lists middleware-relevant changes [S9]. Docs-researcher owns this. |
| H3 | Fastify | unknown | No ecosystem source found on Express middleware compatibility. Docs-researcher owns this. |
| H4 | Express 5 | n/a | Outside this research (operations, owned by docs-researcher). |
| H4 | Fastify | n/a | Outside this research (operations, owned by docs-researcher). |

## Open issues
- Notable users: no official page listing companies that use Express was found, so the adoption signal is limited to download and star counts. [S3][S8]
- Notable users: the Fastify ecosystem page names no companies as adopters, only plugin authors and partners. [S14]
- Express active-maintainer activity: contribution counts were not retrieved for Express (only for Fastify), so the number of active maintainers is known only from the Technical Committee list. [S4]
- The npm registry responses were truncated, so the `time` object and the maintainer list for the latest versions were not verified. Release dates are taken from GitHub releases instead. [S1][S11]
- Express 4 end-of-life date: not published by the Express project. [S7]
- Express 5 Node.js 22 support and middleware compatibility (H2, H3 for Express 5) are not verified by ecosystem sources; these belong to docs-researcher.
- Fastify H3 (Express middleware compatibility): no source found; belongs to docs-researcher.
- Fastify stable release count in the 12-month window is a lower bound because the GitHub releases list was truncated.

## Sources
[S1] GitHub releases — expressjs/express — https://api.github.com/repos/expressjs/express/releases?per_page=30 — retrieved 2026-10-12 — via web
[S2] npm registry — express — https://registry.npmjs.org/express — retrieved 2026-10-12 — via web
[S3] GitHub repository — expressjs/express — https://api.github.com/repos/expressjs/express — retrieved 2026-10-12 — via web
[S4] Express README (master) — https://raw.githubusercontent.com/expressjs/express/master/Readme.md — retrieved 2026-10-12 — via web
[S5] Express 5.0 release announcement — https://expressjs.com/en/blog/2024-10-15-v5-release — retrieved 2026-10-12 — via web
[S6] Express support page — https://expressjs.com/en/support/ — retrieved 2026-10-12 — via web
[S7] Express security updates — https://expressjs.com/en/advanced/security-updates.html — retrieved 2026-10-12 — via web
[S8] npm downloads (last month) — express — https://api.npmjs.org/downloads/point/last-month/express — retrieved 2026-10-12 — via web
[S9] Express 5 migration guide — https://expressjs.com/en/guide/migrating-5.html — retrieved 2026-10-12 — via web
[S10] GitHub releases — fastify/fastify — https://api.github.com/repos/fastify/fastify/releases?per_page=30 — retrieved 2026-10-12 — via web
[S11] npm registry — fastify — https://registry.npmjs.org/fastify — retrieved 2026-10-12 — via web
[S12] GitHub repository — fastify/fastify — https://api.github.com/repos/fastify/fastify — retrieved 2026-10-12 — via web
[S13] Fastify README (main) — https://raw.githubusercontent.com/fastify/fastify/main/README.md — retrieved 2026-10-12 — via web
[S14] Fastify ecosystem page — https://fastify.dev/ecosystem/ — retrieved 2026-10-12 — via web
[S15] Fastify v5 migration guide — https://fastify.dev/docs/latest/Guides/Migration-Guide-V5/ — retrieved 2026-10-12 — via web
[S16] Fastify LTS policy — https://fastify.dev/docs/latest/Reference/LTS/ — retrieved 2026-10-12 — via web
[S17] npm downloads (last month) — fastify — https://api.npmjs.org/downloads/point/last-month/fastify — retrieved 2026-10-12 — via web
[S18] GitHub contributors — fastify/fastify — https://api.github.com/repos/fastify/fastify/contributors?per_page=10 — retrieved 2026-10-12 — via web
