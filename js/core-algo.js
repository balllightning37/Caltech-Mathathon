/**
 * The carried-target core algorithm, in the browser.
 *
 * This mirrors the structure of core_algorithm.py (the exact reference
 * implementation): degree preprocessing, then a repair loop that detects a
 * (P3) violation, adds the offending loser, de-reserves, and deletes the
 * cheapest committee member.
 *
 * One deliberate difference: the reference solves an exact rational LP for
 * the truncated objective V_L with z3. Here the payment optimisation is the
 * projected-gradient solver in payments.js, which works on F itself in
 * floating point. It is validated against the exact LP in
 * tests/optimiser.test.mjs. Every certificate this module returns is
 * checked before it is reported, so a numerical slip surfaces as a failed
 * check rather than a wrong answer.
 */

import { harmonicEntropyValue, paymentShape } from './payments.js';
import { utility } from './election.js';

const TOL = 1e-9;

/** Supporters of c who are also relevant, as a plain array. */
const supportersOf = (inst, c) => inst.supporters[c];

/** Total reserve held behind candidate c. */
export function reserveBehind(inst, reserves, c) {
  let s = 0;
  for (const i of supportersOf(inst, c)) s += reserves[i];
  return s;
}

/** Total payments collected by candidate c. */
export function collected(inst, payments, c) {
  let s = 0;
  for (const i of supportersOf(inst, c)) s += payments[i].get(c) ?? 0;
  return s;
}

/**
 * The truncation level the reference implementation would use:
 * L = ceil(sqrt(2U/delta)) with U an upper bound on sum_i u_i(W).
 * Reported for comparison only; the browser solver does not truncate.
 */
export function truncationLevel(inst, candidates) {
  const { n, k, q } = inst;
  const delta = q - n / (k + 1);
  if (delta <= 0) return Infinity;
  const cs = new Set(candidates);
  let incidences = 0;
  for (let i = 0; i < n; i++) {
    for (const c of cs) if (inst.sets[i].has(c)) incidences++;
  }
  const U = Math.min(incidences, n * k);
  return Math.max(1, Math.ceil(Math.sqrt((2 * U) / delta)));
}

/**
 * Degree preprocessing. A candidate approved by fewer than q voters can
 * never hold q in reserve, because every reserve is at most 1. So if at most
 * k candidates clear that bar, electing all of them (and filling the rest
 * arbitrarily) is certified by the all-reserve payment system.
 */
export function preprocess(inst) {
  const { n, m, k, q } = inst;
  const high = [];
  for (let c = 0; c < m; c++) if (inst.supporters[c].length >= q) high.push(c);
  if (high.length <= k) {
    const W = new Set(high);
    for (let c = 0; c < m && W.size < k; c++) W.add(c);
    const shape = paymentShape(inst, [...W]);
    return {
      shortcut: true,
      high,
      committee: [...W].sort((a, b) => a - b),
      system: {
        r: Array.from({ length: n }, () => 1),
        p: shape.map((cs) => new Map(cs.map((c) => [c, 0]))),
        shape,
      },
    };
  }
  return { shortcut: false, high };
}

/**
 * De-reservation: every voter with reserve left who approves an unsaturated
 * winner pours that reserve into those winners at unit rate. A stage ends
 * when a voter's reserve hits zero or a winner reaches the cap q.
 *
 * Returns the de-reserved system plus the stage-by-stage trace.
 */
export function dereserve(inst, X, reserves, payments) {
  const q = inst.q;
  const Xa = [...X];
  const r = reserves.slice();
  const p = payments.map((mp) => new Map(mp));
  const stages = [];

  for (let guard = 0; guard < inst.n + Xa.length + 5; guard++) {
    const totals = {};
    for (const c of Xa) totals[c] = collected(inst, p, c);
    const unsat = new Set(Xa.filter((c) => totals[c] < q - TOL));

    const active = [];
    const width = {};
    for (let i = 0; i < inst.n; i++) {
      if (r[i] <= TOL) continue;
      let w = 0;
      for (const c of unsat) if (inst.sets[i].has(c)) w++;
      if (w > 0) { active.push(i); width[i] = w; }
    }
    if (active.length === 0) break;

    // Time to the next event.
    let theta = Infinity, cause = null;
    for (const i of active) {
      const t = r[i] / width[i];
      if (t < theta) { theta = t; cause = `reserve of ${inst.voters[i]} runs out`; }
    }
    for (const c of unsat) {
      let demand = 0;
      for (const i of active) if (inst.sets[i].has(c)) demand++;
      if (demand === 0) continue;
      const t = (q - totals[c]) / demand;
      if (t < theta) { theta = t; cause = `${inst.candidates[c]} reaches the cap q`; }
    }
    if (!isFinite(theta) || theta <= 0) break;

    for (const i of active) {
      for (const c of unsat) {
        if (inst.sets[i].has(c)) p[i].set(c, (p[i].get(c) ?? 0) + theta);
      }
      r[i] -= theta * width[i];
      if (r[i] < TOL) r[i] = 0;
    }
    stages.push({
      theta, cause,
      active: active.slice(),
      unsaturated: [...unsat],
      reserves: r.slice(),
      // A snapshot, so a step-through can animate the payments filling up.
      payments: p.map((mp) => new Map(mp)),
    });
  }

  return { r, p, stages };
}

/**
 * One repair round: given W and a (P3)-violating loser c, add c, optimise,
 * de-reserve, and delete the member with the smallest de-reserved total.
 */
