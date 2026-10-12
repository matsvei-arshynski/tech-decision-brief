# Tech Decision Brief: Express 5 or Fastify for the Node 22 upgrade

## 1. Decision
**Recommendation:** Express 5 · **Confidence:** low

Express 5 has the highest weighted total (85 of 105, against 78 for Fastify) and no unmet hard constraint, so it is recommended. Its in-house middleware stays compatible if it uses only APIs that Express 5 keeps, as the user stated [S1]. Confidence is low because migration effort (H4) is unknown for both candidates, and the lead over Fastify is under 10%.

## 2. Context and confirmed requirements
- **Question:** Should our Express 4 REST API move to Express 5 or migrate to Fastify when the Node.js runtime moves from Node 18 to Node 22 LTS this quarter?
- **Question type:** library
- **Context:** Node.js REST API built on Express 4, currently running on Node 18, moving to Node 22 LTS. Team of 3; skills not stated. Scale not stated.
- **Middleware:** In-house auth and logging middleware, written for Express, uses only APIs that Express 5 keeps (user answer).
- **Effort window:** Migration effort acceptable this quarter is 2–6 weeks (user answer).
- **Assumptions:** Both candidates must run on Node 22 LTS; no other runtime is in scope.
- **H1 (license):** The chosen framework is licensed under MIT or Apache-2.0 only; any other license is excluded.
- **H2 (Node 22 LTS):** The chosen option runs on Node.js 22 LTS, as stated as supported in its official documentation.
- **H3 (middleware):** Existing auth and logging middleware keeps working on the chosen option, or each middleware has a named replacement with a documented migration path.
- **H4 (effort):** Migration effort to the chosen option is at most 6 weeks for a team of 3, to be completed this quarter.
- **P1:** None stated.
- **Decision criteria:** Five weighted criteria, listed with their weights in section 4.

## 3. Options considered
### Express 5
Express 5 is an upgrade of the Express 4 framework the team already uses. Its latest stable release is 5.3.0, published 2026-10-09, and it is MIT-licensed [S2][S3]. The migration guide lists a bounded set of removed and changed APIs and does not name the `(req, res, next)` middleware signature [S1]. Express 5 requires Node.js 18 or higher [S1], and Node 22 is Maintenance LTS until 2027-04-30 [S5]. Express 4 still receives releases (4.22.2, published 2026-05-11), but no Express 4 end-of-life date is published [S4].

### Fastify
Fastify is a different framework from Express, so the move is a migration rather than an upgrade. Its latest stable release is 5.12.5, published 2026-09-16, and it is MIT-licensed [S6][S7]. Fastify v5 supports Node.js 20 and later and was tested on Node 22 [S8][S9]. Express-style middleware runs only through an external plugin, `@fastify/express` or `@fastify/middie`, with documented limits and no formal compatibility guarantee [S10]. Under `use`, parameterized paths such as `/user/:id/comments` are not supported [S10], and v4-to-v5 breaking changes are listed in the migration guide [S11].

## 4. Evaluation matrix

### Hard constraints
| Constraint | Express 5 | Fastify |
|---|---|---|
| H1 Licensed under MIT or Apache-2.0 only | met [S3][S12] | met [S6][S13] |
| H2 Runs on Node.js 22 LTS per official docs | met [S1][S5] | met [S8][S9] |
| H3 Auth and logging middleware keeps working, or has a named replacement | met [S1] | unknown [S10] |
| H4 Migration effort at most 6 weeks for a team of 3, this quarter | unknown [S1] | unknown [S11] |

### Weighted criteria
Scores 1–5 (5 = best); total = Σ weight × score.

| Criterion | Weight | Express 5 | Fastify |
|---|---|---|---|
| Auth and logging middleware compatibility or migration path | 5 | 4 [S1] | 2 [S10] |
| License compliance (MIT or Apache-2.0) | 5 | 5 [S3][S12] | 5 [S6][S13] |
| Migration effort for a team of 3 | 4 | 4 [S1] | 2 [S10][S11] |
| Node.js 22 LTS support | 4 | 3 [S1][S5] | 5 [S8][S9] |
| Maturity and maintenance activity | 3 | 4 [S14][S15] | 5 [S16][S17][S18] |
| **Total** | | **85** | **78** |

## 5. Recommendation and rationale
Express 5 wins on middleware compatibility (weight 5: 4 against 2) and migration effort (weight 4: 4 against 2) [S1][S10][S11]. Fastify wins on Node.js 22 support (5 against 3) [S8][S9] and maturity (5 against 4) [S16]. Both candidates meet H1, and both meet H2, so no hard constraint rules either one out. H3 is met for Express 5 but unknown for Fastify [S10]. Express 5 leads 85 to 78, about 9% above Fastify, which is under the 10% needed for high confidence. It also carries an unknown H4.

Choose Fastify instead if the middleware review shows that Express 5 cannot keep middleware the team relies on, and the team accepts the plugin path for Express-style middleware [S10] and the Node 22 tested support [S8].

