---
artifact: docs
agent: docs-researcher
run_id: 20261012-2119-async-python-http-client-choice
attempt: 1
---
# Official documentation

## Summary
Both libraries provide an asyncio client that fits Python 3.12 and both declare permissive licences in package metadata. httpx 0.28.1 is the latest stable release and exposes per-type timeouts, pool limits and transport-level retry, but that retry covers connect errors only. aiohttp 3.14.5 is the latest stable release and exposes a total/connect/read timeout model and a connector limit, but has no retry parameter on the session; it retries closed idempotent connections automatically and otherwise needs middleware. The runtime dependency footprint is smaller for httpx (4 unconditional direct requirements) than for aiohttp (7 unconditional plus 2 conditional).

## Findings

### httpx
- Current version: 0.28.1 is the latest stable release on PyPI; the package declares `requires_python >=3.8`. [S1]
- Release date: 0.28.1 was uploaded on 2024-12-06, and the GitHub releases page lists no later release at retrieval. [S1] [S2]
- Async API: `httpx.AsyncClient` is used with `async with` and the docs advise reusing one client to keep connection pooling. [S3]
- Timeouts: four timeout types exist (connect, read, write, pool), raising `ConnectTimeout`, `ReadTimeout`, `WriteTimeout` and `PoolTimeout`; they are set with `httpx.Timeout(10.0, connect=60.0)`. [S4]
- Pool limits: `httpx.Limits` sets `max_connections` (default 100), `max_keepalive_connections` (default 20) and `keepalive_expiry` (default 5 seconds). [S5]
- Retry: `httpx.AsyncHTTPTransport(retries=N)` retries only on `httpx.ConnectError` and `httpx.ConnectTimeout`; the docs point to general tools such as tenacity for read/write errors or 503 responses. [S6] [S3]
- Python versions: the PyPI classifiers list CPython 3.8 through 3.12, including 3.12. [S1]
- Dependencies: unconditional requirements are anyio, certifi, httpcore (`==1.*`), and idna; brotli, cli, http2, socks and zstd are optional extras. [S1]
- License: PyPI metadata states BSD-3-Clause. [S1]

