// Script gates STRUCTURE and CITATIONS for one run artifact.
//   node .claude/skills/artifact-contract/scripts/validate.mjs <artifact-path> [--simulate-fault GATE:artifact]
// Prints a JSON result; exit 0 = pass (or nothing to check), 1 = fail, 2 = usage error.
// Also imported by the PostToolUse hook (validateArtifact).
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RESEARCH_TITLES = {
  docs: 'Official documentation',
  ecosystem: 'Ecosystem and maturity',
  patterns: 'Architecture patterns and trade-offs',
};
const REQUIREMENTS_H2 = ['Question', 'Question type', 'Candidates', 'Context', 'Hard constraints',
  'Preferences', 'Decision criteria', 'Open questions'];
const RESEARCH_H2 = ['Summary', 'Findings', 'Constraint check', 'Open issues', 'Sources'];
const BRIEF_H2 = ['1. Decision', '2. Context and confirmed requirements', '3. Options considered',
  '4. Evaluation matrix', '5. Recommendation and rationale', '6. Risks and mitigations',
  '7. Adoption plan', '8. Open questions', '9. Sources'];
const GATE_H2 = ['Result', 'Script gates', 'Semantic gates', 'Findings'];
const HTML_IDS = ['decision', 'context', 'options', 'matrix', 'recommendation', 'risks',
  'adoption', 'open-questions', 'sources'];
const DIMENSIONS = ['capability', 'compatibility', 'license', 'cost', 'performance', 'operations', 'maturity'];
const STATUSES = ['met', 'unmet', 'unknown', 'n/a'];
const SOURCE_LINE = /^\[S(\d+)\] .+ — https?:\/\/\S+ — retrieved \d{4}-\d{2}-\d{2} — via (mcp:mslearn|mcp:context7|web)$/;

// ---------- parsing helpers ----------

const norm = (text) => text.replace(/\r\n/g, '\n');

