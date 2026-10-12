---
artifact: docs
agent: docs-researcher
run_id: 20261012-2204-nodejs-logging-pino-vs-winston
attempt: 1
---
# Official documentation

## Summary
Both candidates are MIT-licensed and published on npm and GitHub: pino 10.4.0 was released 2026-10-02, and winston 3.19.0 was released 2025-12-07, about ten months before this run. Pino's official docs centre on low per-log overhead: an asynchronous default destination, transports that run in worker threads, and a README claim of over 5x speed against alternatives. Winston's official docs cover richer configuration (formats, npm levels, child metadata, transports) but do not describe a throughput design. The only benchmark in either candidate's official docs is unversioned and undated; it puts winston at roughly 2.3 times the per-call time of pino for basic and object logs. Current, versioned throughput evidence is missing and is listed under Open issues.

## Findings

### pino
- Latest stable release is pino 10.4.0, published 2026-10-02 and marked "Latest" on GitHub [S1][S4].
- The previous 10.x releases were v10.3.1 (2026-02-09), v10.3.0 (2026-01-23), v10.2.1 (2026-01-19) and v10.2.0 (2026-01-14) [S2].
- pino is licensed MIT [S3][S4].
- The README describes pino as "Very low overhead" and states "In many cases, Pino is over 5x faster than alternatives" [S5].
- The README advises that "sending, alert triggering, reformatting, and all forms of log processing are conducted in a separate process or thread" [S5].
- `pino.destination()` defaults to stdout (file descriptor 1) and is asynchronous by default with a 4096-byte minimum buffer; `sync: true` is available [S6].
- Pending asynchronous output is flushed on process exit through on-exit-leak-free when running on the main thread [S7].
- The `fatal` level method calls `flushSync()` after writing, so the last fatal line is flushed even when the process is about to terminate [S8].
- `pino.transport()` routes logs to a worker thread; transports run asynchronously unless `sync` is set to true in the transport options [S9][S6].
- `pino.transport()` supports `targets` with a per-target `level`, and `pipeline` arrays, so one logger can fan out to several destinations [S6].
- `logger.child(bindings, options)` adds the bindings to every line; `options` can override `level`, `msgPrefix`, `redact` and `serializers` [S6].
- The `redact` option takes paths (dot and bracket notation) and optionally an object with `censor` (default `'[Redacted]'`) and `remove`; the docs warn never to let user input define redacted paths [S6][S10].
- The default log level is `info`, and log lines carry numeric levels (for example `"level":30` for info) [S6][S5].
- Benchmark (average time per call, lower is better): basic string log 114.801 ms for Pino and 270.249 ms for Winston; object log 119.315 ms for Pino and 273.120 ms for Winston; deeply nested object 2.256 ms for Pino and 5.604 ms for Winston [S11].
- The benchmark page does not name the pino or winston versions, the Node.js version or the run date [S11].
- `pino-opentelemetry-transport` 4.0.2 is MIT-licensed, lives in the pinojs GitHub organisation, and outputs logs in the OpenTelemetry Log Data Model to an OTLP logs collector [S12].
- The transport reads `trace_id`, `span_id` and `trace_flags` attributes from a log line and turns them into the OpenTelemetry span context; the documented example pairs it with the OpenTelemetry Node SDK and `PinoInstrumentation` [S13].
- Runtime lifecycle, which applies to pino as well as winston: Node.js 24.x is Active LTS until end of life on 2028-04-30, Node.js 22.x is Maintenance LTS until 2027-04-30, and Node.js 26.x becomes Active LTS on 2026-10-28 [S22].

### winston
- Latest stable release is winston 3.19.0, published 2025-12-07 and marked "Latest" on GitHub [S14][S15].
- The previous releases were v3.18.3, v3.18.2, v3.18.1 and v3.18.0 (all 2025-09-30) and v3.17.0 (2024-11-10) [S15].
- winston is licensed MIT and declares `"node": ">= 12.0.0"` in its `engines` field [S16][S17].
- The README states that levels default to npm levels `error` (0) through `silly` (6), and that levels "must be specified at the time of creating your logger" [S18].
- Formats are provided through `winston.format` [S18].
- The README says winston can catch and log `uncaughtException` and `unhandledRejection` events, and that by default winston exits the process after logging an `uncaughtException` [S18].
- The README warns that "leaving the default logger without any transports may produce a high memory usage issue" [S18].
- The Console transport writes to stdout or stderr (stderr for error and warn levels) and invokes its callback synchronously after the write [S19].
- `logger.child(defaultRequestMetadata)` merges the metadata into every entry and shares transports, levels, format and handlers with the parent [S20].
- The README cautions that `.child` "is likely to be bugged if you're also extending the `Logger` class" [S18].
- `logger.configure()` defaults to the JSON format, level `info`, `defaultMeta` null and `exitOnError` true [S20].
- Benchmark (same page as for pino; lower is better): basic string log 270.249 ms and object log 273.120 ms for Winston; deeply nested object 5.604 ms for Winston [S11].
- `@opentelemetry/instrumentation-winston` 0.67.0 is Apache-2.0-licensed and is published from the OpenTelemetry JS contrib repository [S21].
- Runtime lifecycle, which applies to winston as well as pino: Node.js 24.x is Active LTS (Active LTS start 2025-10-28; Maintenance start 2026-10-20; end of life 2028-04-30). Node.js 22.x is Maintenance LTS (end of life 2027-04-30). Node.js 26.x is the current release (initial release 2026-05-05) and becomes Active LTS on 2026-10-28 [S22].

