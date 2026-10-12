---
artifact: requirements
agent: requirements-formalizer
run_id: 20261012-2216-typer-vs-click-python-cli
attempt: 1
---
# Requirements

## Question
Which argument-parsing library, Typer or Click, should a new Python 3.12 command-line tool use?

## Question type
library

## Candidates
1. **Typer** — Python CLI library built on type hints, with Click as its underlying engine.
2. **Click** — Python CLI toolkit using decorators to define commands, options and arguments.

## Context
- Stack: Python 3.12 CLI tool (new project).
- Team: None stated.
- Scale: None stated.
- Other: None stated.
- Assumed: The tool is a standard pip-installable CLI, so the license and Python version constraints apply to the library and its dependencies.
- Assumed: Only the two named candidates are compared.

## Hard constraints
| ID | Constraint | Dimension |
|---|---|---|
| H1 | The library's license is MIT or BSD (BSD-2-Clause or BSD-3-Clause), checkable from the package license metadata. | license |
| H2 | The library declares support for Python 3.12 in its package metadata (classifiers or requires-python range that includes 3.12). | compatibility |

## Preferences
| ID | Preference |
|---|---|
| — | None stated. |

## Decision criteria
| Criterion | Weight (1–5) | Dimension | Why it matters |
|---|---|---|---|
| Python 3.12 compatibility evidence (declared support, tested versions) | 4 | compatibility | The tool targets Python 3.12, so the library must clearly support it. |
| Command and option capability (subcommands, typed options, help output, shell completion) | 3 | capability | Determines how much hand-written parsing code the tool needs. |
| Dependency footprint (number of runtime dependencies) | 3 | operations | Fewer transitive dependencies mean less install and upgrade risk. |
| Maintenance recency (latest stable release date and cadence) | 3 | maturity | An actively maintained library reduces long-term upgrade risk. |

## Open questions
None.
