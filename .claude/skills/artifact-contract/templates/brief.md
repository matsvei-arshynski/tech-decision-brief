---
artifact: brief
agent: brief-synthesizer
run_id: <run-id>
attempt: <n>
---
# Tech Decision Brief: <short question>

## 1. Decision
**Recommendation:** <candidate> · **Confidence:** <high | medium | low>

<2–3 sentences: why, in plain words.>

## 2. Context and confirmed requirements
<Question, context, and every hard constraint (H1…) and preference (P1…) from
requirements, as bullets.>

## 3. Options considered
### <Candidate 1>
<2–4 sentences with citations.>
### <Candidate 2>
<…>

## 4. Evaluation matrix

### Hard constraints
| Constraint | <Candidate 1> | <Candidate 2> |
|---|---|---|
| H1 <short text> | <met / unmet / unknown> [Sn] | <…> |

### Weighted criteria
Scores 1–5 (5 = best); total = Σ weight × score.

| Criterion | Weight | <Candidate 1> | <Candidate 2> |
|---|---|---|---|
| <criterion> | <w> | <score> [Sn] | <score> [Sn] |
| **Total** | | **<sum>** | **<sum>** |

## 5. Recommendation and rationale
<Why the recommended option wins, which constraints decided it, and when you would choose
another option instead.>

## 6. Risks and mitigations
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| <risk> [Sn] | <low / medium / high> | <low / medium / high> | <mitigation> |

## 7. Adoption plan
1. <first step>
2. <…>

## 8. Open questions
<"None." or bullets.>

## 9. Sources
[S1] <page title> — <URL> — retrieved <YYYY-MM-DD> — via <mcp:mslearn | mcp:context7 | web>
