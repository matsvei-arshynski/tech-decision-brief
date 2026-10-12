---
artifact: docs
agent: docs-researcher
run_id: 20261012-2103-express5-vs-fastify-node22
attempt: 1
---
# Official documentation

## Summary
Express 5 is a major-version upgrade of the framework the team already uses. Its official migration guide lists a bounded set of removed and changed APIs, and the in-house middleware stays compatible if it uses only APIs Express 5 keeps, as the user stated; the code itself was not reviewed. Fastify is a different framework. Its v5 line supports Node.js 20 and later and was tested on Node 22, but Express-style middleware runs only through extra plugins with documented limits, and no official Express-to-Fastify migration guide was found. The Node 18 runtime is already end-of-life, so the Node 22 upgrade is needed whichever framework is chosen. Neither set of official docs gives an effort estimate in weeks, so the migration-effort constraint stays unknown for both candidates.

## Findings

### Express 5
- Latest stable release is 5.3.0, published 2026-10-09; the newest 4.x release is 4.22.2, published 2026-05-11. [S1]
- The npm registry lists version 5.3.0, license MIT, and engines `>= 18`. [S2]
- The migration guide says Express 5 requires Node.js version 18 or higher. [S3]
- Removed APIs that crash an app if still used: `app.del()`, `app.param(fn)`, `router.param(fn)`, `req.param(name)`, `res.sendfile()`, `express.static.mime`, the `res.json(obj, status)` and `res.send(status)` signatures, and the `'back'` magic string for `res.redirect()`. [S3]
- Route path syntax changed: wildcards must be named (`/*splat`, not `/*`), the optional `?` is replaced by braces, and regexp characters are not supported in paths. [S3]
- Request middleware and handlers that return rejected promises forward the rejection to error-handling middleware. [S3]
- `req.body` is `undefined` when the body has not been parsed (it was `{}` in Express 4), and `express.urlencoded` defaults `extended` to `false`. [S3]
- The guide's removed and changed list does not name `app.use()` or the `(req, res, next)` middleware signature. [S3]
- Node.js 22 is Maintenance LTS with end-of-life on 2027-04-30. Node.js 18, the current runtime, reached end-of-life on 2025-04-30. [S4]

### Fastify
- Latest stable release is 5.12.5, license MIT. [S5]
- Version 5.12.5 was published 2026-09-16. [S6]
- Version 6 is not stable: the main-branch package.json reports 6.0.0-alpha.4 [S7], the 6.0.0-alpha.4 pre-release was published 2026-09-17 [S6], and the LTS schedule lists the 6.0.0 release date as TBD [S8].
- Fastify 5.0.0 was released 2024-09-17 and is tested against Node.js 20, 22, 24 and 26. [S8]
- The v5 migration guide states "Fastify v5 will only support Node.js v20+". [S9]
- Major releases are supported for at least six months from release, then receive security updates for six months after the next major release; the end of LTS for v5 is TBD. [S8]
- v4-to-v5 breaking changes relevant to a migration: full JSON Schema is required for `querystring`, `params`, `body` and `response` schemas; the `logger` option no longer accepts a logger instance (use `loggerInstance`); plugins cannot mix callback and promise APIs; `reply.redirect()` takes the URL first; setting `reply.sent` is forbidden; decorating Request or Reply with reference types is prohibited. [S10]
- Express-style middleware needs an external plugin: `@fastify/express` or `@fastify/middie`. [S11]
- Middleware receives Node's `req` and `res` rather than Fastify's Request and Reply, and the middleware does not expose the `send` method. [S11]
- Path matching for `use` does not support parameterized routes such as `/user/:id/comments`. [S11]
- The docs give no formal compatibility guarantee for Express middleware and recommend native plugins where they exist: `@fastify/helmet` for helmet, `@fastify/cors` for cors, and `@fastify/static` for serve-static. [S11]
- The official ecosystem list names `@fastify/helmet` (security headers), `@fastify/cors`, `@fastify/rate-limit` and `@fastify/one-line-logger` (log formatting) as core plugins. [S12]

