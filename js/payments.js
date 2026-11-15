/**
 * Payment systems (r, p) and the harmonic entropy value V(W).
 * Sections 3, 4 and 6 of the paper.
 *
 * A payment system assigns voter i a reserve r_i and a payment p_ic for
 * each approved winner c in A_i intersect W. Conditions:
 *
 *   (P1) r_i + sum_c p_ic = 1                   unit budget
 *   (P2) r_i >= p_ic                            reserve backs every payment
 *   (P3) sum_{i in N_c} r_i  <  q   for losers  c not in W
 *   (P4) sum_{i in N_c} p_ic <= q   for winners c in W
 */

import {
  harmonicEntropy, harmonicEntropyGradient, harmonicEntropySeries, dropZeros,
} from './math-core.js';
import { approvedWinners } from './election.js';

const TOL = 1e-7;

/**
 * Build the shape of a payment system for committee W: which voters pay
 * which winners. Payments are stored as a Map per voter.
 */
export function paymentShape(inst, W) {
  const Wset = new Set(W);
  return inst.voters.map((_, i) => approvedWinners(inst, i, Wset));
}

/**
 * The uniform payment system (3): each voter splits her unit budget
 * equally between her reserve and her u_i(W) approved winners.
 * This is the payment system implicitly used by PAV.
 */
export function uniformPaymentSystem(inst, W) {
  const shape = paymentShape(inst, W);
  const r = [], p = [];
  shape.forEach((cs, i) => {
    const share = 1 / (cs.length + 1);
    r[i] = share;
    p[i] = new Map(cs.map((c) => [c, share]));
  });
  return { r, p, shape };
}

/** Voter i's payment distribution as a plain vector (reserve first). */
export function distribution(ps, i) {
  return [ps.r[i], ...ps.p[i].values()];
}

/** Total payments received by candidate c: sum_{i in N_c} p_ic. */
export function receives(inst, ps, c) {
  let s = 0;
  for (const i of inst.supporters[c]) s += ps.p[i].get(c) ?? 0;
  return s;
}

/** Total reserve held by c's supporters: sum_{i in N_c} r_i. */
export function reserveBehind(inst, ps, c) {
  let s = 0;
  for (const i of inst.supporters[c]) s += ps.r[i];
  return s;
}

/** Evaluate (P1)-(P4); returns per-condition verdicts and witnesses. */
export function checkConditions(inst, W, ps) {
  const Wset = new Set(W);
  const out = {
    P1: true, P2: true, P3: true, P4: true,
    witnesses: { P1: [], P2: [], P3: [], P4: [] },
  };

  inst.voters.forEach((_, i) => {
    const total = ps.r[i] + [...ps.p[i].values()].reduce((a, b) => a + b, 0);
    if (Math.abs(total - 1) > TOL) { out.P1 = false; out.witnesses.P1.push({ i, total }); }
    for (const [c, v] of ps.p[i]) {
      if (v > ps.r[i] + TOL) { out.P2 = false; out.witnesses.P2.push({ i, c, p: v, r: ps.r[i] }); }
      if (v < -TOL) { out.P1 = false; out.witnesses.P1.push({ i, c, negative: v }); }
    }
  });

  inst.candidates.forEach((_, c) => {
    if (!Wset.has(c)) {
      const s = reserveBehind(inst, ps, c);
      // (P3) is a strict inequality.
      if (s >= inst.q - TOL) { out.P3 = false; out.witnesses.P3.push({ c, sum: s }); }
    } else {
      const s = receives(inst, ps, c);
      if (s > inst.q + TOL) { out.P4 = false; out.witnesses.P4.push({ c, sum: s }); }
    }
  });

  return out;
}

/** Total harmonic entropy sum_i F(r_i, p_i) of a payment system. */
export function totalEntropy(inst, ps) {
  let s = 0;
  inst.voters.forEach((_, i) => { s += harmonicEntropy(distribution(ps, i)).value; });
  return s;
}