## Constraint check
| Constraint | Candidate | Status | Evidence |
|---|---|---|---|
| H1 | pino | met | MIT license: [S3][S4] |
| H1 | winston | met | MIT license: [S16][S17] |

## Open issues
- Throughput evidence is weak for both candidates. The only benchmark in the official docs (pino `docs/benchmarks.md`) names neither the pino nor winston version, the Node.js version, nor the date of the run [S11]. No current, versioned throughput comparison was found in the official docs.
- The README's pino claim of "over 5x faster than alternatives" [S5] does not name the alternatives or the version it was measured against.
- Pino's minimum supported Node.js version is not stated: its `package.json` has no `engines` field and the README gives no version floor [S3][S5]. Compatibility with Node.js 24 (Active LTS) and 26 is therefore not verified by docs.
- Winston's built-in field-level redaction option was not found in the fetched docs. The README only shows a pattern for filtering out an entire `info` object by format, and the section was truncated during fetching [S18].
- The stability status of `@opentelemetry/instrumentation-winston` (stable, beta or experimental) was not verified: the npm registry entry does not state it and the OpenTelemetry registry page could not be read past its first 100,000 characters [S21].
- Winston's latest release is about ten months old at the decision date (2025-12-07 against 2026-10-12) [S14]. Whether the project is still actively maintained is a maturity question and is left to the ecosystem research.
- Pino 10.x breaking changes and migration notes were not reviewed. The v10.4.0 release notes mention an incompatibility between `formatters.level` and multi-target transports [S1]; its impact on this decision was not assessed.

## Sources
[S1] v10.4.0 release (pinojs/pino, GitHub API) — https://api.github.com/repos/pinojs/pino/releases/latest — retrieved 2026-10-12 — via web
[S2] pino releases list (GitHub API) — https://api.github.com/repos/pinojs/pino/releases?per_page=6 — retrieved 2026-10-12 — via web
[S3] pino package.json (pinojs/pino main) — https://raw.githubusercontent.com/pinojs/pino/main/package.json — retrieved 2026-10-12 — via web
[S4] pino package metadata (npm registry, latest) — https://registry.npmjs.org/pino/latest — retrieved 2026-10-12 — via web
[S5] pino README — https://raw.githubusercontent.com/pinojs/pino/main/README.md — retrieved 2026-10-12 — via web
[S6] pino API reference (docs/api.md) — https://github.com/pinojs/pino/blob/main/docs/api.md — retrieved 2026-10-12 — via mcp:context7
[S7] pino lib/tools.js (on-exit flush) — https://github.com/pinojs/pino/blob/main/lib/tools.js — retrieved 2026-10-12 — via mcp:context7
[S8] pino lib/levels.js (fatal level flush) — https://github.com/pinojs/pino/blob/main/lib/levels.js — retrieved 2026-10-12 — via mcp:context7
[S9] pino transports guide (docs/transports.md) — https://github.com/pinojs/pino/blob/main/docs/transports.md — retrieved 2026-10-12 — via mcp:context7
[S10] pino redaction guide (docs/redaction.md) — https://github.com/pinojs/pino/blob/main/docs/redaction.md — retrieved 2026-10-12 — via mcp:context7
[S11] pino benchmarks (docs/benchmarks.md) — https://github.com/pinojs/pino/blob/main/docs/benchmarks.md — retrieved 2026-10-12 — via web
[S12] pino-opentelemetry-transport package metadata (npm registry, latest) — https://registry.npmjs.org/pino-opentelemetry-transport/latest — retrieved 2026-10-12 — via web
[S13] pino-opentelemetry-transport examples and architecture (_autodocs) — https://github.com/pinojs/pino-opentelemetry-transport/blob/main/_autodocs/examples.md — retrieved 2026-10-12 — via mcp:context7
[S14] v3.19.0 release (winston, GitHub API) — https://api.github.com/repos/winstonjs/winston/releases/latest — retrieved 2026-10-12 — via web
[S15] winston releases list (GitHub API) — https://api.github.com/repos/winstonjs/winston/releases?per_page=6 — retrieved 2026-10-12 — via web
[S16] winston package.json (winstonjs/winston master) — https://raw.githubusercontent.com/winstonjs/winston/master/package.json — retrieved 2026-10-12 — via web
[S17] winston package metadata (npm registry, latest) — https://registry.npmjs.org/winston/latest — retrieved 2026-10-12 — via web
[S18] winston README — https://raw.githubusercontent.com/winstonjs/winston/master/README.md — retrieved 2026-10-12 — via web
[S19] winston Console transport reference — https://github.com/winstonjs/winston/blob/master/_autodocs/api-reference/transports-console.md — retrieved 2026-10-12 — via mcp:context7
[S20] winston logger reference (child, configure) — https://github.com/winstonjs/winston/blob/master/_autodocs/api-reference/logger.md — retrieved 2026-10-12 — via mcp:context7
[S21] @opentelemetry/instrumentation-winston package metadata (npm registry, latest) — https://registry.npmjs.org/@opentelemetry/instrumentation-winston/latest — retrieved 2026-10-12 — via web
[S22] Node.js release schedule (nodejs/Release README) — https://raw.githubusercontent.com/nodejs/Release/main/README.md — retrieved 2026-10-12 — via web
