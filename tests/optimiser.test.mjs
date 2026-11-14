/**
 * Validates the projected-gradient optimiser for V(W) against an
 * independent exact rational LP.
 *
 * The reference values below were produced by core_algorithm.py's
 * HarmonicLP (z3 exact rational arithmetic) on the truncated objective
 * V_L, so they are independent of anything in js/. Reproduce with:
 *
 *   python -c "from fractions import Fraction; from core_algorithm import HarmonicLP; \
 *     lp=HarmonicLP([{0,1,2},{0,1,3},{4,5,6,7,8,9},{4,5,6,7,8,9}],Fraction(4,8),8); \
 *     print(float(lp.solve({0,1,4,5,6,7,8,9})[0]))"
 *
 * This caught a real sign error: the ascent step was running along the
 * descent direction, so the line search accepted nothing and the optimiser
 * silently returned its starting point.
 */
import { figure2Instance, FIG2_W, FIG2_WP, makeInstance } from '../js/election.js';
import { harmonicEntropyValue, uniformPaymentSystem, totalEntropy, checkConditions } from '../js/payments.js';

let fails = 0;
const chk = (name, got, want, tol = 1e-6) => {
  const ok = Math.abs(got - want) < tol;
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: got ${got.toFixed(9)}  want ${want.toFixed(9)}`);
};

const inst = figure2Instance();

console.log('--- V_L against the exact rational LP (Figure 2 instance) ---');
const REF = [
  ['W',  FIG2_W,  3,  4.675396825396825],
  ['W\'', FIG2_WP, 3,  4.958730158730159],
  ['W',  FIG2_W,  8,  6.077034077034077],
  ['W\'', FIG2_WP, 8,  6.356759906759907],
  ['W',  FIG2_W,  20, 6.867159362376853],
  ['W\'', FIG2_WP, 20, 7.128381956208122],
];
for (const [name, W, L, want] of REF) {
  chk(`V_${L}(${name})`, harmonicEntropyValue(inst, W, { truncation: L, iters: 900 }).value, want);
}

console.log('--- V_L on a second, denser instance ---');
const inst2 = makeInstance({
  voters: ['a', 'b', 'c', 'd', 'e'],
  candidates: ['0', '1', '2', '3', '4', '5'],
  approvals: [[0, 1, 2], [0, 1, 3], [2, 3, 4], [1, 4, 5], [0, 5]],
  k: 3, quota: 'hare',
});
chk('V_5({0,1,4})',  harmonicEntropyValue(inst2, [0, 1, 4], { truncation: 5,  iters: 900 }).value, 5.238095238095238);
chk('V_15({0,1,4})', harmonicEntropyValue(inst2, [0, 1, 4], { truncation: 15, iters: 900 }).value, 6.011029411764706);

console.log('--- sanity properties of the untruncated optimiser ---');
for (const [name, W] of [['W', FIG2_W], ["W'", FIG2_WP]]) {
  const res = harmonicEntropyValue(inst, W);
  const cond = checkConditions(inst, W, res.system);
  const ok = cond.P1 && cond.P2 && cond.P4;
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: optimiser output lies in P124`);
  // V(W) must be at least the value of any feasible system we can name.
  const u = uniformPaymentSystem(inst, W);
  const uCond = checkConditions(inst, W, u);
  if (uCond.P1 && uCond.P2 && uCond.P4) {
    const good = res.value >= totalEntropy(inst, u) - 1e-6;
    if (!good) fails++;
    console.log(`${good ? 'PASS' : 'FAIL'}  ${name}: V >= uniform-system value`);
  }
  // V_L increases with L and stays below V.
  const v5 = harmonicEntropyValue(inst, W, { truncation: 5, iters: 900 }).value;
  const v40 = harmonicEntropyValue(inst, W, { truncation: 40, iters: 900 }).value;
  const mono = v5 < v40 && v40 < res.value + 1e-6;
  if (!mono) fails++;
  console.log(`${mono ? 'PASS' : 'FAIL'}  ${name}: V_5 < V_40 <= V  (${v5.toFixed(4)} < ${v40.toFixed(4)} <= ${res.value.toFixed(4)})`);
}

console.log(fails === 0 ? '\nALL TESTS PASSED' : `\n${fails} FAILURE(S)`);
process.exit(fails === 0 ? 0 : 1);
