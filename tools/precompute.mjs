/**
 * Precompute the data the final figure needs, so the page stays fast:
 *
 *  - the full landscape of all C(10,8) = 45 committees, with V(W), PAV(W),
 *    whether W is in the core, and whether its optimal payment system
 *    satisfies (P3)
 *  - a worked instance of the add-then-delete swap argument of Section 6
 *
 * Run: node tools/precompute.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import {
  figure2Instance, committeesOfSize, pavScore, inCore, FIG2_W, utilities,
} from '../js/election.js';
import {
  harmonicEntropyValue, checkConditions, uniformPaymentSystem, reserveBehind,
} from '../js/payments.js';

const inst = figure2Instance();
const name = (W) => W.map((c) => inst.candidates[c]).join(' ');

console.log('computing landscape...');
const landscape = [];
for (const W of committeesOfSize(inst.m, inst.k)) {
  const { value, system } = harmonicEntropyValue(inst, W);
  const cond = checkConditions(inst, W, system);
  landscape.push({
    W,
    label: name(W),
    V: value,
    pav: pavScore(inst, W),
    core: inCore(inst, W),
    P3: cond.P3,
    u: utilities(inst, W),
  });
  process.stdout.write('.');
}
console.log('');

const maxV = Math.max(...landscape.map((r) => r.V));
const maxPav = Math.max(...landscape.map((r) => r.pav));

/* ---- the swap argument, worked on the committee that fails the core ---- */
console.log('computing the swap argument...');
const W0 = FIG2_W;
const psU = uniformPaymentSystem(inst, W0);
const vW0 = harmonicEntropyValue(inst, W0);
const condW0 = checkConditions(inst, W0, vW0.system);

// The loser that witnesses the failure of (P3) under the *optimal* system.
const witnesses = inst.candidates
  .map((_, c) => c)
  .filter((c) => !W0.includes(c))
  .map((c) => ({ c, label: inst.candidates[c], sum: reserveBehind(inst, vW0.system, c) }))
  .sort((a, b) => b.sum - a.sum);

const cStar = witnesses[0];
const Wplus = [...W0, cStar.c].sort((a, b) => a - b);
const vPlus = harmonicEntropyValue(inst, Wplus);

const deletions = Wplus.map((d) => {
  const Wd = Wplus.filter((e) => e !== d);
  const { value } = harmonicEntropyValue(inst, Wd);
  return { d, label: inst.candidates[d], W: Wd, V: value, drop: vPlus.value - value };
}).sort((a, b) => a.drop - b.drop);

const eps = inst.q - inst.n / (inst.k + 1);

const out = {
  instance: {
    voters: inst.voters, candidates: inst.candidates, approvals: inst.approvals,
    n: inst.n, m: inst.m, k: inst.k, q: inst.q,
    eps, nOverKPlus1: inst.n / (inst.k + 1),
  },
  landscape, maxV, maxPav,
  swap: {
    W: W0, labelW: name(W0),
    V_W: vW0.value,
    uniformReserve: inst.candidates.map((_, c) => reserveBehind(inst, psU, c)),
    optimalReserve: inst.candidates.map((_, c) => reserveBehind(inst, vW0.system, c)),
    P3_W: condW0.P3,
    witnesses,
    cStar,
    Wplus, labelWplus: name(Wplus),
    V_Wplus: vPlus.value,
    gain: vPlus.value - vW0.value,
    deletions,
    best: deletions[0],
  },
};

mkdirSync('data', { recursive: true });
writeFileSync('data/landscape.json', JSON.stringify(out, null, 1));

console.log(`\nwrote data/landscape.json  (${landscape.length} committees)`);
console.log(`max V   = ${maxV.toFixed(6)}`);
console.log(`max PAV = ${maxPav.toFixed(6)}`);
console.log(`\nswap argument on W = {${name(W0)}}:`);
console.log(`  V(W)            = ${vW0.value.toFixed(6)}`);
console.log(`  (P3) under the optimal system: ${condW0.P3 ? 'holds' : 'VIOLATED'}`);
console.log(`  worst loser      = ${cStar.label} with reserve ${cStar.sum.toFixed(6)} vs q = ${inst.q}`);
console.log(`  V(W + ${cStar.label})       = ${vPlus.value.toFixed(6)}  (gain ${(vPlus.value - vW0.value).toFixed(6)} >= q = ${inst.q})`);
console.log(`  cheapest deletion = ${deletions[0].label}, drop ${deletions[0].drop.toFixed(6)} <= n/(k+1) = ${(inst.n / (inst.k + 1)).toFixed(6)}`);
console.log(`  net              = ${(deletions[0].V - vW0.value).toFixed(6)}  (needs > eps = ${eps.toFixed(6)})`);
console.log(`  V-max committees in core: ${landscape.filter(r => r.V > maxV - 1e-6).every(r => r.core)}`);
