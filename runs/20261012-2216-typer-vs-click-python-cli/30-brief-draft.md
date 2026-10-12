---
artifact: brief
agent: brief-synthesizer
run_id: 20261012-2216-typer-vs-click-python-cli
attempt: 2
---
# Tech Decision Brief: Typer vs Click for a Python 3.12 CLI

## 1. Decision
**Recommendation:** Typer · **Confidence:** medium

Both candidates meet H1 and H2, and Typer has the highest weighted total (56 against 54 for Click). Typer's edge is explicit Python 3.12 classifier evidence [S1] and more releases in the last 12 months [S2]; Click's edge is zero declared runtime dependencies [S3]. The 2-point lead is 3.7%, below the 10% needed for high confidence.

## 2. Context and confirmed requirements
- Question: Which argument-parsing library, Typer or Click, should a new Python 3.12 command-line tool use?
- Question type: library. Stack: Python 3.12 CLI tool (new project). Team, scale and other context: none stated.
- Assumed: the tool is a standard pip-installable CLI, so the license and Python version constraints apply to the library and its dependencies; only Typer and Click are compared.
- H1: The library's license is MIT or BSD (BSD-2-Clause or BSD-3-Clause), checkable from the package license metadata.
- H2: The library declares support for Python 3.12 in its package metadata (classifiers or a requires-python range that includes 3.12).
- Preferences (P1…): none stated.
- Decision criteria (weight 1–5): Python 3.12 compatibility evidence (4); Command and option capability (3); Dependency footprint (3); Maintenance recency (3).

## 3. Options considered
### Typer
Typer is an MIT-licensed library [S1][S4] that defines commands and options from Python type hints [S5]. Its metadata declares `requires-python >=3.10` and a Python 3.12 classifier [S1], and Python 3.12 support dates from 0.12.4 [S6]. Since 0.26.0 Typer vendors Click instead of depending on it [S7], so Click is not a separate install; the requirements describe Click as Typer's engine, which the research does not confirm for the vendored code. The latest stable release is 0.27.3, released 2026-10-06 [S1][S2].

### Click
Click is a BSD-3-Clause toolkit [S3][S8] that defines commands with decorators such as `@click.group()` and `@cli.command()` [S9]. Its metadata declares `requires-python >=3.10` but no Python-version classifiers, so its Python 3.12 support rests on the range alone [S3][S10]. It declares no runtime dependencies [S3]. The latest stable release is 8.5.0, dated 2026-08-24 in the changelog [S11], 2026-08-26 on PyPI [S12] and 2026-08-27 on GitHub [S13]. Shell completion covers Bash, Zsh, Fish and PowerShell, with custom completions through `shell_complete` [S14].

## 4. Evaluation matrix

### Hard constraints
| Constraint | Typer | Click |
|---|---|---|
| H1 License is MIT or BSD (BSD-2-Clause or BSD-3-Clause) | met [S1][S4] | met [S3][S8] |
| H2 Declares Python 3.12 support in package metadata | met [S1] | met [S3] (range only, no 3.12 classifier) |

### Weighted criteria
Scores 1–5 (5 = best); total = Σ weight × score.

| Criterion | Weight | Typer | Click |
|---|---|---|---|
| Python 3.12 compatibility evidence (declared support, tested versions) | 4 | 5: 3.12 classifier listed; 3.12 support since 0.12.4 [S1][S6] | 3: version range only, no 3.12 classifier [S3][S10] |
| Command and option capability (subcommands, typed options, help output, shell completion) | 3 | 4: type-hint options, subcommand groups, built-in completion; shell list not exhaustive [S5][S15] | 5: groups, typed options, `chain=True`, four named shells, custom completion [S9][S14] |
| Dependency footprint (number of runtime dependencies) | 3 | 3: three declared runtime dependencies, plus colorama on Windows only [S1] | 5: no runtime dependencies declared [S3] |
| Maintenance recency (latest stable release date and cadence) | 3 | 5: 0.27.3 on 2026-10-06; at least 27 releases in 12 months [S2][S16] | 4: 8.5.0 in August 2026; 7 releases in 12 months [S13] |
| **Total** | | **56** | **54** |

## 5. Recommendation and rationale
Typer is recommended, with medium confidence. Both candidates pass H1 and H2, so the weighted total decides, and Typer leads 56 to 54 (3.7%). Typer's lead comes from the Python 3.12 evidence criterion, where it has an explicit classifier and Click has only a version range, and from maintenance recency. Click wins on dependency footprint and on capability, so the margin is small and depends on how much the team values each criterion. Choose Click if dependency footprint matters more than the 3.12 classifier evidence, or if the tool needs Click-specific plug-ins, which Typer no longer supports [S7].

