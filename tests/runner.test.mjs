/**
 * Sweeps the runner's step builder over many instances, including the
 * degenerate shapes a user can produce with the size controls: voters who
 * approve nothing, candidates nobody approves, k = 1, k = m-1, and profiles
 * where the degree preprocessing short-circuits everything.
 *
 * For each instance it checks that the step list is well formed and that
 * the final step really does carry a verified certificate for a committee
 * that the independent exhaustive checker agrees is in the core.
 */
import { makeInstance, findCoreViolation } from '../js/election.js';
import { fastCore, verify } from '../js/core-algo.js';
import { buildSteps } from '../js/figures/runner.js';

let fails = 0;
const chk = (name, ok, detail = '') => {
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

function mk(approvals, m, k) {
  return makeInstance({
    voters: approvals.map((_, i) => `v${i + 1}`),
    candidates: Array.from({ length: m }, (_, c) => `c${c + 1}`),
    approvals, k, quota: 'hare',
  });
}

/** Everything the runner relies on about a step list. */
function auditSteps(inst, run, steps) {
  const problems = [];
  if (steps.length < 3) problems.push(`only ${steps.length} steps`);
  if (steps[0].kind !== 'setup') problems.push('first step is not setup');
  const last = steps[steps.length - 1];
  if (!last.final) problems.push('last step not marked final');
  if (steps.filter((s) => s.final).length !== 1) problems.push('not exactly one final step');

  for (const [j, st] of steps.entries()) {
    if (typeof st.title !== 'string' || !st.title) problems.push(`step ${j}: no title`);
    if (typeof st.body !== 'string' || !st.body) problems.push(`step ${j}: no body`);
    if (/undefined|NaN/.test(st.title + st.body)) problems.push(`step ${j}: "undefined"/NaN in text`);
    if (st.committee) {
      if (!Array.isArray([...st.committee])) problems.push(`step ${j}: bad committee`);
      const sz = [...st.committee].length;
      if (sz !== inst.k && sz !== inst.k + 1) problems.push(`step ${j}: committee size ${sz}`);
      // Every step that shows a committee must also show a usable system.
      if (st.system) {
        if (!Array.isArray(st.system.r) || st.system.r.length !== inst.n) {
          problems.push(`step ${j}: reserve vector wrong length`);
        }
        if (!Array.isArray(st.system.p) || st.system.p.length !== inst.n) {
          problems.push(`step ${j}: payment maps wrong length`);
        } else if (st.system.p.some((mp) => typeof mp.get !== 'function')) {
          problems.push(`step ${j}: payments not Maps`);
        }
        for (let i = 0; i < inst.n; i++) {
          const r = st.system.r[i];
          if (!Number.isFinite(r) || r < -1e-9 || r > 1 + 1e-9) {
            problems.push(`step ${j}: reserve ${r} out of [0,1]`);
          }
        }
      }
    }
  }

  // The last step is the one that matters: it must be a real certificate.
  if (last.committee && last.system) {
    const bad = verify(inst, last.committee, last.system);
    if (bad.length) problems.push(`final certificate invalid: ${bad.slice(0, 2).join('; ')}`);
    if ([...last.committee].length !== inst.k) problems.push('final committee not size k');
  } else {
    problems.push('final step has no committee/system');
  }
  return problems;
}

function one(label, approvals, m, k, { quiet = false } = {}) {
  const inst = mk(approvals, m, k);
  let run, steps;
  try {
    run = fastCore(inst);
    steps = buildSteps(inst, run);
  } catch (e) {
    chk(label, false, `threw: ${e.message}`);
    return false;
  }
  const problems = auditSteps(inst, run, steps);
  const viol = findCoreViolation(inst, run.committee);
  if (viol) problems.push(`committee not in core: S=${viol.S} T=${viol.T}`);
  const ok = problems.length === 0;
  if (!ok || !quiet) {
    chk(label, ok, ok ? `${steps.length} steps, ${run.rounds.length} rounds` : problems.slice(0, 3).join(' | '));
  }
  return ok;
}

console.log('--- degenerate and boundary shapes ---');
one('all voters abstain',        [[], [], []], 3, 2);
one('one voter abstains',        [[0, 1], [], [1, 2]], 3, 2);
one('candidate nobody approves', [[0], [0], [1]], 4, 2);
one('k = 1',                     [[0], [1], [0]], 3, 1);
one('k = m - 1',                 [[0, 1, 2], [1, 2], [0, 2]], 3, 2);
one('single voter',              [[0, 1]], 4, 2);
one('single voter, abstains',    [[]], 3, 2);
one('everyone approves all',     [[0, 1, 2, 3], [0, 1, 2, 3], [0, 1, 2, 3]], 4, 2);
one('duplicate ballots',         [[0, 1], [0, 1], [0, 1], [2, 3]], 4, 2);
one('preprocessing shortcut',    [[0], [1], [2], [3]], 5, 3);
one("paper's Figure 2",          [[0, 1, 2], [0, 1, 3], [4, 5, 6, 7, 8, 9], [4, 5, 6, 7, 8, 9]], 10, 8);
one('two blocks',                [[2, 3], [2, 3], [0, 1], [0, 1]], 4, 2);
one('three blocks',              [[0, 1], [0, 1], [2, 3], [2, 3], [4, 5], [4, 5]], 6, 3);
one('runner default',            [[0, 1, 2], [0, 1, 3], [2, 3, 4], [1, 4, 5]], 6, 3);

console.log('--- randomised sweep over the sizes the runner allows ---');
{
  let seed = 31337;
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  let ok = 0, bad = 0;
  const notes = [];
  for (let t = 0; t < 110; t++) {
    const m = 2 + Math.floor(rand() * 7);           // 2..8
    const n = 1 + Math.floor(rand() * 6);           // 1..6
    const k = 1 + Math.floor(rand() * (m - 1));     // 1..m-1
    const density = [0, 0.2, 0.4, 0.6, 0.85, 1][Math.floor(rand() * 6)];
    const A = Array.from({ length: n }, () => {
      const b = [];
      for (let c = 0; c < m; c++) if (rand() < density) b.push(c);
      return b;
    });
    const label = `m=${m} n=${n} k=${k}`;
    const good = one(label, A, m, k, { quiet: true });
    if (good) ok++;
    else { bad++; notes.push(`${label} A=${JSON.stringify(A)}`); }
  }
  chk(`randomised sweep: ${ok} ok, ${bad} failed`, bad === 0);
  notes.slice(0, 4).forEach((x) => console.log(`      ${x}`));
}

console.log('--- step structure on a run with a known repair ---');
{
  const inst = mk([[2, 3], [2, 3], [0, 1], [0, 1]], 4, 2);
  const run = fastCore(inst);
  const steps = buildSteps(inst, run);
  const kinds = steps.map((s) => s.kind);
  chk('starts with setup then preprocess',
    kinds[0] === 'setup' && kinds[1] === 'preprocess', kinds.slice(0, 2).join(','));
  chk('contains a scan step', kinds.includes('scan'));
  chk('contains a pick step', kinds.includes('pick'));
  chk('contains an add step', kinds.includes('add'));
  chk('contains a delete step', kinds.includes('delete'));
  chk('ends with done', kinds[kinds.length - 1] === 'done');
  chk('mid-round steps carry k+1 members',
    steps.filter((s) => s.kind === 'delete')
      .every((s) => [...s.committee].length === inst.k + 1));
  chk('every scan step carries a committee of size k',
    steps.filter((s) => s.kind === 'scan')
      .every((s) => [...s.committee].length === inst.k));
  console.log(`      kinds: ${kinds.join(' → ')}`);
}

console.log(fails === 0 ? '\nALL TESTS PASSED' : `\n${fails} FAILURE(S)`);
process.exit(fails === 0 ? 0 : 1);
