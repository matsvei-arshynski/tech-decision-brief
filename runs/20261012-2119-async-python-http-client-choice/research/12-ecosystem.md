---
artifact: ecosystem
agent: ecosystem-researcher
run_id: 20261012-2119-async-python-http-client-choice
attempt: 1
---
# Ecosystem and maturity

## Summary
Both candidates are open-source, under licenses that satisfy the H3 license constraint (httpx: BSD-3-Clause; aiohttp: Apache-2.0, with an additional MIT component in its PyPI license expression). Both declare Python 3.12 support in their package metadata. The maturity picture differs: aiohttp shipped 3.14.5 on 2026-10-11 and had 11 version releases in the last 12 months, while httpx's latest stable release is 0.28.1 from 2024-12-06 with no stable release since, even though its repository received pushes in October 2026. Both have large adoption (hundreds of millions of PyPI downloads per month) and are backed by GitHub organisations (encode, aio-libs). No paid or commercial edition was found for either, but this was not verified on official pages.

## Findings

### httpx
- Latest stable release is 0.28.1, published 2024-12-06 on GitHub and uploaded to PyPI the same day [S1][S2].
- Stable releases in the 12 months before 2026-10-12: none. The GitHub releases list, newest first, has 0.28.1 (2024-12-06) followed by 0.28.0 (2024-11-28) [S3].
- The repository is not archived and was last pushed on 2026-10-02, with 15,632 stars, 3,808 forks and 140 open issues [S4].
- The PyPI release history page lists 1.0.dev-series pre-releases dated in 2025 and 2026; these are not stable and carry no GitHub release [S5]. See Open issues.
- Backing: GitHub organisation `encode` (type Organization) [S4]. All-time contribution counts for the top contributors are lovelydinosaur 712, florimondmanca 151, sethmlarson 29, karpetrosyan 22 [S6]. These are not measures of currently active maintainers.
- Adoption: PyPI downloads over the last day, week and month were 16,613,027, 160,875,391 and 618,500,392 respectively [S7].
- License: BSD-3-Clause. PyPI reports `license` as BSD-3-Clause with a "BSD License" classifier [S1]. The LICENSE.md file is the 3-clause BSD text, copyright "Encode OSS Ltd" 2019 [S8]. GitHub reports spdx_id BSD-3-Clause [S4].
- Python: `requires_python` is >=3.8 and the package classifiers include Python 3.12 [S1].

### aiohttp
- Latest stable release is 3.14.5. The GitHub release is published 2026-10-11 (00:56 UTC) [S9]. The project changelog dates the same version 2026-10-10 [S10]. The package is on PyPI as 3.14.5 [S11].
- Releases in the 12 months before 2026-10-12: 11 version headings dated from 2025-10-17 (3.13.1) to 2026-10-10 (3.14.5), including patch releases [S10].
- The repository is not archived and was last pushed on 2026-10-12, with 16,574 stars, 2,452 forks and 227 open issues [S12].
- Backing: GitHub organisation `aio-libs` (type Organization) [S12]. All-time top contributors are asvetlov 4454, dependabot[bot] 2661, patchback[bot] 1253, bdraco 988 and Dreamsorcerer 803 [S13]. Two of these are bots; the three human maintainers listed are asvetlov, bdraco and Dreamsorcerer.
- Adoption: PyPI downloads over the last day, week and month were 12,523,361, 117,659,296 and 454,165,260 respectively [S14].
- License: Apache-2.0. GitHub reports spdx_id Apache-2.0 [S12]. The LICENSE.txt file is the Apache License 2.0, copyright "aio-libs contributors" [S15]. PyPI reports `license` as null and `license_expression` as "Apache-2.0 AND MIT" [S11]. The source of the MIT component was not identified in this run. Both licenses are inside the H3 allowed set.
- Python: `requires_python` is >=3.10 and the classifiers include Python 3.12, 3.13 and 3.14 [S11]. The changelog notes that Python 3.9 support was dropped in 3.14.0 [S10].

