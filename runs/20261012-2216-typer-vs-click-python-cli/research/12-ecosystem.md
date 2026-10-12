---
artifact: ecosystem
agent: ecosystem-researcher
run_id: 20261012-2216-typer-vs-click-python-cli
attempt: 1
---
# Ecosystem and maturity

## Summary
Both libraries are MIT or BSD-3-Clause licensed, actively released, and declare Python 3.12 support through their metadata. Click (BSD-3-Clause, Pallets) is the older, more widely downloaded library with 7 releases in the last 12 months, the latest on 2026-08-27. Typer (MIT, maintained under the FastAPI organisation) released far more often, with 27 or more releases in the last 12 months and the latest on 2026-10-06, and its current metadata no longer lists Click as a runtime dependency, which contradicts the requirements' description of Click as Typer's engine. Neither candidate has a paid or commercial edition.

## Findings

### Typer
- Latest stable release is 0.27.3, published 2026-10-06 (GitHub release timestamp 2026-10-06T17:23:58Z); the release is not a prerelease [S3][S1]
- At least 27 releases in the 12 months to 2026-10-12: 26 visible GitHub releases from 0.20.1 (2025-12-19) to 0.27.3, plus 0.20.0 uploaded to PyPI on 2025-10-20 [S3][S1]
- Release cadence in 2026 is high: 0.26.0 to 0.26.8 were published between 2026-05-26 and 2026-06-26, and 0.27.0 to 0.27.3 between 2026-07-15 and 2026-10-06 [S3]
- Latest version series is still 0.x (no 1.0 release is listed) [S1][S3]
- Repository pushed_at is 2026-10-06T20:58:59Z; the repository has 20,085 stars and 989 forks [S6]
- Maintainer and author on PyPI: Sebastián Ramírez (tiangolo), with the source repository at github.com/fastapi/typer; no maintainer count is shown on the registry page [S1][S6]
- Project repository is under the `fastapi` GitHub organisation [S6][S1]
- Typer PyPI downloads: 243,773,924 in the last month and 64,389,260 in the last week [S7]
- License is MIT, declared as the PyPI license expression and in the pyproject `license` field, and as spdx_id MIT on GitHub [S1][S11][S6]
- Declared `requires-python` is `>=3.10`, and the classifiers include `Programming Language :: Python :: 3.12` [S1][S11]
- Current runtime dependencies in the registry metadata are shellingham, rich, annotated-doc, and colorama on Windows only; Click is not listed [S1]
- fastapi-cli (version 0.0.32 on PyPI) declares `typer>=0.16.0` as its dependency, which is an example of a downstream user [S12]
- No paid or commercial edition was found in the registry metadata or repository pages retrieved [S1][S6]

### Click
- Latest stable release is 8.5.0, published 2026-08-27T04:00:53Z on GitHub; PyPI shows the upload as 2026-08-26 (see Open issues); the release is not a prerelease [S4][S2]
- 7 releases in the 12 months to 2026-10-12: 8.3.1 (2025-11-15), 8.3.2 (2026-04-03), 8.3.3 (2026-04-22), 8.4.0 (2026-05-17), 8.4.1 (2026-05-22), 8.4.2 (2026-06-24 on PyPI / 2026-06-26 on GitHub), 8.5.0 (2026-08-27 on GitHub) [S4][S2]
- The previous release before this window was 8.3.0 on 2025-09-18, outside the 12-month window [S4]
- Repository pushed_at is 2026-10-06T20:58:59Z; the repository has 17,789 stars and 4,435 forks [S5]
- Click is maintained by Pallets, which describes itself as an open source community organisation for popular Python frameworks; Click is listed among its core libraries [S10]
- No individual maintainer count is shown on the Pallets or repository pages retrieved [S10][S5]
- Click PyPI downloads: 817,486,347 in the last month and 220,337,212 in the last week [S8]
- License is BSD-3-Clause, declared as the PyPI license expression, in the pyproject `license` field, and as spdx_id BSD-3-Clause on GitHub [S2][S9][S5]
- Declared `requires-python` is `>=3.10`; the pyproject classifiers do not list individual Python versions, so 3.12 support is shown by the range, not a classifier [S2][S9]
- The pyproject declares no runtime `dependencies`; the only extras are dev, docs, test and typing groups [S9][S2]
- No paid or commercial edition was found in the registry metadata or repository pages retrieved [S2][S5]