## 6. Risks and mitigations
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| In-house middleware uses an API that Express 5 removed or changed, so H3 fails for Express 5 [S1] | medium | high | Review each middleware against the removed and changed list before committing; the code has not been reviewed. |
| Migration effort exceeds 6 weeks; neither candidate has an official effort estimate [S1][S11] | medium | high | Time-box a spike on removed APIs and route-path changes, and set an early checkpoint well before the 6-week limit. |
| Changed `req.body` initialisation, rejected-promise handling and wildcard syntax break routes silently [S1] | medium | medium | Add route tests for named wildcards, body-less requests and rejected handlers. |
| Express 5 has a sparse release history: 3 stable 5.x releases in 12 months [S14] | low | medium | Pin the version and re-check release activity before adoption. |
| Express 4 has no published end-of-life date, so there is no published support deadline for staying on it [S4] | low | medium | Set an internal deadline for the upgrade. |
| If Fastify is chosen: Express-style middleware runs only through a plugin with no formal compatibility guarantee [S10] | medium | high | Prototype each middleware on `@fastify/express` or `@fastify/middie` before committing. |

## 7. Adoption plan
1. Review the in-house auth and logging middleware against the Express 5 removed and changed APIs [S1], and confirm H3 before any upgrade work.
2. Move the existing Express 4 app to Node 22 LTS first, to separate runtime issues from framework changes; Node 22 is Maintenance LTS until 2027-04-30 [S5].
3. Upgrade to Express 5.3.0 [S2][S3] and fix removed APIs such as `app.del()`, `res.sendfile()` and the `'back'` redirect string [S1].
4. Add route tests for named wildcards, `req.body` being `undefined` when not parsed, and rejected promises in middleware [S1].
5. Time-box the work against the 2–6 week window, and record an effort estimate to test H4.
6. Pin the Express version and re-check release activity after the upgrade [S14].

## 8. Open questions
- H4 is unknown for Express 5, because no official effort estimate in weeks was found [S1]. This gap is the reason for the low confidence; a spike on the middleware and routes is needed to estimate it.
- H3 for Express 5 depends on the user's answer that the middleware uses only APIs Express 5 keeps [S1]. The middleware code was not reviewed.
- Express 5 end-of-support and LTS dates were not found in the official sources retrieved in this run.
- Express 5 support for Node 22 is inferred from the stated Node 18 minimum [S1]; no explicit Node 22 statement was found.
- H4 is unknown for Fastify, and no official Express-to-Fastify migration guide was found; the search returned only third-party articles, which are not cited.
- H3 for Fastify stays unknown until the middleware is checked against `@fastify/express` or `@fastify/middie` [S10].
- Team skills are not stated in the requirements.

## 9. Sources
[S1] Migrating to Express 5 — https://expressjs.com/en/guide/migrating-5.html — retrieved 2026-10-12 — via web
[S2] expressjs/express releases (GitHub API) — https://api.github.com/repos/expressjs/express/releases?per_page=8 — retrieved 2026-10-12 — via web
[S3] express package metadata (npm registry) — https://registry.npmjs.org/express/latest — retrieved 2026-10-12 — via web
[S4] Express security updates — https://expressjs.com/en/advanced/security-updates.html — retrieved 2026-10-12 — via web
[S5] Node.js release schedule (nodejs/Release README) — https://raw.githubusercontent.com/nodejs/Release/main/README.md — retrieved 2026-10-12 — via web
[S6] fastify package metadata (npm registry) — https://registry.npmjs.org/fastify/latest — retrieved 2026-10-12 — via web
[S7] fastify/fastify releases (GitHub API) — https://api.github.com/repos/fastify/fastify/releases?per_page=8 — retrieved 2026-10-12 — via web
[S8] Fastify V5 Migration Guide, Long Term Support Cycle — https://github.com/fastify/fastify/blob/main/docs/Guides/Migration-Guide-V5.md — retrieved 2026-10-12 — via mcp:context7
[S9] Fastify Long Term Support policy and schedule — https://github.com/fastify/fastify/blob/main/docs/Reference/LTS.md — retrieved 2026-10-12 — via mcp:context7
[S10] Fastify Middleware reference — https://fastify.dev/docs/latest/Reference/Middleware/ — retrieved 2026-10-12 — via web
[S11] Fastify Migration Guide V5 — https://fastify.dev/docs/latest/Guides/Migration-Guide-V5/ — retrieved 2026-10-12 — via web
[S12] GitHub repository — expressjs/express — https://api.github.com/repos/expressjs/express — retrieved 2026-10-12 — via web
[S13] GitHub repository — fastify/fastify — https://api.github.com/repos/fastify/fastify — retrieved 2026-10-12 — via web
[S14] GitHub releases — expressjs/express — https://api.github.com/repos/expressjs/express/releases?per_page=30 — retrieved 2026-10-12 — via web
[S15] npm downloads (last month) — express — https://api.npmjs.org/downloads/point/last-month/express — retrieved 2026-10-12 — via web
[S16] GitHub releases — fastify/fastify — https://api.github.com/repos/fastify/fastify/releases?per_page=30 — retrieved 2026-10-12 — via web
[S17] Fastify README (main) — https://raw.githubusercontent.com/fastify/fastify/main/README.md — retrieved 2026-10-12 — via web
[S18] npm downloads (last month) — fastify — https://api.npmjs.org/downloads/point/last-month/fastify — retrieved 2026-10-12 — via web
