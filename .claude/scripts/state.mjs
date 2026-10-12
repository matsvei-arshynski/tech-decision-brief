// Coordinator-facing state CLI. Prints JSON on stdout; exits 1 with a message on error.
//   node .claude/scripts/state.mjs init <slug> [--simulate-fault GATE:artifact]
//   node .claude/scripts/state.mjs hash <file>
//   node .claude/scripts/state.mjs status <run-id>
//   node .claude/scripts/state.mjs set-status <run-id> <status>
// Resume (resume-plan) arrives in Phase 5.
import { join, resolve } from 'node:path';
import { parseFault } from '../skills/artifact-contract/scripts/validate.mjs';
import { hashFile, initRun, readState, ROOT, RUNS, summarize, updateState } from '../hooks/lib/state.mjs';

const RUN_STATUSES = ['intake', 'requirements', 'research', 'synthesis', 'approval', 'rendering', 'done', 'blocked'];

const args = process.argv.slice(2);
const cmd = args.shift();
const out = (obj) => console.log(JSON.stringify(obj, null, 2));

try {
  switch (cmd) {
    case 'init': {
      const fi = args.indexOf('--simulate-fault');
      const fault = fi >= 0 ? args.splice(fi, 2)[1] : null;
      if (fault && !parseFault(fault)) throw new Error('--simulate-fault expects GATE:artifact, e.g. CITATIONS:ecosystem');
      if (!args.length) throw new Error('usage: init <slug> [--simulate-fault GATE:artifact]');
      out(initRun(args.join(' '), { simulateFault: fault ? parseFault(fault) : null }));
      break;
    }
    case 'hash': {
      if (!args[0]) throw new Error('usage: hash <file>');
      const sha256 = hashFile(resolve(ROOT, args[0]));
      out({ file: args[0], sha256, sha8: sha256.slice(0, 8) });
      break;
    }
    case 'status': {
      if (!args[0]) throw new Error('usage: status <run-id>');
      const state = readState(join(RUNS, args[0].replace(/^runs[\\/]/, '')));
      if (!state) throw new Error(`no workflow-state.json for run ${args[0]}`);
      out(summarize(state));
      break;
    }
    case 'set-status': {
      const [runId, status] = args;
      if (!RUN_STATUSES.includes(status)) throw new Error(`usage: set-status <run-id> <${RUN_STATUSES.join('|')}>`);
      const s = updateState(join(RUNS, runId.replace(/^runs[\\/]/, '')), (st) => { st.status = status; });
      if (!s) throw new Error(`no workflow-state.json for run ${runId}`);
      out({ run_id: s.run_id, status: s.status });
      break;
    }
    default:
      throw new Error(`unknown command: ${cmd ?? '(none)'}`);
  }
} catch (err) {
  console.error(`state.mjs: ${err.message}`);
  process.exit(1);
}
