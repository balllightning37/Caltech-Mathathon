/**
 * Approval-based committee elections: instances, utilities, PAV, and the
 * core. Section 2 and Section 3 of the paper.
 */

import { H } from './math-core.js';

/**
 * An instance I = (A, k): an approval profile plus a committee size.
 * `approvals[i]` is the set A_i of candidates voter i approves, as an
 * array of candidate indices.
 */
export function makeInstance({ voters, candidates, approvals, k, quota = 'hare' }) {
  const n = voters.length;
  const m = candidates.length;
  const sets = approvals.map((a) => new Set(a));
  const q = quota === 'hare' ? n / k : quota === 'droop' ? n / (k + 1) : quota;
  return {
    voters, candidates, approvals, sets, n, m, k, q, quotaKind: quota,
    /** N_c = { i : c in A_i }, the supporters of candidate c. */
    supporters: candidates.map((_, c) => voters.map((_, i) => i).filter((i) => sets[i].has(c))),
  };
}

/** u_i(W) = |A_i intersect W|, the number of approved candidates in W. */
export function utility(inst, i, W) {
  let u = 0;
  for (const c of W) if (inst.sets[i].has(c)) u++;
  return u;
}

export function utilities(inst, W) {
  return inst.voters.map((_, i) => utility(inst, i, W));
}

/** PAV(W) = sum_i H_{u_i(W)}. */
export function pavScore(inst, W) {
  return utilities(inst, W).reduce((s, u) => s + H(u), 0);
}

/** Approved winners A_i intersect W, as an array of candidate indices. */
export function approvedWinners(inst, i, W) {
  return [...W].filter((c) => inst.sets[i].has(c)).sort((a, b) => a - b);
}

/**
 * Does coalition S block W with proposal T?  Requires |S| >= q|T| and
 * u_i(T) >= u_i(W) + 1 for every i in S  (conditions of Section 3).
 */
export function blocks(inst, S, T, W) {
  const affordable = S.length >= inst.q * T.length - 1e-9;
  const strict = S.every((i) => utility(inst, i, T) >= utility(inst, i, W) + 1);
  return { affordable, strict, blocking: affordable && strict && S.length > 0 };
}

/**
 * Exhaustive core check. For each proposal T, the largest useful coalition
 * is exactly the set of voters who strictly improve, so it suffices to
 * enumerate proposals and derive S from T.
 *
 * Exponential in m, so only for the small illustrative instances here.
 */
export function findCoreViolation(inst, W) {
  const Wset = new Set(W);
  const m = inst.m;
  if (m > 22) throw new Error('instance too large for exhaustive core check');
  let best = null;
  for (let mask = 1; mask < (1 << m); mask++) {
    const T = [];
    for (let c = 0; c < m; c++) if (mask & (1 << c)) T.push(c);
    const S = [];
    for (let i = 0; i < inst.n; i++) {
      if (utility(inst, i, T) >= utility(inst, i, Wset) + 1) S.push(i);
    }
    if (S.length === 0) continue;
    if (S.length >= inst.q * T.length - 1e-9) {
      // Prefer the smallest witness, for legibility.
      if (!best || T.length < best.T.length || (T.length === best.T.length && S.length < best.S.length)) {
        best = { S, T };
      }
    }
  }
  return best; // null means W is in the core
}

export function inCore(inst, W) {
  return findCoreViolation(inst, W) === null;
}

/** All committees of size exactly k, as arrays of candidate indices. */
export function* committeesOfSize(m, k) {
  const idx = Array.from({ length: k }, (_, j) => j);
  if (k > m) return;
  while (true) {
    yield idx.slice();
    let j = k - 1;
    while (j >= 0 && idx[j] === m - k + j) j--;
    if (j < 0) return;
    idx[j]++;
    for (let l = j + 1; l < k; l++) idx[l] = idx[l - 1] + 1;
  }
}

/** Committees maximising PAV (all of them, to expose ties). */
export function pavWinners(inst) {
  let best = -Infinity, winners = [];
  for (const W of committeesOfSize(inst.m, inst.k)) {
    const s = pavScore(inst, W);
    if (s > best + 1e-9) { best = s; winners = [W]; }
    else if (Math.abs(s - best) < 1e-9) winners.push(W);
  }
  return { best, winners };
}

/**
 * The instance of Figure 2: four voters, k = 8, Hare quota q = 1/2.
 * v1 and v2 share c1, c2 and each have a private candidate (c3, c4);
 * v3 and v4 jointly approve the block c5..c10.
 *
 * W = {c1,c2,c5..c10} maximises PAV but is blocked by {v1,v2} proposing
 * {c1,c2,c3,c4}.
 */
export function figure2Instance() {
  const candidates = ['c1','c2','c3','c4','c5','c6','c7','c8','c9','c10'];
  return makeInstance({
    voters: ['v1','v2','v3','v4'],
    candidates,
    approvals: [
      [0, 1, 2],              // v1: c1 c2 c3
      [0, 1, 3],              // v2: c1 c2 c4
      [4, 5, 6, 7, 8, 9],     // v3: c5..c10
      [4, 5, 6, 7, 8, 9],     // v4: c5..c10
    ],
    k: 8,
    quota: 'hare',
  });
}

/** W from Figure 2: the PAV-optimal committee that fails the core. */
export const FIG2_W  = [0, 1, 4, 5, 6, 7, 8, 9];
/** W' from Figure 2: PAV-tied, but satisfies (P1)-(P4). */
export const FIG2_WP = [0, 1, 2, 4, 5, 6, 7, 8];