### aiohttp
- Current version: 3.14.5 is the latest stable release on PyPI; the package declares `requires_python >=3.10`. [S7]
- Release date: the changelog dates the 3.14.5 section 2026-10-10. [S8] The GitHub releases page shows 11 Oct for the same tag. [S9]
- Async API: `aiohttp.ClientSession` is used with `async with` inside `asyncio.run`, and the docs recommend one session for the application lifetime to benefit from connection pooling. [S10]
- Timeouts: `aiohttp.ClientTimeout` has fields `total`, `connect`, `sock_connect` and `sock_read`; the default total is 300 seconds, and `None` or `0` disables a check. [S11]
- Per-request timeout: `ClientSession.request()` accepts `timeout` as a `ClientTimeout` or a float (total seconds) to override the session value. [S10]
- Pool limits: `TCPConnector` defaults to `limit=100` total connections and `limit_per_host=0` (no per-host limit); `connect` also covers waiting for a free pooled connection. [S10] [S11]
- Retry: `ClientSession.request()` has no retry parameter; the changelog records a feature that automatically retries closed connections for idempotent methods (#7297). [S12] The docs' middleware cookbook shows a user-written retry middleware that retries non-ok responses. [S13]
- Python versions: the PyPI classifiers list CPython 3.10 through 3.14, including 3.12. [S7]
- Dependencies: unconditional requirements are aiohappyeyeballs, aiosignal, attrs, frozenlist, multidict, propcache and yarl; typing_extensions (Python below 3.13) and async-timeout (Python below 3.11) are conditional; C speedups are an optional extra. [S7]
- License: the PyPI `license` field is empty, and `license_expression` is `Apache-2.0 AND MIT`. [S7]

## Constraint check
| Constraint | Candidate | Status | Evidence |
|---|---|---|---|
| H1 | httpx | met | `AsyncClient` is used with `async`/`await` [S3] |
| H1 | aiohttp | met | `ClientSession` is used with `async with` inside asyncio [S10] |
| H2 | httpx | met | Python 3.12 classifier; `requires_python >=3.8` [S1] |
| H2 | aiohttp | met | Python 3.12 classifier; `requires_python >=3.10` [S7] |
| H3 | httpx | met | Metadata licence BSD-3-Clause [S1]; upstream LICENSE file is for ecosystem-researcher |
| H3 | aiohttp | met | Metadata `license_expression` Apache-2.0 AND MIT, both allowed [S7]; upstream LICENSE file is for ecosystem-researcher |

## Open issues
- The transitive dependency closure was not fetched (for example, the requirements of httpcore, anyio, yarl). Dependency counts above are direct requirements only.
- The aiohttp changelog entry for #7297 (automatic retry of closed connections) was not located in a release section, so the version that introduced it is unconfirmed.
- aiohttp 3.14.5 is dated 2026-10-10 in the changelog and 11 Oct on GitHub; the discrepancy was not reconciled.
- No LTS or end-of-support policy was found for either project; lifecycle is not verified.
- Python 3.12 support for aiohttp rests on PyPI classifiers; the official client quickstart does not state a minimum Python version.
- The httpx registry and GitHub pages show no release after 2024-12-06. Whether the project is maintained is for ecosystem-researcher to assess.

## Sources
[S1] httpx — PyPI JSON metadata — https://pypi.org/pypi/httpx/json — retrieved 2026-10-12 — via web
[S2] Releases · encode/httpx — https://github.com/encode/httpx/releases — retrieved 2026-10-12 — via web
[S3] HTTPX — Async support (docs/async.md) — https://github.com/encode/httpx/blob/master/docs/async.md — retrieved 2026-10-12 — via mcp:context7
[S4] HTTPX — Timeouts (docs/advanced/timeouts.md) — https://github.com/encode/httpx/blob/master/docs/advanced/timeouts.md — retrieved 2026-10-12 — via mcp:context7
[S5] HTTPX — Resource limits (docs/advanced/resource-limits.md) — https://github.com/encode/httpx/blob/master/docs/advanced/resource-limits.md — retrieved 2026-10-12 — via mcp:context7
[S6] HTTPX — Transports (docs/advanced/transports.md) — https://github.com/encode/httpx/blob/master/docs/advanced/transports.md — retrieved 2026-10-12 — via mcp:context7
[S7] aiohttp — PyPI JSON metadata — https://pypi.org/pypi/aiohttp/json — retrieved 2026-10-12 — via web
[S8] aiohttp — Changes (3.14.5 section) — https://docs.aiohttp.org/en/stable/changes.html — retrieved 2026-10-12 — via web
[S9] Releases · aio-libs/aiohttp — https://github.com/aio-libs/aiohttp/releases — retrieved 2026-10-12 — via web
[S10] aiohttp — Client reference (docs/client_reference.rst) — https://github.com/aio-libs/aiohttp/blob/master/docs/client_reference.rst — retrieved 2026-10-12 — via mcp:context7
[S11] aiohttp — Client quickstart, timeouts (docs/client_quickstart.rst) — https://github.com/aio-libs/aiohttp/blob/master/docs/client_quickstart.rst — retrieved 2026-10-12 — via mcp:context7
[S12] aiohttp — Changes (docs/changes.rst), retry of closed connections (#7297) — https://github.com/aio-libs/aiohttp/blob/master/docs/changes.rst — retrieved 2026-10-12 — via mcp:context7
[S13] aiohttp — Client middleware cookbook (docs/client_middleware_cookbook.rst) — https://github.com/aio-libs/aiohttp/blob/master/docs/client_middleware_cookbook.rst — retrieved 2026-10-12 — via mcp:context7
