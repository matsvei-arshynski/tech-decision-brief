---
artifact: requirements
agent: requirements-formalizer
run_id: 20261012-2119-async-python-http-client-choice
attempt: 1
---
# Requirements

## Question
Which HTTP client library should the new async Python 3.12 service use: httpx or aiohttp?

## Question type
library

## Candidates
1. **httpx** — Python HTTP client library with sync and async APIs.
2. **aiohttp** — asyncio-based HTTP client and server library.

## Context
- Stack: Python 3.12, asyncio (new async service); no other stack stated.
- Team: None stated.
- Scale: None stated.
- Other: None stated. Assumed: the library is used as an HTTP client only; the server role of aiohttp is out of scope.
- Assumed: the license constraint applies to the library's own license; transitive dependency licenses are reported as information, not as a pass/fail check.
- Assumed: no existing codebase or team skills to match, so no preference is inferred.

## Hard constraints
| ID | Constraint | Dimension |
|---|---|---|
| H1 | Provides an asyncio-native client API: requests are issued with `async`/`await` inside an asyncio event loop. | capability |
| H2 | Supports CPython 3.12 (stated in the release metadata or the official docs). | compatibility |
| H3 | The library's license is only MIT, BSD (2-clause or 3-clause) or Apache-2.0. | license |

## Preferences
| ID | Preference |
|---|---|
| — | None stated. |

## Decision criteria
| Criterion | Weight (1–5) | Dimension | Why it matters |
|---|---|---|---|
| Async client API with timeout, connection pooling and retry control | 5 | capability | The service is async, so the async API and its control knobs decide day-to-day use. |
| License declared in package metadata and the upstream license file | 4 | license | The user stressed license restrictions; the evidence must be explicit, not inferred. |
| Latest stable release and maintenance activity | 3 | maturity | A maintained library lowers adoption risk for a new service. |
| Runtime dependency footprint | 2 | operations | Fewer required dependencies means fewer packages to install, audit and update. |

## Open questions
None.
