import {
  figure2Instance, FIG2_W, FIG2_WP, utilities, pavScore,
  findCoreViolation, inCore, pavWinners,
} from '../docs/js/election.js';
import {
  uniformPaymentSystem, checkConditions, receives, reserveBehind,
  totalEntropy, harmonicEntropyValue, paymentShape,
} from '../docs/js/payments.js';
import { H } from '../docs/js/math-core.js';

let fails = 0;
const chk = (name, got, want, tol = 1e-9) => {
  const ok = typeof want === 'boolean' ? got === want : Math.abs(got - want) < tol;
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: got ${got}  want ${want}`);
};
const nm = (inst, arr) => arr.map((c) => inst.candidates[c]).join(',');

const inst = figure2Instance();

console.log('--- Section 2: the Figure 2 instance ---');
chk('n', inst.n, 4);
chk('m', inst.m, 10);
chk('k', inst.k, 8);
chk('Hare quota q = n/k', inst.q, 1 / 2);
console.log(`      supporters(c1) = ${inst.supporters[0].map(i => inst.voters[i])}`);
console.log(`      supporters(c5) = ${inst.supporters[4].map(i => inst.voters[i])}`);

console.log('--- utilities u_i(W), W = {c1,c2,c5..c10} ---');
const uW = utilities(inst, FIG2_W);
chk('u(v1)', uW[0], 2); chk('u(v2)', uW[1], 2);
chk('u(v3)', uW[2], 6); chk('u(v4)', uW[3], 6);

console.log('--- paper: W maximises PAV, and PAV(W) = PAV(W_prime) ---');
chk('PAV(W)', pavScore(inst, FIG2_W), 2 * H(2) + 2 * H(6));
chk('PAV(W_prime)', pavScore(inst, FIG2_WP), H(3) + H(2) + 2 * H(5));
chk('PAV ties W and W_prime', Math.abs(pavScore(inst, FIG2_W) - pavScore(inst, FIG2_WP)) < 1e-12, true);
const pw = pavWinners(inst);
chk('W is PAV-optimal', pw.winners.some(W => W.join() === FIG2_W.join()), true);
chk('W_prime is PAV-optimal', pw.winners.some(W => W.join() === FIG2_WP.join()), true);
console.log(`      PAV optimum = ${pw.best.toFixed(6)} attained by ${pw.winners.length} committees`);

console.log('--- paper: W is NOT in the core; witness S={v1,v2}, T={c1,c2,c3,c4} ---');
const viol = findCoreViolation(inst, FIG2_W);
chk('W blocked', viol !== null, true);
if (viol) {
  console.log(`      S = {${viol.S.map(i => inst.voters[i])}}   T = {${nm(inst, viol.T)}}`);
  console.log(`      |S| = ${viol.S.length},  q|T| = ${inst.q * viol.T.length}`);
  chk('utility of v1 rises 2 -> 3', utilities(inst, viol.T)[0], 3);
}

console.log('--- paper: uniform payments on W overcharge c1, c2 (2/3 > q) ---');
const psU = uniformPaymentSystem(inst, FIG2_W);
chk('r(v1) = 1/(u+1) = 1/3', psU.r[0], 1 / 3);
chk('c1 receives 2/3', receives(inst, psU, 0), 2 / 3);
chk('c2 receives 2/3', receives(inst, psU, 1), 2 / 3);
const cU = checkConditions(inst, FIG2_W, psU);
chk('(P1) holds', cU.P1, true);
chk('(P2) holds', cU.P2, true);
chk('(P3) holds  [Thm 4.1: PAV optimum satisfies P3]', cU.P3, true);
chk('(P4) FAILS', cU.P4, false);
console.log(`      (P4) witnesses: ${cU.witnesses.P4.map(w => `${inst.candidates[w.c]}=${w.sum.toFixed(4)}`).join(' ')}`);

console.log('--- Thm 4.1(a): PAV(W + c) - PAV(W) = sum_{i in N_c} r_i ---');
for (const c of [2, 3, 9]) {
  const gain = pavScore(inst, [...FIG2_W, c]) - pavScore(inst, FIG2_W);
  chk(`c = ${inst.candidates[c]}`, gain, reserveBehind(inst, psU, c));
}

console.log('--- paper: the explicit payment system for W_prime satisfies (P1)-(P4) ---');
// (r1,p1) = (3/10, 1/5, 1/5, 3/10) with 3/10 paid to c3;
// (r2,p2) = (2/5, 3/10, 3/10); v3, v4 split uniformly over reserve + c5..c9.
const shape = paymentShape(inst, FIG2_WP);
console.log(`      shape: ${shape.map((cs, i) => inst.voters[i] + '->[' + nm(inst, cs) + ']').join('  ')}`);
const psP = {
  r: [3 / 10, 2 / 5, 1 / 6, 1 / 6],
  p: [
    new Map([[0, 1 / 5], [1, 1 / 5], [2, 3 / 10]]),
    new Map([[0, 3 / 10], [1, 3 / 10]]),
    new Map([4, 5, 6, 7, 8].map((c) => [c, 1 / 6])),
    new Map([4, 5, 6, 7, 8].map((c) => [c, 1 / 6])),
  ],
  shape,
};
const cP = checkConditions(inst, FIG2_WP, psP);
chk('(P1)', cP.P1, true);
chk('(P2)', cP.P2, true);
chk('(P3)', cP.P3, true);
chk('(P4)', cP.P4, true);
chk('c1 receives exactly q', receives(inst, psP, 0), 1 / 2);
chk('c2 receives exactly q', receives(inst, psP, 1), 1 / 2);
chk('reserve behind loser c4', reserveBehind(inst, psP, 3), 2 / 5);
chk('reserve behind loser c10', reserveBehind(inst, psP, 9), 1 / 3);
chk('W_prime is in the core', inCore(inst, FIG2_WP), true);

console.log('--- Prop 6.7 / Thm 3.2 consistency: V(W) via P124 optimiser ---');
const vW = harmonicEntropyValue(inst, FIG2_W);
const vWP = harmonicEntropyValue(inst, FIG2_WP);
console.log(`      V(W)       = ${vW.value.toFixed(6)}`);
console.log(`      V(W_prime) = ${vWP.value.toFixed(6)}`);
chk('optimiser output for W is in P124', (() => {
  const c = checkConditions(inst, FIG2_W, vW.system);
  return c.P1 && c.P2 && c.P4;
})(), true);
chk('optimiser output for W_prime is in P124', (() => {
  const c = checkConditions(inst, FIG2_WP, vWP.system);
  return c.P1 && c.P2 && c.P4;
})(), true);
chk('V >= uniform-system entropy (W_prime)', vWP.value >= totalEntropy(inst, psP) - 1e-6, true);
// Theorem 6.5: the harmonic entropy rule picks core+ committees, so the
// optimal system for W_prime should satisfy (P3) while W's cannot.
const p3WP = checkConditions(inst, FIG2_WP, vWP.system).P3;
chk('optimal system for W_prime satisfies (P3)', p3WP, true);
chk('V(W_prime) > V(W)  [HE rule separates what PAV ties]', vWP.value > vW.value + 1e-6, true);

console.log(fails === 0 ? '\nALL TESTS PASSED' : `\n${fails} FAILURE(S)`);
process.exit(fails === 0 ? 0 : 1);
