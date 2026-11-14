/**
 * Core mathematics for the harmonic entropy framework.
 *
 * Everything here is verified against the worked examples in the paper
 * (Becker, Greger & Peters, arXiv:2609.11912v2): Figure 3's water levels
 * and the identity F(1/2, 1/3, 1/6) = 467/360.
 */

const EPS = 1e-12;

/** Harmonic number H_t = sum_{j=1}^{t} 1/j, with H_0 = 0. */
export function H(t) {
  let s = 0;
  for (let j = 1; j <= t; j++) s += 1 / j;
  return s;
}

/** Positive part (a)^+ = max{a, 0}. */
export const pos = (a) => (a > 0 ? a : 0);

/**
 * Water level t_l(x): the unique t >= 0 with l * t = sum_j (x_j - t)^+.
 *
 * Computed via Lemma 5.1(4): t_l(x) = max over non-empty S of
 * (sum_{j in S} x_j) / (|S| + l). The maximum is attained by a prefix of
 * the coordinates sorted in decreasing order, so one pass suffices.
 *
 * Also returns the argmax set, which gives the gradient of t_l.
 */
export function waterLevel(x, l = 1) {
  const idx = x.map((v, i) => i).sort((a, b) => x[b] - x[a]);
  let sum = 0, best = -Infinity, bestK = 0;
  for (let k = 0; k < idx.length; k++) {
    sum += x[idx[k]];
    const val = sum / (k + 1 + l);
    if (val > best + EPS) { best = val; bestK = k + 1; }
  }
  return { t: best, support: idx.slice(0, bestK), order: idx };
}

/**
 * Robin Hood operator rho_l(x): lower every coordinate above the water
 * level t to t, and hand the freed mass to l brand-new coordinates, each
 * also equal to t. Total mass is preserved and no coordinate increases.
 */
export function robinHood(x, l = 1) {
  const { t } = waterLevel(x, l);
  const capped = x.map((v) => Math.min(v, t));
  const added = new Array(l).fill(t);
  return { next: capped.concat(added), t, capped, added };
}

/** True when every coordinate of x is equal (within tolerance). */
export function isUniform(x, tol = 1e-9) {
  if (x.length === 0) return true;
  return Math.max(...x) - Math.min(...x) < tol;
}

/** Drop zero (and negative-noise) coordinates; F is invariant under this. */
export function dropZeros(x, tol = 1e-12) {
  return x.filter((v) => v > tol);
}

/**
 * Harmonic entropy F(x), by the paper's recursive definition:
 *
 *   F(x) = H_{d-1}                  if x is uniform on d coordinates,
 *        = F(rho(x)) - max(x)       otherwise.
 *
 * Unrolled into a loop: repeatedly apply rho, accumulating -max(x) each
 * time, until the distribution is uniform. Returns the trace of steps so
 * the recursion can be displayed.
 */
export function harmonicEntropy(xRaw, maxSteps = 512) {
  const x0 = dropZeros(xRaw);
  if (x0.length === 0) return { value: 0, steps: [], uniformAt: 0, terminated: true };

  let x = x0.slice();
  const steps = [];
  let acc = 0;
  let s = 0;

  while (!isUniform(x) && s < maxSteps) {
    const mx = Math.max(...x);
    const { next, t } = robinHood(x, 1);
    steps.push({ from: x, max: mx, t, to: next });
    acc -= mx;
    x = next;
    s++;
  }

  const base = H(x.length - 1);
  return {
    value: base + acc,
    steps,
    uniformAt: x.length,
    base,
    terminated: isUniform(x),
  };
}

/**
 * Truncated series form (6): F_L(x) = sum_{l=0}^{L-1} [ 1/(l+1) - t_l(x) ],
 * where t_0(x) = max(x). Converges to F from above as L grows; useful as an
 * independent check on the recursion and for gradients.
 */
export function harmonicEntropySeries(xRaw, L = 4000) {
  const x = dropZeros(xRaw);
  if (x.length === 0) return 0;
  let s = 0;
  for (let l = 0; l < L; l++) {
    const t = l === 0 ? Math.max(...x) : waterLevel(x, l).t;
    s += 1 / (l + 1) - t;
  }
  return s;
}

/**
 * Gradient of the truncated series: d t_l / d x_j = 1/(|S*| + l) for j in
 * the argmax set S*, else 0. So dF_L/dx_j = -sum_l [ that ].
 */
export function harmonicEntropyGradient(xRaw, L = 400) {
  const x = dropZeros(xRaw);
  const g = new Array(x.length).fill(0);
  for (let l = 0; l < L; l++) {
    if (l === 0) {
      let mi = 0;
      for (let i = 1; i < x.length; i++) if (x[i] > x[mi]) mi = i;
      g[mi] -= 1;
    } else {
      const { support } = waterLevel(x, l);
      const w = 1 / (support.length + l);
      for (const j of support) g[j] -= w;
    }
  }
  return g;
}

/** The marginal-gain identity: F(rho(x)) = F(x) + max(x). */
export function marginalGainCheck(x) {
  const fx = harmonicEntropy(x).value;
  const frx = harmonicEntropy(robinHood(x, 1).next).value;
  return { fx, frx, max: Math.max(...dropZeros(x)), residual: frx - fx - Math.max(...dropZeros(x)) };
}