export function repairRound(inst, W, c, optimise) {
  const X = [...new Set([...W, c])].sort((a, b) => a - b);
  const opt = optimise(X);

  const der = dereserve(inst, X, opt.system.r, opt.system.p);

  const totals = {};
  for (const d of X) totals[d] = collected(inst, der.p, d);
  let d = X[0];
  for (const cand of X) if (totals[cand] < totals[d] - 1e-12) d = cand;

  const Wn = X.filter((x) => x !== d);
  const shapeN = paymentShape(inst, Wn);
  const r2 = new Array(inst.n).fill(0);
  const p2 = shapeN.map(() => new Map());

  for (let i = 0; i < inst.n; i++) {
    const inNd = inst.sets[i].has(d);
    // For a supporter of d, her payment to d becomes her new reserve.
    // Everyone else keeps the payment system the optimiser produced.
    const srcR = inNd ? der.r : opt.system.r;
    const srcP = inNd ? der.p : opt.system.p;
    r2[i] = inNd ? (der.p[i].get(d) ?? 0) : srcR[i];
    for (const cc of shapeN[i]) p2[i].set(cc, srcP[i].get(cc) ?? 0);
  }

  return {
    X, d, totals,
    added: c,
    optimised: opt,
    dereserved: der,
    committee: Wn,
    system: { r: r2, p: p2, shape: shapeN },
  };
}

/** Verify (P1)-(P4) numerically; returns a list of human-readable failures. */
export function verify(inst, W, system, tol = 1e-7) {
  const Wset = new Set(W);
  const bad = [];
  for (let i = 0; i < inst.n; i++) {
    let spent = 0;
    for (const [c, v] of system.p[i]) {
      spent += v;
      if (v < -tol) bad.push(`(P1) negative payment ${inst.voters[i]}→${inst.candidates[c]}`);
      if (v > system.r[i] + tol) {
        bad.push(`(P2) ${inst.voters[i]}→${inst.candidates[c]} pays ${v.toFixed(4)} > reserve ${system.r[i].toFixed(4)}`);
      }
    }
    if (Math.abs(system.r[i] + spent - 1) > tol) {
      bad.push(`(P1) ${inst.voters[i]} budget ${(system.r[i] + spent).toFixed(6)} ≠ 1`);
    }
  }
  for (let c = 0; c < inst.m; c++) {
    if (Wset.has(c)) {
      const got = collected(inst, system.p, c);
      if (got > inst.q + tol) bad.push(`(P4) ${inst.candidates[c]} collects ${got.toFixed(4)} > q`);
    } else {
      const held = reserveBehind(inst, system.r, c);
      if (held >= inst.q - tol) bad.push(`(P3) ${inst.candidates[c]} has ${held.toFixed(4)} ≥ q in reserve`);
    }
  }
  return bad;
}

/**
 * The full algorithm. Returns the committee, the certificate, and a trace
 * with one entry per repair round for the step-through display.
 */
export function fastCore(inst, { maxRounds = 40 } = {}) {
  const pre = preprocess(inst);
  if (pre.shortcut) {
    return {
      shortcut: true,
      committee: pre.committee,
      system: pre.system,
      rounds: [],
      solves: 0,
      L: 0,
      high: pre.high,
      failures: verify(inst, pre.committee, pre.system),
    };
  }

  const candidates = pre.high;
  const L = truncationLevel(inst, candidates);
  let solves = 0;
  const optimise = (X) => {
    solves++;
    // The tiny reserve penalty approximates the "minimum total reserve
    // among maximisers" tie-break that Lemma 6.4 requires.
    return harmonicEntropyValue(inst, X, { reservePenalty: 1e-6, iters: 400 });
  };

  let W = candidates.slice(0, inst.k).sort((a, b) => a - b);
  // Start from the all-reserve system, which is always feasible.
  let shape = paymentShape(inst, W);
  let system = {
    r: Array.from({ length: inst.n }, () => 1),
    p: shape.map((cs) => new Map(cs.map((c) => [c, 0]))),
    shape,
  };

  const rounds = [];
  for (let round = 0; round < maxRounds; round++) {
    const losers = [];
    for (const c of candidates) {
      if (W.includes(c)) continue;
      losers.push({ c, held: reserveBehind(inst, system.r, c) });
    }
    const violations = losers.filter((x) => x.held >= inst.q - 1e-9);

    if (violations.length === 0) {
      return {
        shortcut: false, committee: W, system, rounds, solves, L,
        high: candidates, losers,
        failures: verify(inst, W, system),
      };
    }

    // Prefer the violator whose supporters hold the least committee
    // utility: the reference implementation's tie-break.
    let pick = violations[0];
    let bestKey = Infinity;
    for (const v of violations) {
      let key = 0;
      for (const i of supportersOf(inst, v.c)) key += utility(inst, i, W);
      if (key < bestKey) { bestKey = key; pick = v; }
    }

    const before = { committee: W, system, losers, violations: violations.map((v) => v.c) };
    const res = repairRound(inst, W, pick.c, optimise);
    rounds.push({ ...res, before, index: rounds.length + 1 });
    W = res.committee;
    system = res.system;
  }

  return {
    shortcut: false, committee: W, system, rounds, solves, L,
    high: candidates, losers: [],
    failures: ['round limit reached before a certificate was found'],
    exhausted: true,
  };
}

/** The neighbourhood size the paper's local search scans per round. */
export const neighbourhoodSize = (inst) => inst.k * (inst.m - inst.k) + 1;
