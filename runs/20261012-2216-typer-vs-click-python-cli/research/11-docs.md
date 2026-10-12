---
artifact: docs
agent: docs-researcher
run_id: 20261012-2216-typer-vs-click-python-cli
attempt: 1
---
# Official documentation

## Summary
Both candidates are MIT or BSD-3-Clause licensed and declare Python 3.12 support through a `requires-python >=3.10` range, so both pass H1 and H2. Typer 0.27.3 (2026-10-06) is the newer release and declares four runtime dependencies, but since 0.26.0 it vendors Click instead of depending on it, which removes Click as a separate install. Click 8.5.0 (2026-08-24) declares no runtime dependencies, and its decorator-based API gives explicit control over option types and shell completion. The main evidence gap is that Click's PyPI metadata lists no explicit Python 3.12 classifier, so its 3.12 support rests on the version range alone.

## Findings

### Typer
- Latest stable release is 0.27.3, released 2026-10-06 [S1][S6].
- Earlier releases: 0.27.2 on 2026-08-28 and 0.27.1 on 2026-08-03 [S6].
- License is MIT: PyPI `license_expression` is MIT, and the LICENSE file is "The MIT License (MIT)" [S1][S3].
- `requires-python` is `>=3.10`. PyPI classifiers list Python 3.10, 3.11, 3.12, 3.13 and 3.14 [S1].
- Declared runtime dependencies are `shellingham>=1.3.0`, `rich>=13.8.0`, `annotated-doc>=0.0.2`, and `colorama` only on Windows [S1].
- Since 0.26.0 (2026-05-26), Typer vendors (includes the source of) Click and no longer depends on Click as a third-party package. Typer also no longer supports Click-specific plug-ins [S5].
- Since 0.22.0 (2026-02-11), `typer-slim` always requires `rich` and `shellingham` [S5].
- Python 3.12 support was added in 0.12.4 (2024-08-17) [S6].
- Commands and options are defined from Python type hints, for example `name: str` and `age: int = 20` produce typed arguments and options [S9].
- Help text is set per option with `Annotated[..., typer.Option(help=...)]`. Subcommand groups are attached with `app.add_typer(..., help=...)` [S9].
- Shell completion is built in (`typer --install-completion`). Option values can be completed with a custom function passed to `autocompletion` [S8][S9]. The Typer page names Bash, Zsh, Fish and PowerShell as completion-capable shells, but does not give an exhaustive list for `--install-completion` [S8].

### Click
- Latest stable release is 8.5.0, released 2026-08-24 according to the changelog [S7]. The PyPI wheel upload is dated 2026-08-26 [S2]. The changelog lists 8.5.1 as unreleased, so 8.5.0 is the latest stable release [S7].
- The previous release was 8.4.2, released 2026-06-24 [S7].
- License is BSD-3-Clause: PyPI `license_expression` is BSD-3-Clause [S2]. The LICENSE.txt file (Copyright 2014 Pallets) contains the three BSD-3-Clause clauses [S4].
- `requires-python` is `>=3.10` [S2]. The PyPI metadata lists no Python-version classifiers, only the generic "Programming Language :: Python" classifier [S2].
- No runtime dependencies are declared in the PyPI metadata [S2]. Colorama was removed as a dependency in 8.5.0 [S7].
- Click 8.2.0 (2025-05-10) dropped support for Python 3.7, 3.8 and 3.9 [S7].
- Commands are defined with `@click.group()` and `@cli.command()`. Arguments and options are declared with decorators, and types are set in the decorator, for example `type=click.IntRange(1, None)` [S11].
- Groups support subcommands, help text, epilogs and `chain=True` for chaining several subcommands in one call [S11].
- Shell completion supports Bash (4.4 and later), Zsh, Fish and PowerShell. Parameters can supply custom completions through the `shell_complete` argument, which was introduced in 8.0.0 [S10][S7].

## Constraint check
| Constraint | Candidate | Status | Evidence |
|---|---|---|---|
| H1 | Typer | met | MIT via PyPI license_expression and LICENSE file [S1][S3] |
| H2 | Typer | met | `requires-python >=3.10` and a Python 3.12 classifier [S1] |
| H1 | Click | met | BSD-3-Clause via PyPI license_expression and LICENSE.txt [S2][S4] |
| H2 | Click | met | `requires-python >=3.10` includes 3.12 [S2]. No explicit 3.12 classifier (see Open issues) |

## Open issues
- Click's PyPI metadata has no explicit Python 3.12 classifier. The 3.12 claim rests on the `>=3.10` range. I did not verify Click's CI test matrix.
- The PyPI JSON `license` field is null for both packages. License was taken from `license_expression` and the LICENSE file instead.
- Click 8.5.0 has two dates: the changelog says 2026-08-24 and the PyPI upload says 2026-08-26. Both are reported above.
- I did not identify which Click version Typer 0.27.3 vendors, so Typer's effective Click version is unknown.
- Transitive dependency counts (for example, dependencies of `rich`) were not verified. Only direct declared dependencies are listed.
- The Typer docs do not give an exhaustive list of shells supported by `--install-completion`. Only the shells named on the completion page are listed.
- Release cadence is partial: Typer has three verified recent releases and Click has two. The maintenance criterion belongs to ecosystem-researcher. The dates here are supporting evidence only.

## Sources
[S1] typer 0.27.3 — PyPI JSON metadata — https://pypi.org/pypi/typer/0.27.3/json — retrieved 2026-10-12 — via web
[S2] click 8.5.0 — PyPI JSON metadata — https://pypi.org/pypi/click/8.5.0/json — retrieved 2026-10-12 — via web
[S3] Typer LICENSE — https://github.com/fastapi/typer/blob/master/LICENSE — retrieved 2026-10-12 — via web
[S4] Click LICENSE.txt — https://github.com/pallets/click/blob/main/LICENSE.txt — retrieved 2026-10-12 — via web
[S5] Typer release notes — https://typer.tiangolo.com/release-notes/ — retrieved 2026-10-12 — via web
[S6] Typer release notes (repository) — https://raw.githubusercontent.com/fastapi/typer/master/docs/release-notes.md — retrieved 2026-10-12 — via web
[S7] Click changelog — https://click.palletsprojects.com/en/stable/changes/ — retrieved 2026-10-12 — via web
[S8] Typer docs: autocompletion — https://typer.tiangolo.com/tutorial/options-autocompletion/ — retrieved 2026-10-12 — via web
[S9] Typer docs: parameter types and help — https://typer.tiangolo.com/tutorial/parameter-types — retrieved 2026-10-12 — via mcp:context7
[S10] Click docs: shell completion — https://click.palletsprojects.com/en/stable/shell-completion — retrieved 2026-10-12 — via mcp:context7
[S11] Click docs: groups and commands — https://click.palletsprojects.com/en/stable/documentation — retrieved 2026-10-12 — via mcp:context7
