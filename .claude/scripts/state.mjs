// Coordinator-facing state CLI. Prints JSON on stdout; exits 1 with a message on error.
//   node .claude/scripts/state.mjs init <slug> [--simulate-fault GATE:artifact[:always]]
//   node .claude/scripts/state.mjs hash <file>
//   node .claude/scripts/state.mjs status <run-id>
//   node .claude/scripts/state.mjs set-status <run-id> <status> [--reason "<text>"]
//   node .claude/scripts/state.mjs next [run-id]       next step (default run: newest not done);
//                                                       resume-plan is an alias
//   node .claude/scripts/state.mjs plan <run-id>       write 02-plan.md from the selection rules
import { join, resolve } from 'node:path';
import { parseFault } from '../skills/artifact-contract/scripts/validate.mjs';
import { latestOpenRun, nextStep, writePlan } from '../hooks/lib/workflow.mjs';
import { hashFile, initRun, readState, ROOT, RUNS, summarize, updateState } from '../hooks/lib/state.mjs';

const RUN_STATUSES = ['intake', 'requirements', 'research', 'synthesis', 'approval', 'rendering', 'done', 'blocked'];

const args = process.argv.slice(2);
const cmd = args.shift();
const out = (obj) => console.log(JSON.stringify(obj, null, 2));
const runIdArg = (s) => String(s ?? '').replace(/^runs[\\/]/, '').replace(/[\\/]$/, '');
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : null;
};

try {
  switch (cmd) {
    case 'init': {
      const fault = option('--simulate-fault');
      if (fault && !parseFault(fault)) throw new Error('--simulate-fault expects GATE:artifact[:always], e.g. CITATIONS:ecosystem');
      if (!args.length) throw new Error('usage: init <slug> [--simulate-fault GATE:artifact[:always]]');
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
      const state = readState(join(RUNS, runIdArg(args[0])));
      if (!state) throw new Error(`no workflow-state.json for run ${args[0]}`);
      out(summarize(state));
      break;
    }
    case 'set-status': {
      const reason = option('--reason');
      const [runId, status] = args;
      if (!RUN_STATUSES.includes(status)) throw new Error(`usage: set-status <run-id> <${RUN_STATUSES.join('|')}> [--reason "<text>"]`);
      const s = updateState(join(RUNS, runIdArg(runId)), (st) => {
        st.status = status;
        // A blocked run stays blocked until its requirements change (see resume-plan).
        st.blocked = status === 'blocked'
          ? { reason, report: 'gates/UNRESOLVED.md', requirements_sha256: st.artifacts['01-requirements.md']?.sha256 ?? null, at: new Date().toISOString() }
          : null;
      });
      if (!s) throw new Error(`no workflow-state.json for run ${runId}`);
      out({ run_id: s.run_id, status: s.status });
      break;
    }
    case 'next':
    case 'resume-plan': {
      const runId = args[0] ? runIdArg(args[0]) : latestOpenRun();
      if (!runId) throw new Error('no unfinished run found under runs/');
      out(nextStep(runId));
      break;
    }
    case 'plan': {
      if (!args[0]) throw new Error('usage: plan <run-id>');
      out(writePlan(runIdArg(args[0])));
      break;
    }
    default:
      throw new Error(`unknown command: ${cmd ?? '(none)'}`);
  }
} catch (err) {
  console.error(`state.mjs: ${err.message}`);
  process.exit(1);
}