export function splitFrontMatter(text) {
  const t = norm(text);
  if (!t.startsWith('---\n')) return { fm: null, body: t };
  const end = t.indexOf('\n---\n', 4);
  if (end < 0) return { fm: null, body: t };
  const fm = {};
  for (const line of t.slice(4, end).split('\n')) {
    const m = line.match(/^([A-Za-z_]+):\s*(.*?)\s*(#.*)?$/);
    if (m) fm[m[1]] = m[2];
  }
  return { fm, body: t.slice(end + 5) };
}

// Headings outside code fences: [{level, text, line}]
function headings(body) {
  const out = [];
  let fence = false;
  body.split('\n').forEach((line, i) => {
    if (/^\s*```/.test(line)) fence = !fence;
    const m = !fence && line.match(/^(#{1,3}) (.+?)\s*$/);
    if (m) out.push({ level: m[1].length, text: m[2], line: i });
  });
  return out;
}

// Map of H2 title -> section text (until the next H2).
function sections(body) {
  const lines = body.split('\n');
  const h2 = headings(body).filter((h) => h.level === 2);
  const map = new Map();
  h2.forEach((h, i) => map.set(h.text, lines.slice(h.line + 1, h2[i + 1]?.line ?? lines.length).join('\n')));
  return map;
}

// Sub-sections (H3) inside a section text.
function subsections(text) {
  const lines = text.split('\n');
  const h3 = headings(text).filter((h) => h.level === 3);
  return h3.map((h, i) => ({ title: h.text, text: lines.slice(h.line + 1, h3[i + 1]?.line ?? lines.length).join('\n') }));
}

// Markdown table rows (header + data, separator dropped), cells trimmed.
function tableRows(text) {
  return text.split('\n').filter((l) => l.trim().startsWith('|'))
    .map((l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()))
    .filter((cells) => !cells.every((c) => /^:?-{2,}:?$/.test(c)));
}

// Citation ids in text: [S1], [S1][S2], [S1, S2], [S1, 2].
function citations(text) {
  const ids = [];
  for (const m of text.matchAll(/\[S(\d+(?:\s*,\s*S?\d+)*)\]/g)) {
    for (const part of m[1].split(',')) ids.push(Number(part.replace(/\D/g, '')));
  }
  return ids;
}

const firstLine = (text) => (text ?? '').split('\n').map((l) => l.trim()).find((l) => l) ?? '';
const stripMd = (s) => s.replace(/\*\*/g, '').trim();

export function parseRequirements(text) {
  const { body } = splitFrontMatter(text);
  const s = sections(body);
  const candidates = (s.get('Candidates') ?? '').split('\n')
    .map((l) => l.match(/^\s*\d+\.\s+\*\*(.+?)\*\*/)?.[1]).filter(Boolean);
  const hard = tableRows(s.get('Hard constraints') ?? '').slice(1)
    .filter((r) => /^H\d+$/.test(r[0])).map((r) => ({ id: r[0], text: r[1], dimension: (r[2] ?? '').toLowerCase() }));
  const criteria = tableRows(s.get('Decision criteria') ?? '').slice(1)
    .map((r) => ({ name: r[0], weight: Number(r[1]), dimension: (r[2] ?? '').toLowerCase() }));
  return {
    questionType: firstLine(s.get('Question type')).toLowerCase(),
    candidates, hard, criteria,
    openQuestions: firstLine(s.get('Open questions')),
  };
}

function expectedType(rel) {
  const r = rel.split(sep).join('/');
  if (r === '01-requirements.md') return 'requirements';
  const research = r.match(/^research\/1\d-(docs|ecosystem|patterns)\.md$/);
  if (research) return research[1];
  if (r === '30-brief-draft.md') return 'brief';
  if (r === 'final/decision-brief.md') return 'final-md';
  if (r === 'final/decision-brief.html') return 'final-html';
  if (/^gates\/(research|brief)\.r\d+\.md$/.test(r)) return 'gate';
  return 'other';
}

// ---------- checks ----------

function checkFrontMatter(fm, keys, type, runId, f) {
  if (!fm) return f.push('missing front matter');
  for (const k of keys) if (!fm[k]) f.push(`front matter: missing "${k}"`);
  if (fm.artifact && fm.artifact !== type) f.push(`front matter: artifact is "${fm.artifact}", expected "${type}"`);
  if (fm.run_id && runId && fm.run_id !== runId) f.push(`front matter: run_id "${fm.run_id}" doesn't match folder "${runId}"`);
}

function checkH2Order(body, expected, f) {
  const got = headings(body).filter((h) => h.level === 2).map((h) => h.text);
  if (got.join('\n') !== expected.join('\n')) {
    const missing = expected.filter((h) => !got.includes(h));
    const extra = got.filter((h) => !expected.includes(h));
    f.push(`sections must be exactly [${expected.join(' | ')}] in order` +
      (missing.length ? `; missing: ${missing.join(', ')}` : '') +
      (extra.length ? `; unexpected: ${extra.join(', ')}` : '') +
      (!missing.length && !extra.length ? '; order differs' : ''));
  }
}

function checkH1(body, test, label, f) {
  const h1 = headings(body).filter((h) => h.level === 1);
  if (h1.length !== 1 || !test(h1[0].text)) f.push(`needs exactly one title: ${label}`);
}

function checkCandidateSubsections(sectionText, req, where, f) {
  if (!req) return;
  const got = subsections(sectionText ?? '').map((s) => stripMd(s.title));
  if (got.join('\n') !== req.candidates.join('\n')) {
    f.push(`${where}: "###" subsections must be the candidates in requirements order [${req.candidates.join(', ')}], found [${got.join(', ')}]`);
  }
}

function checkSources(body, sourcesTitle, f) {
  const s = sections(body);
  const lines = (s.get(sourcesTitle) ?? '').split('\n').map((l) => l.trim()).filter((l) => l);
  const defined = [];
  for (const line of lines) {
    const m = line.match(SOURCE_LINE);
    if (!m) { f.push(`source line has the wrong format: "${line.slice(0, 80)}"`); continue; }
    defined.push(Number(m[1]));
  }
  defined.forEach((id, i) => { if (id !== i + 1) f.push(`sources must be numbered S1…Sn without gaps; found S${id} at position ${i + 1}`); });
  const bodyWithoutSources = [...s.entries()].filter(([k]) => k !== sourcesTitle).map(([, v]) => v).join('\n');
  const used = new Set(citations(bodyWithoutSources));
  for (const id of used) if (!defined.includes(id)) f.push(`[S${id}] is cited but not defined under Sources`);
  for (const id of defined) if (!used.has(id)) f.push(`[S${id}] is defined but never cited`);
  return lines;
}

function validateRequirements(fm, body, runId, s, c) {
  checkFrontMatter(fm, ['artifact', 'agent', 'run_id', 'attempt'], 'requirements', runId, s);
  checkH1(body, (t) => t === 'Requirements', '"# Requirements"', s);
  checkH2Order(body, REQUIREMENTS_H2, s);
  const req = parseRequirements(body);
  if (!['library', 'architecture'].includes(req.questionType)) s.push(`Question type must be "library" or "architecture", found "${req.questionType}"`);
  if (req.candidates.length === 0) s.push('Candidates: no "1. **Name** — …" entries found');
  if (req.openQuestions === 'None.' && req.candidates.length < 2) s.push('Candidates: at least 2 are needed when there are no open questions');
  if (req.candidates.length > 4) s.push('Candidates: at most 4');
  const ids = req.hard.map((h) => h.id);
  if (new Set(ids).size !== ids.length) s.push('Hard constraints: duplicate IDs');
  for (const h of req.hard) if (!DIMENSIONS.includes(h.dimension)) s.push(`Hard constraints: ${h.id} has dimension "${h.dimension}", expected one of ${DIMENSIONS.join(', ')}`);
  if (req.criteria.length === 0) s.push('Decision criteria: no rows');
  for (const k of req.criteria) if (!(k.weight >= 1 && k.weight <= 5)) s.push(`Decision criteria: "${k.name}" weight must be 1–5`);
  for (const k of req.criteria) if (!DIMENSIONS.includes(k.dimension)) s.push(`Decision criteria: "${k.name}" has dimension "${k.dimension}", expected one of ${DIMENSIONS.join(', ')}`);
  c.na = true;
}

function validateResearch(type, fm, body, runId, req, s, c) {
  checkFrontMatter(fm, ['artifact', 'agent', 'run_id', 'attempt'], type, runId, s);
  checkH1(body, (t) => t === RESEARCH_TITLES[type], `"# ${RESEARCH_TITLES[type]}"`, s);
  checkH2Order(body, RESEARCH_H2, s);
  const sec = sections(body);
  checkCandidateSubsections(sec.get('Findings'), req, 'Findings', s);
  if (req) {
    const rows = tableRows(sec.get('Constraint check') ?? '').slice(1);
    for (const h of req.hard) {
      for (const cand of req.candidates) {
        const row = rows.find((r) => r[0] === h.id && stripMd(r[1] ?? '') === cand);
        if (!row) s.push(`Constraint check: missing row for ${h.id} × ${cand}`);
        else if (!STATUSES.includes((row[2] ?? '').toLowerCase())) s.push(`Constraint check: ${h.id} × ${cand} status "${row[2]}" must be one of ${STATUSES.join(', ')}`);
      }
    }
  }
  if (!firstLine(sec.get('Open issues'))) s.push('Open issues: empty (write "None." if there are none)');

  // CITATIONS
  checkSources(body, 'Sources', c);
  for (const sub of subsections(sec.get('Findings') ?? '')) {
    const bullets = sub.text.split('\n').filter((l) => /^\s*[-*] /.test(l));
    if (bullets.length === 0) c.push(`Findings › ${sub.title}: no bullets`);
    for (const b of bullets) if (citations(b).length === 0) c.push(`Findings › ${sub.title}: uncited bullet "${b.trim().slice(0, 70)}"`);
  }
}

function validateBrief(type, fm, body, runId, req, runDir, s, c) {
  if (type === 'brief') checkFrontMatter(fm, ['artifact', 'agent', 'run_id', 'attempt'], 'brief', runId, s);
  else if (fm) s.push('final Markdown must not have front matter');
  checkH1(body, (t) => t.startsWith('Tech Decision Brief: '), '"# Tech Decision Brief: <question>"', s);
  checkH2Order(body, BRIEF_H2, s);
  const sec = sections(body);
  const decision = sec.get('1. Decision') ?? '';
  if (!/\*\*Recommendation:\*\*/.test(decision)) s.push('Decision: missing "**Recommendation:**"');
  if (!/\*\*Confidence:\*\*\s*(high|medium|low)\b/.test(decision)) s.push('Decision: missing "**Confidence:** high|medium|low"');
  checkCandidateSubsections(sec.get('3. Options considered'), req, 'Options considered', s);

  const matrix = subsections(sec.get('4. Evaluation matrix') ?? '');
  const hc = matrix.find((m) => m.title === 'Hard constraints');
  const wc = matrix.find((m) => m.title === 'Weighted criteria');
  if (matrix.map((m) => m.title).join('|') !== 'Hard constraints|Weighted criteria') {
    s.push('Evaluation matrix: needs exactly "### Hard constraints" then "### Weighted criteria"');
  }
  if (hc && req) {
    const [head, ...rows] = tableRows(hc.text);
    const cands = (head ?? []).slice(1).map(stripMd);
    if (cands.join('\n') !== req.candidates.join('\n')) s.push(`Hard constraints table: columns must be Constraint + [${req.candidates.join(', ')}]`);
    const ids = rows.map((r) => r[0].match(/^(H\d+)\b/)?.[1] ?? r[0]);
    if (ids.join(',') !== req.hard.map((h) => h.id).join(',')) {
      s.push(`Hard constraints table: rows must be exactly ${req.hard.map((h) => h.id).join(', ')} in order, found ${ids.map((x) => x.slice(0, 12)).join(', ')}`);
    }
    for (const r of rows) for (const cell of r.slice(1)) {
      if (!/^\**(met|unmet|unknown)\b/i.test(cell)) s.push(`Hard constraints table: ${r[0].slice(0, 12)} cell must start with met, unmet or unknown`);
    }
  }
  if (wc) {
    const [head, ...rows] = tableRows(wc.text);
    const cands = (head ?? []).slice(2).map(stripMd);
    if (req && cands.join('\n') !== req.candidates.join('\n')) s.push(`Weighted criteria table: columns must be Criterion, Weight + [${req.candidates.join(', ')}]`);
    const total = rows.find((r) => /total/i.test(stripMd(r[0])));
    const data = rows.filter((r) => r !== total);
    if (!total) s.push('Weighted criteria table: missing **Total** row');
    const weights = data.map((r) => Number(r[1]));
    for (let i = 1; i < weights.length; i++) if (weights[i] > weights[i - 1]) { s.push('Weighted criteria table: rows must be sorted by weight, highest first'); break; }
    cands.forEach((cand, ci) => {
      let sum = 0;
      for (const r of data) {
        const cell = r[2 + ci] ?? '';
        const score = Number(cell.match(/\d+/)?.[0]);
        if (!(score >= 1 && score <= 5)) s.push(`Weighted criteria: "${r[0]}" × ${cand} needs a 1–5 score`);
        else sum += score * Number(r[1]);
        if (citations(cell).length === 0) c.push(`Weighted criteria: "${r[0]}" × ${cand} has no citation`);
      }
      const stated = Number(stripMd(total?.[2 + ci] ?? '').match(/\d+/)?.[0]);
      if (total && stated !== sum) s.push(`Weighted criteria: total for ${cand} is ${stated}, but Σ weight × score = ${sum}`);
    });
  }

  // CITATIONS
  const sourceLines = checkSources(body, '9. Sources', c);
  for (const sub of subsections(sec.get('3. Options considered') ?? '')) {
    if (citations(sub.text).length === 0) c.push(`Options considered › ${sub.title}: no citation`);
  }
  // Every brief source must come from the research.
  const researchDir = join(runDir, 'research');
  if (existsSync(researchDir)) {
    const researchText = readdirSync(researchDir).filter((n) => n.endsWith('.md'))
      .map((n) => readFileSync(join(researchDir, n), 'utf8')).join('\n');
    for (const line of sourceLines) {
      const url = line.match(/ — (https?:\/\/\S+) — /)?.[1];
      if (url && !researchText.includes(url)) c.push(`source not found in any research artifact: ${url}`);
    }
  }
  if (type === 'final-md') {
    const draftPath = join(runDir, '30-brief-draft.md');
    if (existsSync(draftPath) && splitFrontMatter(readFileSync(draftPath, 'utf8')).body.trim() !== body.trim()) {
      s.push('final Markdown differs from the approved draft');
    }
  }
}

function validateHtml(text, runDir, s, c) {
  let pos = -1;
  for (const id of HTML_IDS) {
    const at = text.indexOf(`<section id="${id}">`);
    if (at < 0) s.push(`missing <section id="${id}">`);
    else if (at < pos) s.push(`<section id="${id}"> is out of order`);
    else pos = at;
  }
  if (text.includes('{{')) s.push('template placeholder left in the HTML');
  const draftPath = join(runDir, '30-brief-draft.md');
  if (existsSync(draftPath)) {
    const draftSources = (sections(splitFrontMatter(readFileSync(draftPath, 'utf8')).body).get('9. Sources') ?? '')
      .split('\n').filter((l) => l.trim().startsWith('[S')).length;
    const htmlSources = (text.match(/<li id="s-\d+"/g) ?? []).length;
    if (htmlSources !== draftSources) c.push(`HTML has ${htmlSources} sources, the draft has ${draftSources}`);
  }
}

function validateGate(fm, body, runId, s, c) {
  checkFrontMatter(fm, ['artifact', 'agent', 'run_id', 'stage', 'round', 'result'], 'gate', runId, s);
  if (fm && !['pass', 'fail'].includes(fm.result)) s.push('front matter: result must be pass or fail');
  checkH1(body, (t) => t.startsWith('Gate report: '), '"# Gate report: <stage>, round <n>"', s);
  checkH2Order(body, GATE_H2, s);
  const findings = sections(body).get('Findings') ?? '';
  const rows = tableRows(findings).slice(1);
  if (fm?.result === 'fail' && rows.length === 0) s.push('result is fail but Findings has no table rows');
  if (fm?.result === 'pass' && rows.length > 0) s.push('result is pass but Findings lists rows');
  for (const r of rows) if (r.length !== 6) s.push('Findings rows need 6 columns: # | Gate | Artifact | Owner | Finding | Fix hint');
  c.na = true;
}

// ---------- entry points ----------

export function parseFault(spec) {
  const m = String(spec ?? '').match(/^(STRUCTURE|CITATIONS):([a-z-]+)$/);
  return m ? { gate: m[1], artifact: m[2] } : null;
}

// absPath: artifact file; returns { artifact, type, attempt, result, gates }.
export function validateArtifact(absPath, { runDir = dirname(absPath), simulateFault = null } = {}) {
  const rel = relative(runDir, absPath);
  const type = expectedType(rel);
  const result = { artifact: rel.split(sep).join('/'), type, attempt: null, result: 'pass', gates: {} };
  if (type === 'other') { result.result = 'n/a'; return result; }

  const text = readFileSync(absPath, 'utf8');
  const runId = basename(runDir);
  const reqPath = join(runDir, '01-requirements.md');
  const req = type !== 'requirements' && existsSync(reqPath) ? parseRequirements(readFileSync(reqPath, 'utf8')) : null;
  const s = []; const c = [];
  const { fm, body } = splitFrontMatter(text);
  result.attempt = fm?.attempt ? Number(fm.attempt) : null;

  if (type === 'requirements') validateRequirements(fm, body, runId, s, c);
  else if (RESEARCH_TITLES[type]) validateResearch(type, fm, body, runId, req, s, c);
  else if (type === 'brief' || type === 'final-md') validateBrief(type, fm, body, runId, req, runDir, s, c);
  else if (type === 'final-html') validateHtml(norm(text), runDir, s, c);
  else if (type === 'gate') validateGate(fm, body, runId, s, c);

  const fault = typeof simulateFault === 'string' ? parseFault(simulateFault) : simulateFault;
  if (fault && fault.artifact === (fm?.artifact ?? type) && result.attempt === 1) {
    (fault.gate === 'STRUCTURE' ? s : c).push('[injected] simulated failure on attempt 1 (--simulate-fault); fix: re-run the owner');
  }

  result.gates.STRUCTURE = { result: s.length ? 'fail' : 'pass', findings: s };
  result.gates.CITATIONS = c.na && !c.length ? { result: 'n/a', findings: [] } : { result: c.length ? 'fail' : 'pass', findings: c };
  result.result = s.length || c.length ? 'fail' : 'pass';
  return result;
}

// CLI
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const fi = args.indexOf('--simulate-fault');
  const fault = fi >= 0 ? args.splice(fi, 2)[1] : null;
  if (!args[0] || !existsSync(args[0])) {
    console.error('usage: validate.mjs <artifact-path> [--simulate-fault GATE:artifact]');
    process.exit(2);
  }
  const abs = resolve(args[0]);
  // The run folder is the first folder under runs/.
  const parts = abs.split(sep);
  const ri = parts.lastIndexOf('runs');
  const runDir = ri >= 0 && parts[ri + 1] ? parts.slice(0, ri + 2).join(sep) : dirname(abs);
  const out = validateArtifact(abs, { runDir, simulateFault: fault });
  console.log(JSON.stringify(out, null, 2));
  process.exit(out.result === 'fail' ? 1 : 0);
}
