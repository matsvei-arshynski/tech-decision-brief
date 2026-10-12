// Coordinator-facing state CLI. Prints JSON on stdout; exits 1 with a message on error.
//   node .claude/scripts/state.mjs init <slug>
//   node .claude/scripts/state.mjs hash <file>
// More commands (plan, stage, record-gates, invalidate, resume-plan) arrive in Phase 5.
import { resolve } from 'node:path';
import { hashFile, initRun, ROOT } from '../hooks/lib/state.mjs';

const [cmd, ...args] = process.argv.slice(2);
const out = (obj) => console.log(JSON.stringify(obj));

try {
  switch (cmd) {
    case 'init':
      if (!args[0]) throw new Error('usage: init <slug>');
      out(initRun(args.join(' ')));
      break;
    case 'hash': {
      if (!args[0]) throw new Error('usage: hash <file>');
      const sha256 = hashFile(resolve(ROOT, args[0]));
      out({ file: args[0], sha256, sha8: sha256.slice(0, 8) });
      break;
    }
    default:
      throw new Error(`unknown command: ${cmd ?? '(none)'}`);
  }
} catch (err) {
  console.error(`state.mjs: ${err.message}`);
  process.exit(1);
}