## Constraint check
| Constraint | Candidate | Status | Evidence |
|---|---|---|---|
| H1 | httpx | n/a | outside this research (capability, owned by docs-researcher) |
| H1 | aiohttp | n/a | outside this research (capability, owned by docs-researcher) |
| H2 | httpx | met | [S1] |
| H2 | aiohttp | met | [S11] |
| H3 | httpx | met | [S1], [S8] |
| H3 | aiohttp | met | [S11], [S15] |

## Open issues
- Paid or commercial editions: not checked on official pages for either candidate. Neither was found to have one in the sources read, but this is unverified.
- httpx PyPI history: the summarised page lists 1.0.dev3 as dated 2025-09-15, after 1.0.dev4 to 1.0.dev6 dated August 2026. The dates on that page are inconsistent and were not checked against the PyPI JSON file for each version. Stable status is unaffected: 0.28.1 is the latest stable version on both PyPI and GitHub. Needs a direct check before the brief states any pre-release status.
- httpx maintenance: no stable release for about 22 months, while the repository was pushed on 2026-10-02. Whether this counts as healthy maintenance is a judgement for the brief; the sources show activity but no release.
- aiohttp release date: GitHub gives 2026-10-11 (UTC) and the changelog gives 2026-10-10 for 3.14.5. This run uses the GitHub date.
- aiohttp MIT component: the MIT part of "Apache-2.0 AND MIT" was not traced to a file or dependency. Both licenses pass H3, so this does not change the constraint result.
- Notable users: official pages listing notable users were not checked for either candidate.
- Active maintainers: contributor counts are all-time totals. No source gave the current active maintainer count.
- Download figures come from pypistats responses whose retrieval date was not shown. They are used as adoption signals only.

## Sources
[S1] httpx — PyPI JSON metadata — https://pypi.org/pypi/httpx/json — retrieved 2026-10-12 — via web
[S2] httpx 0.28.1 — GitHub latest release API — https://api.github.com/repos/encode/httpx/releases/latest — retrieved 2026-10-12 — via web
[S3] httpx — GitHub releases list — https://api.github.com/repos/encode/httpx/releases?per_page=100 — retrieved 2026-10-12 — via web
[S4] encode/httpx — GitHub repository API — https://api.github.com/repos/encode/httpx — retrieved 2026-10-12 — via web
[S5] httpx — PyPI release history — https://pypi.org/project/httpx/#history — retrieved 2026-10-12 — via web
[S6] encode/httpx — GitHub contributors API — https://api.github.com/repos/encode/httpx/contributors?per_page=5 — retrieved 2026-10-12 — via web
[S7] httpx — pypistats recent downloads — https://pypistats.org/api/packages/httpx/recent — retrieved 2026-10-12 — via web
[S8] httpx LICENSE.md — https://raw.githubusercontent.com/encode/httpx/master/LICENSE.md — retrieved 2026-10-12 — via web
[S9] aiohttp 3.14.5 — GitHub latest release API — https://api.github.com/repos/aio-libs/aiohttp/releases/latest — retrieved 2026-10-12 — via web
[S10] aiohttp — project changelog — https://docs.aiohttp.org/en/stable/changes.html — retrieved 2026-10-12 — via web
[S11] aiohttp — PyPI JSON metadata — https://pypi.org/pypi/aiohttp/json — retrieved 2026-10-12 — via web
[S12] aio-libs/aiohttp — GitHub repository API — https://api.github.com/repos/aio-libs/aiohttp — retrieved 2026-10-12 — via web
[S13] aio-libs/aiohttp — GitHub contributors API — https://api.github.com/repos/aio-libs/aiohttp/contributors?per_page=5 — retrieved 2026-10-12 — via web
[S14] aiohttp — pypistats recent downloads — https://pypistats.org/api/packages/aiohttp/recent — retrieved 2026-10-12 — via web
[S15] aiohttp LICENSE.txt — https://raw.githubusercontent.com/aio-libs/aiohttp/master/LICENSE.txt — retrieved 2026-10-12 — via web