/* ---------------------------------------------------------------------- *
 *  V(W) = max over P124(W) of sum_i F(r_i, p_i)
 *
 *  Concave maximisation over a polytope. Solved by projected gradient
 *  ascent, where the projection onto P1 (per-voter simplex), P2 (reserve
 *  is the largest coordinate) and P4 (per-winner cap) is computed by
 *  Dykstra's alternating-projection algorithm.
 * ---------------------------------------------------------------------- */

/** Euclidean projection onto the probability simplex. */
function projSimplex(v) {
  const n = v.length;
  const u = v.slice().sort((a, b) => b - a);
  let css = 0, theta = 0;
  for (let j = 0; j < n; j++) {
    css += u[j];
    const t = (css - 1) / (j + 1);
    if (u[j] - t > 0) theta = t;
  }
  return v.map((x) => Math.max(x - theta, 0));
}

/** Projection onto a halfspace { x : a.x <= b }. */
function projHalfspace(x, idxs, coefs, b) {
  let ax = 0, aa = 0;
  idxs.forEach((j, t) => { ax += coefs[t] * x[j]; aa += coefs[t] * coefs[t]; });
  if (ax <= b + 1e-15 || aa === 0) return x;
  const lam = (ax - b) / aa;
  const y = x.slice();
  idxs.forEach((j, t) => { y[j] -= lam * coefs[t]; });
  return y;
}

/**
 * Flatten a payment system into a single vector. Each voter i occupies a
 * block [r_i, p_i(c_1), ..., p_i(c_d)] of length shape[i].length + 1.
 */
function layout(shape) {
  const offset = [];
  let n = 0;
  shape.forEach((cs, i) => { offset[i] = n; n += cs.length + 1; });
  return { offset, size: n };
}

function toVector(ps, shape, lay) {
  const x = new Float64Array(lay.size);
  shape.forEach((cs, i) => {
    x[lay.offset[i]] = ps.r[i];
    cs.forEach((c, t) => { x[lay.offset[i] + 1 + t] = ps.p[i].get(c) ?? 0; });
  });
  return x;
}

function fromVector(x, shape, lay) {
  const r = [], p = [];
  shape.forEach((cs, i) => {
    r[i] = x[lay.offset[i]];
    p[i] = new Map(cs.map((c, t) => [c, x[lay.offset[i] + 1 + t]]));
  });
  return { r, p, shape };
}

/**
 * Project onto P124 by Dykstra's algorithm over the constraint blocks:
 *  - per-voter: the simplex (P1 together with non-negativity)
 *  - per-voter: each inequality p_ic <= r_i  (P2)
 *  - per-winner: sum_{i in N_c} p_ic <= q    (P4)
 */
function projectP124(x0, inst, W, shape, lay, iters = 200) {
  const Wset = new Set(W);
  const blocks = [];

  shape.forEach((cs, i) => {
    const idxs = Array.from({ length: cs.length + 1 }, (_, t) => lay.offset[i] + t);
    blocks.push({ kind: 'simplex', idxs });
  });
  shape.forEach((cs, i) => {
    cs.forEach((c, t) => {
      blocks.push({
        kind: 'half',
        idxs: [lay.offset[i] + 1 + t, lay.offset[i]],
        coefs: [1, -1],
        b: 0,
      });
    });
  });
  inst.candidates.forEach((_, c) => {
    if (!Wset.has(c)) return;
    const idxs = [], coefs = [];
    for (const i of inst.supporters[c]) {
      const t = shape[i].indexOf(c);
      if (t >= 0) { idxs.push(lay.offset[i] + 1 + t); coefs.push(1); }
    }
    if (idxs.length) blocks.push({ kind: 'half', idxs, coefs, b: inst.q });
  });

  let x = Float64Array.from(x0);
  const corr = blocks.map(() => new Float64Array(lay.size));

  for (let it = 0; it < iters; it++) {
    let moved = 0;
    for (let b = 0; b < blocks.length; b++) {
      const blk = blocks[b];
      const y = Float64Array.from(x);
      for (let j = 0; j < lay.size; j++) y[j] += corr[b][j];

      let z;
      if (blk.kind === 'simplex') {
        const proj = projSimplex(blk.idxs.map((j) => y[j]));
        z = Float64Array.from(y);
        blk.idxs.forEach((j, t) => { z[j] = proj[t]; });
      } else {
        z = Float64Array.from(projHalfspace(Array.from(y), blk.idxs, blk.coefs, blk.b));
      }

      for (let j = 0; j < lay.size; j++) {
        corr[b][j] = y[j] - z[j];
        moved += Math.abs(x[j] - z[j]);
      }
      x = z;
    }
    if (moved < 1e-13) break;
  }
  return x;
}

