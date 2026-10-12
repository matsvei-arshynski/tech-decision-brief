---
artifact: brief
agent: brief-synthesizer
run_id: 20261012-2119-async-python-http-client-choice
attempt: 1
---
# Tech Decision Brief: httpx or aiohttp for the async Python 3.12 service

## 1. Decision
**Recommendation:** httpx · **Confidence:** medium

httpx meets all three hard constraints and has the higher weighted total, 54 against 50 for aiohttp. It leads on license evidence and dependency footprint, while aiohttp leads on release recency and maintenance activity. The 4-point gap is under 10%, so confidence is medium.

## 2. Context and confirmed requirements
- **Question:** Which HTTP client library should the new async Python 3.12 service use: httpx or aiohttp?
- **Question type:** library
- **Candidates:** httpx; aiohttp.
- **Context:** Stack is Python 3.12 and asyncio for a new async service; no other stack stated. Team, scale and other context: none stated.
- **Assumptions:** the library is used as an HTTP client only (aiohttp's server role is out of scope); the license constraint applies to the library's own license, and transitive dependency licenses are reported as information, not pass/fail; no existing codebase or team skills, so no preference is inferred.
- **H1:** Provides an asyncio-native client API: requests are issued with `async`/`await` inside an asyncio event loop.
- **H2:** Supports CPython 3.12 (stated in the release metadata or the official docs).
- **H3:** The library's license is only MIT, BSD (2-clause or 3-clause) or Apache-2.0.
- **Preferences:** None stated.

## 3. Options considered
### httpx
httpx 0.28.1 is the latest stable release, uploaded 2024-12-06 and declared for CPython 3.12 [S1]. `httpx.AsyncClient` is used with `async`/`await` [S2], with four timeout types (connect, read, write, pool) [S3] and pool limits of `max_connections` 100 and `max_keepalive_connections` 20 by default [S4]. Its transport retry covers only connect errors and connect timeouts [S5], and read, write or 503 retries need a general tool such as tenacity [S2]. No stable release has followed 2024-12-06 [S6], although the repository was last pushed on 2026-10-02 [S7]. The license is BSD-3-Clause in the metadata [S1] and in the LICENSE.md file [S8].

### aiohttp
aiohttp 3.14.5 is the latest stable release, published on GitHub on 2026-10-11 [S9]. Its PyPI metadata declares `requires_python >=3.10` and a Python 3.12 classifier [S10]. `aiohttp.ClientSession` is used with `async with` inside asyncio [S11], and `aiohttp.ClientTimeout` has total, connect, sock_connect and sock_read fields [S12]. The session has no retry parameter; it automatically retries closed connections for idempotent methods (#7297) [S13], and a user-written retry middleware is shown in the cookbook [S14]. The PyPI license field is empty and the license expression is Apache-2.0 AND MIT [S10]; LICENSE.txt is Apache 2.0 [S15]. The project shipped 11 version releases in the 12 months before 2026-10-12 [S16] and was last pushed on 2026-10-12 [S17].

## 4. Evaluation matrix

### Hard constraints
| Constraint | httpx | aiohttp |
|---|---|---|
| H1 Asyncio-native client API (`async`/`await` in an event loop) | met [S2] | met [S11] |
| H2 Supports CPython 3.12 | met [S1] | met [S10] |
| H3 License only MIT, BSD (2/3-clause) or Apache-2.0 | met [S1][S8] | met [S10][S15] |

### Weighted criteria
Scores 1–5 (5 = best); total = Σ weight × score.

| Criterion | Weight | httpx | aiohttp |
|---|---|---|---|
| Async client API with timeout, connection pooling and retry control | 5 | 4 [S2][S3][S4][S5] | 3 [S11][S12][S13][S14] |
| License declared in package metadata and the upstream license file | 4 | 5 [S1][S8] | 4 [S10][S15] |
| Latest stable release and maintenance activity | 3 | 2 [S1][S6][S7] | 5 [S9][S16][S17] |
| Runtime dependency footprint | 2 | 4 [S1] | 2 [S10] |
| **Total** | | **54** | **50** |

## 5. Recommendation and rationale
httpx is recommended because it has the higher weighted total (54 against 50) and no hard constraint is unmet. All three hard constraints are met for both candidates, so the weighted criteria decided the choice. On the weight-5 criterion, httpx scores 4 because it offers a built-in transport retry knob and granular timeouts [S3][S5], while aiohttp scores 3 because its session has no retry parameter and needs middleware [S13][S14]. On the weight-4 license criterion, httpx scores 5 because its BSD-3-Clause license is declared in the metadata and in the LICENSE file [S1][S8]; aiohttp scores 4 because its metadata license field is empty and the MIT part of its expression was not traced [S10]. On the weight-3 maturity criterion, aiohttp scores 5 against 2 for httpx, because httpx has no stable release since 2024-12-06 [S6] while aiohttp released 3.14.5 on 2026-10-11 [S9]. On the weight-2 dependency criterion, httpx scores 4 with four unconditional direct requirements [S1], and aiohttp scores 2 with seven unconditional and two conditional ones [S10]. The margin is 4 points (8% of the aiohttp total), so confidence is medium. Choose aiohttp instead if the maturity criterion carries more weight than the capability and license evidence, or if the team requires a library with a recent stable release.

## 6. Risks and mitigations
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| httpx has had no stable release since 2024-12-06 [S6] | medium | medium | Pin httpx 0.28.1 and track upstream activity; confirm pre-release status before any upgrade. |
| httpx transport retry covers connect errors only [S5] | high | medium | Add a retry wrapper for read, write and 503 cases, such as tenacity [S2]. |
| aiohttp session has no retry parameter; automatic retry covers closed idempotent connections only [S13] | medium | low | Add a retry middleware as shown in the cookbook [S14]. |
| aiohttp PyPI license field is empty and the MIT part of Apache-2.0 AND MIT is not traced [S10] | low | low | Check the license files in the installed package before distribution. |
| aiohttp has 7 unconditional direct dependencies plus 2 conditional ones [S10] | high | low | Audit the dependency set and pin versions in the lock file. |
| The margin is small (4 points, 8%), so a change in scores or weights could reverse the result | medium | medium | Review the maturity and API scores with the team before adoption. |

## 7. Adoption plan
1. Pin httpx 0.28.1 in the lock file and keep the license evidence (package metadata and LICENSE.md) with the dependency record.
2. Create one long-lived `httpx.AsyncClient` for the service, with explicit `httpx.Timeout` and `httpx.Limits` values.
3. Set transport `retries` for connect errors, and add a retry wrapper for read, write and 503 cases.
4. Before the first upgrade decision, check the PyPI release history and the upstream release activity.
5. Record transitive dependency licenses as information only, as the requirements state.

## 8. Open questions
- The aiohttp 3.14.5 release date differs: GitHub gives 2026-10-11 [S9] and the changelog gives 2026-10-10 [S16]. This brief uses the GitHub date.
- The aiohttp version that introduced automatic retry of closed connections (#7297) is unconfirmed [S13].
- The MIT component of aiohttp's license expression was not traced to a file or dependency [S10].
- httpx's PyPI release history lists pre-release dates that are inconsistent with each other; 0.28.1 remains the latest stable version, but pre-release status needs a direct check.
- Whether httpx's lack of a stable release since 2024-12-06 [S6], despite recent repository pushes [S7], counts as healthy maintenance is a judgement the sources do not settle.
- The transitive dependency closure was not fetched for either library; dependency counts are direct requirements only [S1][S10].
- No LTS or end-of-support policy was found for either project.
- Paid or commercial editions were not checked on official pages for either candidate.
- Current active maintainer counts are not available; contributor totals are all-time figures.

## 9. Sources
[S1] httpx — PyPI JSON metadata — https://pypi.org/pypi/httpx/json — retrieved 2026-10-12 — via web
[S2] HTTPX — Async support (docs/async.md) — https://github.com/encode/httpx/blob/master/docs/async.md — retrieved 2026-10-12 — via mcp:context7
[S3] HTTPX — Timeouts (docs/advanced/timeouts.md) — https://github.com/encode/httpx/blob/master/docs/advanced/timeouts.md — retrieved 2026-10-12 — via mcp:context7
[S4] HTTPX — Resource limits (docs/advanced/resource-limits.md) — https://github.com/encode/httpx/blob/master/docs/advanced/resource-limits.md — retrieved 2026-10-12 — via mcp:context7
[S5] HTTPX — Transports (docs/advanced/transports.md) — https://github.com/encode/httpx/blob/master/docs/advanced/transports.md — retrieved 2026-10-12 — via mcp:context7
[S6] httpx — GitHub releases list — https://api.github.com/repos/encode/httpx/releases?per_page=100 — retrieved 2026-10-12 — via web
[S7] encode/httpx — GitHub repository API — https://api.github.com/repos/encode/httpx — retrieved 2026-10-12 — via web
[S8] httpx LICENSE.md — https://raw.githubusercontent.com/encode/httpx/master/LICENSE.md — retrieved 2026-10-12 — via web
[S9] aiohttp 3.14.5 — GitHub latest release API — https://api.github.com/repos/aio-libs/aiohttp/releases/latest — retrieved 2026-10-12 — via web
[S10] aiohttp — PyPI JSON metadata — https://pypi.org/pypi/aiohttp/json — retrieved 2026-10-12 — via web
[S11] aiohttp — Client reference (docs/client_reference.rst) — https://github.com/aio-libs/aiohttp/blob/master/docs/client_reference.rst — retrieved 2026-10-12 — via mcp:context7
[S12] aiohttp — Client quickstart, timeouts (docs/client_quickstart.rst) — https://github.com/aio-libs/aiohttp/blob/master/docs/client_quickstart.rst — retrieved 2026-10-12 — via mcp:context7
[S13] aiohttp — Changes (docs/changes.rst), retry of closed connections (#7297) — https://github.com/aio-libs/aiohttp/blob/master/docs/changes.rst — retrieved 2026-10-12 — via mcp:context7
[S14] aiohttp — Client middleware cookbook (docs/client_middleware_cookbook.rst) — https://github.com/aio-libs/aiohttp/blob/master/docs/client_middleware_cookbook.rst — retrieved 2026-10-12 — via mcp:context7
[S15] aiohttp LICENSE.txt — https://raw.githubusercontent.com/aio-libs/aiohttp/master/LICENSE.txt — retrieved 2026-10-12 — via web
[S16] aiohttp — project changelog — https://docs.aiohttp.org/en/stable/changes.html — retrieved 2026-10-12 — via web
[S17] aio-libs/aiohttp — GitHub repository API — https://api.github.com/repos/aio-libs/aiohttp — retrieved 2026-10-12 — via web
