/**
 * Empirical check of the paper's main line of argument on the Figure 2
 * instance: enumerate all 45 committees of size k = 8, compute V(W) for
 * each, and verify that
 *
 *   - every V-maximising committee is in the core      (Theorem 6.5)
 *   - every V-maximising committee admits a payment
 *     system satisfying (P1)-(P4)                      (Theorem 3.2)
 *   - PAV-optimal committees need neither              (Figure 2)
 */
import { figure2Instance, committeesOfSize, pavScore, inCore } from '../js/election.js';
import { harmonicEntropyValue, checkConditions } from '../js/payments.js';

const inst = figure2Instance();
const nm = (W) => W.map((c) => inst.candidates[c]).join(' ');

const rows = [];
for (const W of committeesOfSize(inst.m, inst.k)) {
  const { value, system } = harmonicEntropyValue(inst, W);
  const cond = checkConditions(inst, W, system);
  rows.push({ W, V: value, pav: pavScore(inst, W), core: inCore(inst, W), P3: cond.P3 });
}

const maxV = Math.max(...rows.map((r) => r.V));
const maxPav = Math.max(...rows.map((r) => r.pav));
const heWinners = rows.filter((r) => r.V > maxV - 1e-6);
const pavW = rows.filter((r) => r.pav > maxPav - 1e-9);

console.log(`committees enumerated: ${rows.length}`);
console.log(`max V   = ${maxV.toFixed(6)}  attained by ${heWinners.length}`);
console.log(`max PAV = ${maxPav.toFixed(6)}  attained by ${pavW.length}`);

console.log('\ntop 6 by V:');
rows.slice().sort((a, b) => b.V - a.V).slice(0, 6).forEach((r) => {
  console.log(`  V=${r.V.toFixed(5)}  PAV=${r.pav.toFixed(4)}  core=${r.core ? 'yes' : 'NO '}  P3=${r.P3 ? 'yes' : 'NO '}  ${nm(r.W)}`);
});

console.log('\nPAV winners:');
pavW.forEach((r) => {
  console.log(`  V=${r.V.toFixed(5)}  core=${r.core ? 'yes' : 'NO '}  ${nm(r.W)}`);
});

let fails = 0;
const chk = (name, cond) => { if (!cond) fails++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`); };

console.log('');
chk('every V-maximising committee is in the core (Thm 6.5)', heWinners.every((r) => r.core));
chk('every V-maximising committee satisfies (P3) (Thm 3.2)', heWinners.every((r) => r.P3));
chk('some PAV-optimal committee is NOT in the core (Figure 2)', pavW.some((r) => !r.core));
chk('V is not maximised by every PAV winner', pavW.some((r) => r.V < maxV - 1e-6));

console.log(fails === 0 ? '\nALL TESTS PASSED' : `\n${fails} FAILURE(S)`);
process.exit(fails === 0 ? 0 : 1);
