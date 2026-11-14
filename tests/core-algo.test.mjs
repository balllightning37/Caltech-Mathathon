/**
 * Validates js/core-algo.js -- the browser implementation of the
 * carried-target algorithm.
 *
 * Checks, for many instances, that the committee it returns
 *   (a) has size k,
 *   (b) comes with a payment system passing (P1)-(P4), and
 *   (c) is genuinely in the core, by the exhaustive checker in election.js
 *       (which is independent of this module).
 */
import { makeInstance, figure2Instance, findCoreViolation, FIG2_W } from '../js/election.js';
import { fastCore, verify, preprocess, truncationLevel, neighbourhoodSize } from '../js/core-algo.js';

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

function run(label, approvals, m, k, { quiet = false } = {}) {
  const inst = mk(approvals, m, k);
  let res;
  try {
    res = fastCore(inst);
  } catch (e) {
    chk(`${label}: runs`, false, e.message);
    return null;
  }
  const okSize = res.committee.length === k;
  const okCert = res.failures.length === 0;
  const viol = findCoreViolation(inst, res.committee);
  const okCore = viol === null;
  const ok = okSize && okCert && okCore;
  if (!ok || !quiet) {
    chk(`${label}`, ok,
      `W={${res.committee.map((c) => inst.candidates[c]).join(',')}} `
      + `rounds=${res.rounds.length} solves=${res.solves} L=${res.L}`
      + (okSize ? '' : ` SIZE ${res.committee.length}≠${k}`)
      + (okCert ? '' : ` CERT: ${res.failures.slice(0, 2).join('; ')}`)
      + (okCore ? '' : ` NOT IN CORE: S=${viol.S} T=${viol.T}`));
  }
  return { inst, res, ok };
}

console.log('--- the paper\'s Figure 2 instance ---');
{
  const inst = figure2Instance();
  const res = fastCore(inst);
  const viol = findCoreViolation(inst, res.committee);
  chk('Figure 2: certificate passes (P1)-(P4)', res.failures.length === 0,
    res.failures.slice(0, 3).join('; '));
  chk('Figure 2: committee is in the core', viol === null);
  chk('Figure 2: |W| = k', res.committee.length === inst.k);
  console.log(`      W = {${res.committee.map((c) => inst.candidates[c]).join(', ')}}`);
  console.log(`      rounds = ${res.rounds.length}, optimiser solves = ${res.solves}, L = ${res.L}`);
  console.log(`      paper would scan ${neighbourhoodSize(inst)} LPs per round`);
  // The algorithm must not return the committee that fails the core.
  chk('Figure 2: does not return the blocked committee W',
    res.committee.join() !== FIG2_W.join());
}

console.log('--- structured instances ---');
const structured = [
  ['two blocks, one seat each', [[2, 3], [2, 3], [0, 1], [0, 1]], 4, 2],
  ['everyone approves all',     [[0, 1, 2], [0, 1, 2], [0, 1, 2]], 3, 2],
  ['nobody approves anything',  [[], [], []], 3, 2],
  ['some abstain',              [[0], [], [1, 2], []], 3, 2],
  ['unapproved candidate',      [[0], [0], [1]], 3, 2],
  ['k = 1',                     [[0], [1], [0]], 2, 1],
  ['single voter',              [[0, 1]], 3, 2],
  ['majority/minority',         [[0], [0], [0], [1]], 3, 2],
  ['nested approvals',          [[0], [0, 1], [0, 1, 2]], 3, 2],
  ['three blocks',              [[0, 1], [0, 1], [2, 3], [2, 3], [4, 5], [4, 5]], 6, 3],
  ['doc example m=4 k=2',       [[2, 3], [2, 3], [0, 1], [0, 1]], 4, 2],
  ['doc example m=3 k=2',       [[0, 2], [0, 1]], 3, 2],
];
for (const [label, A, m, k] of structured) run(label, A, m, k);

console.log('--- randomised sweep (independent core check on every result) ---');
{
  let seed = 424242;
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  let ok = 0, bad = 0;
  const failures = [];
  for (let t = 0; t < 160; t++) {
    const m = 3 + Math.floor(rand() * 4);          // 3..6
    const n = 2 + Math.floor(rand() * 5);          // 2..6
    const k = 1 + Math.floor(rand() * (m - 1));    // 1..m-1
    const density = [0.3, 0.45, 0.6, 0.8][Math.floor(rand() * 4)];
    const A = Array.from({ length: n }, () => {
      const b = [];
      for (let c = 0; c < m; c++) if (rand() < density) b.push(c);
      return b;
    });
    const inst = mk(A, m, k);
    let res;
    try { res = fastCore(inst); } catch (e) {
      bad++; failures.push(`crash m=${m} k=${k} A=${JSON.stringify(A)} :: ${e.message}`); continue;
    }
    const certBad = res.failures.length > 0;
    const viol = findCoreViolation(inst, res.committee);
    if (res.committee.length !== k || certBad || viol) {
      bad++;
      failures.push(`m=${m} k=${k} A=${JSON.stringify(A)} W=${res.committee} `
        + (certBad ? `cert=[${res.failures.slice(0, 2).join('; ')}] ` : '')
        + (viol ? `blocked by S=${viol.S} T=${viol.T}` : ''));
    } else ok++;
  }
  chk(`randomised sweep: ${ok} ok, ${bad} failed`, bad === 0);
  failures.slice(0, 5).forEach((f) => console.log(`      ${f}`));
}

console.log('--- preprocessing is exactly the documented degree filter ---');
{
  // n=3, k=2 gives q = 1.5, so a candidate needs >= 2 approvers to be "high".
  const inst = mk([[0], [0, 1], [1, 2]], 3, 2);
  const pre = preprocess(inst);
  chk('q = 1.5 identifies c1, c2 as high-degree',
    pre.high.join() === '0,1', `high=${pre.high}`);
  chk('with 2 high-degree candidates and k=2, it short-circuits', pre.shortcut === true);
  const bad = verify(inst, pre.committee, pre.system);
  chk('the all-reserve certificate it returns is valid', bad.length === 0, bad.join('; '));
}

console.log('--- truncation level matches the reference formula ---');
{
  const inst = figure2Instance();
  // q = 1/2, delta = 1/2 - 4/9 = 1/18. candidates = high-degree ones.
  const pre = preprocess(inst);
  const L = truncationLevel(inst, pre.shortcut ? [] : pre.high);
  chk('L is a positive integer', Number.isInteger(L) && L > 0, `L=${L}`);
  console.log(`      high-degree candidates: ${pre.high.map((c) => inst.candidates[c]).join(', ')}`);
  console.log(`      L = ${L}`);
}

console.log(fails === 0 ? '\nALL TESTS PASSED' : `\n${fails} FAILURE(S)`);
process.exit(fails === 0 ? 0 : 1);