## Constraint check
| Constraint | Candidate | Status | Evidence |
|---|---|---|---|
| H1 | Express 5 | met | MIT license per npm registry metadata [S2] |
| H1 | Fastify | met | MIT license per npm registry metadata [S5] |
| H2 | Express 5 | met | Requires Node.js 18 or higher, which includes Node 22 [S3]; engines `>= 18` [S2]; Node 22 is Maintenance LTS to 2027-04-30 [S4] |
| H2 | Fastify | met | v5 supports Node.js 20+ [S9]; v5.0.0 tested on Node 22 [S8] |
| H3 | Express 5 | met | The removed and changed list does not include the middleware signature [S3]; holds only if the in-house middleware uses no removed API, as the user stated; code not reviewed |
| H3 | Fastify | unknown | Express middleware runs via `@fastify/express` or `@fastify/middie` with documented limits and no formal compatibility guarantee [S11]; in-house middleware not reviewed |
| H4 | Express 5 | unknown | Breaking changes form a bounded list [S3]; no effort estimate in official docs |
| H4 | Fastify | unknown | v4-to-v5 changes listed [S10]; no effort estimate in official docs and no Express-to-Fastify guide found |

## Open issues
- Express 5 end-of-support or LTS dates were not found in the official sources retrieved in this run.
- Neither the Express nor the Fastify official docs give a migration effort in weeks, so H4 is unknown for both. Team skills are not stated in the requirements.
- No official Express-to-Fastify migration guide was found on fastify.dev. The web search returned only third-party articles, which are not cited.
- Fastify 5.12.5 registry metadata has no `engines` field. The Node.js 20+ floor comes from the v5 migration guide [S9] and the LTS policy [S8]; whether later 5.x patch releases changed it was not verified.
- The Express docs name Node.js 18 as the minimum and do not name Node 22 explicitly; Node 22 compatibility rests on the stated range.
- The in-house auth and logging middleware was not reviewed. H3 for Express 5 depends on the user's answer; for Fastify it stays unknown until the middleware is checked against `@fastify/express` or `@fastify/middie`.
- License and maturity are owned by ecosystem-researcher; the rows above are included for completeness.
- Fastify 6 is alpha only and was not evaluated as a candidate.

## Sources
[S1] expressjs/express releases (GitHub API) — https://api.github.com/repos/expressjs/express/releases?per_page=8 — retrieved 2026-10-12 — via web
[S2] express package metadata (npm registry) — https://registry.npmjs.org/express/latest — retrieved 2026-10-12 — via web
[S3] Migrating to Express 5 — https://expressjs.com/en/guide/migrating-5.html — retrieved 2026-10-12 — via web
[S4] Node.js release schedule (nodejs/Release README) — https://raw.githubusercontent.com/nodejs/Release/main/README.md — retrieved 2026-10-12 — via web
[S5] fastify package metadata (npm registry) — https://registry.npmjs.org/fastify/latest — retrieved 2026-10-12 — via web
[S6] fastify/fastify releases (GitHub API) — https://api.github.com/repos/fastify/fastify/releases?per_page=8 — retrieved 2026-10-12 — via web
[S7] fastify/fastify package.json on main — https://raw.githubusercontent.com/fastify/fastify/main/package.json — retrieved 2026-10-12 — via web
[S8] Fastify Long Term Support policy and schedule — https://github.com/fastify/fastify/blob/main/docs/Reference/LTS.md — retrieved 2026-10-12 — via mcp:context7
[S9] Fastify V5 Migration Guide, Long Term Support Cycle — https://github.com/fastify/fastify/blob/main/docs/Guides/Migration-Guide-V5.md — retrieved 2026-10-12 — via mcp:context7
[S10] Fastify Migration Guide V5 — https://fastify.dev/docs/latest/Guides/Migration-Guide-V5/ — retrieved 2026-10-12 — via web
[S11] Fastify Middleware reference — https://fastify.dev/docs/latest/Reference/Middleware/ — retrieved 2026-10-12 — via web
[S12] Fastify Ecosystem guide — https://fastify.dev/docs/latest/Guides/Ecosystem/ — retrieved 2026-10-12 — via web