## 6. Risks and mitigations
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Typer is still in the 0.x series, so its API may change between releases [S16] | medium | medium | Pin the Typer version and review release notes before upgrading. |
| Typer's vendored Click version is unknown, so Click-level behaviour may differ from standalone Click [S7] | medium | medium | Test the tool's commands, help output and completion on Python 3.12 with the chosen Typer version. |
| Typer's transitive dependency tree (for example, rich) was not verified [S1] | medium | low | Install into a clean Python 3.12 environment and record the resulting tree before committing. |
| Click's Python 3.12 support has no classifier and its CI test matrix was not verified [S3] | low | medium | Run the project's test suite on Python 3.12 before release. |
| Click 8.5.0's release date differs across sources [S11][S12][S13] | low | low | Confirm the release date on the PyPI release page before citing it. |
| Typer's `--install-completion` shell list is not exhaustive [S15] | low | low | Check that every shell the users need is supported; Click documents Bash, Zsh, Fish and PowerShell [S14]. |

## 7. Adoption plan
1. [ ] Pin Typer 0.27.3, the latest stable release [S1][S2].
2. [ ] In a clean Python 3.12 environment, install the pin and record the dependency tree.
3. [ ] Confirm the Click version Typer 0.27.3 vendors.
4. [ ] Check help output and shell completion for each shell the tool needs.
5. [ ] Build one command group with typed options and run the test suite on Python 3.12.

## 8. Open questions
- Which Click version does Typer 0.27.3 vendor? The research confirms vendoring since 0.26.0 [S7] but not the bundled version.
- Does Click's CI test Python 3.12? Its metadata shows only the `>=3.10` range; the test matrix was not checked [S3].
- The requirements describe Click as Typer's engine, but Typer's current metadata lists no Click dependency [S16].
- Click 8.5.0's release date differs by source (2026-08-24, 2026-08-26, 2026-08-27) [S11][S12][S13]. The scores do not depend on the exact day.
- Transitive dependency counts (for example, for rich) were not verified [S1].
- The lead is 3.7%, and the scores are 1–5 judgments on cited facts, not measurements. A different weighting could change the recommendation.
- Does the tool need Click-only plug-ins? The requirements do not say.

## 9. Sources
[S1] typer 0.27.3 — PyPI JSON metadata — https://pypi.org/pypi/typer/0.27.3/json — retrieved 2026-10-12 — via web
[S2] fastapi/typer releases — GitHub API — https://api.github.com/repos/fastapi/typer/releases — retrieved 2026-10-12 — via web
[S3] click 8.5.0 — PyPI JSON metadata — https://pypi.org/pypi/click/8.5.0/json — retrieved 2026-10-12 — via web
[S4] Typer LICENSE — https://github.com/fastapi/typer/blob/master/LICENSE — retrieved 2026-10-12 — via web
[S5] Typer docs: parameter types and help — https://typer.tiangolo.com/tutorial/parameter-types — retrieved 2026-10-12 — via mcp:context7
[S6] Typer release notes (repository) — https://raw.githubusercontent.com/fastapi/typer/master/docs/release-notes.md — retrieved 2026-10-12 — via web
[S7] Typer release notes — https://typer.tiangolo.com/release-notes/ — retrieved 2026-10-12 — via web
[S8] Click LICENSE.txt — https://github.com/pallets/click/blob/main/LICENSE.txt — retrieved 2026-10-12 — via web
[S9] Click docs: groups and commands — https://click.palletsprojects.com/en/stable/documentation — retrieved 2026-10-12 — via mcp:context7
[S10] pallets/click pyproject.toml — https://raw.githubusercontent.com/pallets/click/main/pyproject.toml — retrieved 2026-10-12 — via web
[S11] Click changelog — https://click.palletsprojects.com/en/stable/changes/ — retrieved 2026-10-12 — via web
[S12] Click — PyPI JSON metadata — https://pypi.org/pypi/click/json — retrieved 2026-10-12 — via web
[S13] pallets/click releases — GitHub API — https://api.github.com/repos/pallets/click/releases — retrieved 2026-10-12 — via web
[S14] Click docs: shell completion — https://click.palletsprojects.com/en/stable/shell-completion — retrieved 2026-10-12 — via mcp:context7
[S15] Typer docs: autocompletion — https://typer.tiangolo.com/tutorial/options-autocompletion/ — retrieved 2026-10-12 — via web
[S16] Typer — PyPI JSON metadata — https://pypi.org/pypi/typer/json — retrieved 2026-10-12 — via web
