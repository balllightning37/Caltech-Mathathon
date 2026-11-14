#!/usr/bin/env python3
"""
Measure the claimed speedup: LP count, truncation level L, and wall time
for the fast (carried-target) algorithm against the paper's neighbourhood
local search, on identical instances.

Usage: python tests/bench_core_algorithm.py
"""
from __future__ import annotations

import math
import random
import sys
import time
from fractions import Fraction

sys.path.insert(0, ".")
import core_algorithm as CA


def instance(n, m, k, seed, density=0.5):
    rng = random.Random(seed)
    A = []
    for _ in range(n):
        b = {c for c in range(m) if rng.random() < density}
        if not b:
            b = {rng.randrange(m)}
        A.append(b)
    return A, m, k


def predicted_L(A, m, k):
    """Reproduce each algorithm's truncation level without solving."""
    n = len(A)
    q = Fraction(n, k)
    delta = q - Fraction(n, k + 1)
    support = [{i for i in range(n) if c in A[i]} for c in range(m)]
    high = [c for c in range(m) if len(support[c]) >= q]
    if len(high) <= k:
        fast = 0
    else:
        cs = set(high)
        inc = sum(len(A[i] & cs) for i in range(n))
        U = min(inc, n * k)
        fast = max(1, CA.ceil_sqrt_fraction(2 * U / delta))
    paper = CA.ceil_fraction(2 * n * k / delta)
    return fast, paper


def timed(fn, *a):
    t0 = time.perf_counter()
    try:
        r = fn(*a)
        return time.perf_counter() - t0, r, None
    except Exception as exc:
        return time.perf_counter() - t0, None, f"{type(exc).__name__}: {exc}"


def main():
    print(f"{'n':>3} {'m':>3} {'k':>3} | {'L fast':>7} {'L paper':>8} | "
          f"{'LPs fast':>9} {'LPs paper':>10} | {'t fast':>9} {'t paper':>9} | speedup")
    print("-" * 104)

    cases = [
        (3, 4, 2), (4, 4, 2), (4, 5, 2), (5, 5, 2),
        (4, 6, 3), (6, 6, 3), (5, 6, 2), (6, 8, 4),
    ]

    rows = []
    for (n, m, k) in cases:
        A, m, k = instance(n, m, k, seed=1000 + n * 31 + m * 7 + k)
        lf, lp_ = predicted_L(A, m, k)

        tf, rf, ef = timed(CA.fast_core, A, m, k)
        # The paper algorithm's L grows as k^3; cap the work we attempt.
        if lp_ <= 400 and m <= 6:
            tp, rp, ep = timed(CA.paper_core, A, m, k)
        else:
            tp, rp, ep = float('nan'), None, "skipped (too slow)"

        lps_f = rf["lp_solves"] if rf else None
        lps_p = rp["lp_solves"] if rp else None
        sp = (tp / tf) if (rp and tf > 0) else float('nan')

        print(f"{n:>3} {m:>3} {k:>3} | {lf:>7} {lp_:>8} | "
              f"{str(lps_f):>9} {str(lps_p):>10} | "
              f"{tf:>8.2f}s {tp:>8.2f}s | "
              f"{'' if math.isnan(sp) else f'{sp:>6.1f}x'}"
              f"{'  ' + (ef or ep or '') if (ef or ep) else ''}")
        rows.append((n, m, k, lf, lp_, lps_f, lps_p, tf, tp))

    print()
    print("Neighbourhood size k(m-k)+1 vs fast LP count (LPs per repair round):")
    for (n, m, k, lf, lpv, lps_f, lps_p, tf, tp) in rows:
        print(f"  n={n} m={m} k={k}: paper scans {k*(m-k)+1:>3} LPs/round, "
              f"fast uses 1/round  |  L ratio paper/fast = {lpv/max(lf,1):.1f}x")

    print()
    print("Truncation growth in k at the Hare quota (n fixed = 12, m = 2k):")
    print(f"  {'k':>3} {'L fast':>8} {'L paper':>9} {'k^1.5':>9} {'k^3':>8}")
    for k in (2, 3, 4, 6, 8, 12):
        m = 2 * k
        A, _, _ = instance(12, m, k, seed=77 + k, density=0.6)
        lf, lpv = predicted_L(A, m, k)
        print(f"  {k:>3} {lf:>8} {lpv:>9} {k**1.5:>9.1f} {k**3:>8}")


if __name__ == "__main__":
    main()