## Constraint check
| Constraint | Candidate | Status | Evidence |
|---|---|---|---|
| H1 | Typer | met | MIT license: [S1][S11][S6] |
| H1 | Click | met | BSD-3-Clause license: [S2][S9][S5] |
| H2 | Typer | met | `requires-python >=3.10` and classifier `Programming Language :: Python :: 3.12`: [S1][S11] |
| H2 | Click | met | `requires-python >=3.10`, which includes 3.12; no 3.12 classifier is listed: [S2][S9] |

## Open issues
- Click's latest release date differs by one day between sources: PyPI gives 2026-08-26 and GitHub gives 2026-08-27T04:00:53Z (UTC). Both dates are cited; the GitHub date is used in Findings.
- The requirements say Typer is built "with Click as its underlying engine". Typer's current registry metadata lists no Click dependency [S1]. Whether Typer vendors or otherwise embeds Click code was not verified in this research; this needs the coordinator or docs-researcher to confirm before the brief describes the relationship.
- Typer's release count for the 12-month window is a minimum of 27: GitHub listing was truncated after 0.20.1, and releases between 2025-10-12 and 2025-12-19 other than 0.20.0 were not listed. The count may be higher.
- Active maintainer counts for both projects were not visible on the pages retrieved. The maintainer rows in the criteria cannot be scored more precisely than "one named lead (Typer) / organisation (Click)".
- Commercial or paid editions were checked only in registry metadata and repository pages, not on vendor pricing pages. No paid edition was found.
- Typer's PyPI release list was truncated in the retrieved page after 0.23.1; the 12-month count relies on the GitHub release list for 0.20.1 to 0.27.3.
- Dependency footprint and Python 3.12 test-matrix evidence belong to docs-researcher; the bullets above are context only.

## Sources
[S1] Typer — PyPI JSON metadata — https://pypi.org/pypi/typer/json — retrieved 2026-10-12 — via web
[S2] Click — PyPI JSON metadata — https://pypi.org/pypi/click/json — retrieved 2026-10-12 — via web
[S3] fastapi/typer releases — GitHub API — https://api.github.com/repos/fastapi/typer/releases — retrieved 2026-10-12 — via web
[S4] pallets/click releases — GitHub API — https://api.github.com/repos/pallets/click/releases — retrieved 2026-10-12 — via web
[S5] pallets/click repository — GitHub API — https://api.github.com/repos/pallets/click — retrieved 2026-10-12 — via web
[S6] fastapi/typer repository — GitHub API — https://api.github.com/repos/fastapi/typer — retrieved 2026-10-12 — via web
[S7] typer downloads — pypistats — https://pypistats.org/api/packages/typer/recent — retrieved 2026-10-12 — via web
[S8] click downloads — pypistats — https://pypistats.org/api/packages/click/recent — retrieved 2026-10-12 — via web
[S9] pallets/click pyproject.toml — https://raw.githubusercontent.com/pallets/click/main/pyproject.toml — retrieved 2026-10-12 — via web
[S10] Pallets — https://palletsprojects.com/ — retrieved 2026-10-12 — via web
[S11] fastapi/typer pyproject.toml — https://raw.githubusercontent.com/fastapi/typer/master/pyproject.toml — retrieved 2026-10-12 — via web
[S12] fastapi-cli — PyPI JSON metadata — https://pypi.org/pypi/fastapi-cli/json — retrieved 2026-10-12 — via web