/**
 * V(W): the largest total harmonic entropy achievable by a payment system
 * in P124(W). Projected gradient ascent with backtracking line search,
 * started from both the uniform system and the all-reserve system.
 */
/**
 * `truncation` evaluates the truncated objective F_L instead of F. It exists
 * so this optimiser can be compared directly against an exact rational LP
 * for V_L (see tests/optimiser.test.mjs); leave it unset for F itself.
 *
 * `reservePenalty` subtracts mu * sum_i r_i from the objective, which
 * approximates the "minimum total reserve among maximisers" tie-break that
 * Lemma 6.4 needs. Keep mu tiny.
 */
export function harmonicEntropyValue(
  inst, W, { iters = 300, truncation = null, reservePenalty = 0 } = {}
) {
  const shape = paymentShape(inst, W);
  const lay = layout(shape);

  const starts = [toVector(uniformPaymentSystem(inst, W), shape, lay)];
  {
    const r = [], p = [];
    shape.forEach((cs, i) => { r[i] = 1; p[i] = new Map(cs.map((c) => [c, 0])); });
    starts.push(toVector({ r, p, shape }, shape, lay));
  }
  // F is concave but not smooth, so projected gradient can stall at a kink.
  // A few deterministic perturbed restarts recover the optimum in practice.
  {
    let seed = 0x2f6e2b1;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    for (let s = 0; s < 6; s++) {
      const r = [], p = [];
      shape.forEach((cs, i) => {
        const w = [rand() + 0.15, ...cs.map(() => rand() + 0.15)];
        const tot = w.reduce((a, b) => a + b, 0);
        const v = w.map((z) => z / tot);
        const mi = v.indexOf(Math.max(...v));
        [v[0], v[mi]] = [v[mi], v[0]];
        r[i] = v[0];
        p[i] = new Map(cs.map((c, t) => [c, v[t + 1]]));
      });
      starts.push(toVector({ r, p, shape }, shape, lay));
    }
  }

  const blockOf = (x, i, cs) => {
    const d = [];
    for (let t = 0; t <= cs.length; t++) d.push(x[lay.offset[i] + t]);
    return d;
  };

  const scoreOf = truncation
    ? (d) => harmonicEntropySeries(d, truncation)
    : (d) => harmonicEntropy(d).value;

  const objective = (x) => {
    let s = 0;
    shape.forEach((cs, i) => { s += scoreOf(dropZeros(blockOf(x, i, cs))); });
    if (reservePenalty) {
      shape.forEach((cs, i) => { s -= reservePenalty * x[lay.offset[i]]; });
    }
    return s;
  };

  const gradient = (x) => {
    const g = new Float64Array(lay.size);
    shape.forEach((cs, i) => {
      const d = blockOf(x, i, cs);
      // Gradient of the series form, restricted to the positive support.
      const keep = d.map((v, t) => [v, t]).filter(([v]) => v > 1e-12);
      const gsub = harmonicEntropyGradient(keep.map(([v]) => v), truncation || 300);
      keep.forEach(([, t], s) => { g[lay.offset[i] + t] = gsub[s]; });
    });
    if (reservePenalty) {
      shape.forEach((cs, i) => { g[lay.offset[i]] -= reservePenalty; });
    }
    return g;
  };

  let bestVal = -Infinity, bestX = null;

  for (const x0 of starts) {
    let x = projectP124(x0, inst, W, shape, lay);
    let val = objective(x);
    let step = 0.25;
    for (let it = 0; it < iters; it++) {
      const g = gradient(x);
      let improved = false;
      for (let ls = 0; ls < 26; ls++) {
        const y = new Float64Array(lay.size);
        // `gradient` returns grad(sum_i F), so ascent moves along +g.
        for (let j = 0; j < lay.size; j++) y[j] = x[j] + step * g[j];
        const yp = projectP124(y, inst, W, shape, lay, 120);
        const v = objective(yp);
        if (v > val + 1e-13) { x = yp; val = v; improved = true; step *= 1.35; break; }
        step *= 0.5;
      }
      if (!improved || step < 1e-12) break;
    }

    /*
     * F is concave but piecewise linear in places, so a gradient step can
     * stall at a kink even though the point is not optimal: the subgradient
     * direction simply is not improving there. Polish by moving mass
     * directly between two coordinates of one voter, which is the move a
     * kink blocks. Without this, two committees that are isomorphic under a
     * symmetry of the instance can report different values of V.
     *
     * Such a transfer keeps that voter's block summing to 1, so (P1) holds
     * for free and feasibility can be checked in closed form — no
     * projection, which is what makes the polish affordable.
     */
    {
      // Running per-winner totals, for the (P4) cap.
      const total = new Map();
      for (const c of W) total.set(c, 0);
      shape.forEach((cs, i) => cs.forEach((c, t) => {
        total.set(c, total.get(c) + x[lay.offset[i] + 1 + t]);
      }));

      // F decomposes over voters, so only the touched voter is re-scored.
      const blockScore = (vec, i) => scoreOf(dropZeros(blockOf(vec, i, shape[i])));
      const scores = shape.map((cs, i) => blockScore(x, i));

      for (let delta = 0.08; delta > 1e-9; delta *= 0.5) {
        let gained = true;
        while (gained) {
          gained = false;
          for (let i = 0; i < shape.length; i++) {
            const cs = shape[i];
            const d = cs.length + 1;
            if (d < 2) continue;
            const off = lay.offset[i];
            for (let a = 0; a < d; a++) {
              if (x[off + a] < delta - 1e-15) continue;
              for (let b = 0; b < d; b++) {
                if (a === b) continue;
                // (P4): only a payment receiving mass can breach the cap.
                if (b > 0 && total.get(cs[b - 1]) + delta > inst.q + 1e-12) continue;
                const va = x[off + a] - delta;
                const vb = x[off + b] + delta;
                // (P2): the reserve must remain a largest coordinate.
                const reserve = a === 0 ? va : b === 0 ? vb : x[off];
                let ok = true;
                for (let t = 1; t < d && ok; t++) {
                  const pay = t === a ? va : t === b ? vb : x[off + t];
                  if (pay > reserve + 1e-12) ok = false;
                }
                if (!ok) continue;

                const before = x[off + a], beforeB = x[off + b];
                x[off + a] = va; x[off + b] = vb;
                const after = blockScore(x, i);
                if (after > scores[i] + 1e-13) {
                  val += after - scores[i];
                  scores[i] = after;
                  if (a > 0) total.set(cs[a - 1], total.get(cs[a - 1]) - delta);
                  if (b > 0) total.set(cs[b - 1], total.get(cs[b - 1]) + delta);
                  gained = true;
                } else {
                  x[off + a] = before; x[off + b] = beforeB;
                }
              }
            }
          }
        }
      }
      val = objective(x);
    }

    if (val > bestVal) { bestVal = val; bestX = Float64Array.from(x); }
  }

  return { value: bestVal, system: fromVector(bestX, shape, lay), shape };
}
