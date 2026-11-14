#!/usr/bin/env python3
"""
Adversarial stress test for the fast algorithm.

A wrong truncation/correction bound would not return a wrong committee --
the certificate is checked exactly before returning -- it would surface as
an infeasible carried-target LP ("Exact LP was not solved to optimality")
or as "Round bound exceeded". This script hunts for those, on instances
built to defeat the degree preprocessing and to force repair rounds.

Usage: python tests/stress_core_algorithm.py [--count N]
"""
from __future__ import annotations

import argparse
import collections
import random
import sys
from fractions import Fraction

sys.path.insert(0, ".")
import core_algorithm as CA
from verify_core_algorithm import check_P1_P4, find_core_violation


def preprocessing_fires(A, m, k):
    n = len(A)
    q = Fraction(n, k)
    high = [c for c in range(m) if sum(c in A[i] for i in range(n)) >= q]
    return len(high) <= k


def popular_instance(rng, n, m, k):
    """
    Every candidate is approved by at least ceil(q) voters, so the
    degree preprocessing cannot short-circuit the search.
    """
    q = Fraction(n, k)
    need = CA.ceil_fraction(q)
    A = [set() for _ in range(n)]
    for c in range(m):
        for i in rng.sample(range(n), min(need, n)):
            A[i].add(c)
    # Add noise without reducing any degree.
    for i in range(n):
        for c in range(m):
            if rng.random() < 0.2:
                A[i].add(c)
    return A


def blocks_instance(rng, groups, per_group, cands_per_group, k):
    """Disjoint voter blocks each approving their own candidate slate."""
    A, c = [], 0
    for _ in range(groups):
        slate = set(range(c, c + cands_per_group))
        c += cands_per_group
        for _ in range(per_group):
            A.append(set(slate))
    return A, c, k


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--count", type=int, default=200)
    ap.add_argument("--seed", type=int, default=99)
    args = ap.parse_args()

    rng = random.Random(args.seed)
    round_hist = collections.Counter()
    errors = []
    checked = skipped = 0
    max_rounds_seen = 0

    print("--- popular-candidate instances (preprocessing defeated) ---")
    for t in range(args.count):
        n = rng.randint(3, 8)
        m = rng.randint(3, 7)
        k = rng.randint(1, max(1, m - 1))
        A = popular_instance(rng, n, m, k)
        if preprocessing_fires(A, m, k):
            skipped += 1
            continue
        try:
            res = CA.fast_core(A, m, k)
        except Exception as exc:
            errors.append(("crash", [sorted(a) for a in A], m, k,
                           f"{type(exc).__name__}: {exc}"))
            continue
        checked += 1
        round_hist[res["rounds"]] += 1
        max_rounds_seen = max(max_rounds_seen, res["rounds"])

        reserves, payments = res["certificate"]
        bad = check_P1_P4(A, m, k, res["committee"], reserves, payments)
        if bad:
            errors.append(("certificate", [sorted(a) for a in A], m, k, "; ".join(bad[:4])))
            continue
        if m <= 12:
            w = find_core_violation(A, m, k, res["committee"])
            if w:
                errors.append(("core", [sorted(a) for a in A], m, k, str(w)))

    print(f"      checked {checked}, skipped {skipped} (preprocessing fired)")
    print(f"      repair-round distribution: {dict(sorted(round_hist.items()))}")
    print(f"      max rounds seen: {max_rounds_seen}")

    print("--- disjoint-block instances ---")
    block_errors = 0
    for (g, pg, cpg, k) in [(2, 2, 2, 2), (2, 3, 2, 2), (3, 2, 2, 3), (2, 2, 3, 2),
                            (3, 3, 2, 3), (2, 4, 2, 2), (4, 2, 2, 4), (2, 2, 4, 3)]:
        A, m, k = blocks_instance(rng, g, pg, cpg, k)
        try:
            res = CA.fast_core(A, m, k)
            reserves, payments = res["certificate"]
            bad = check_P1_P4(A, m, k, res["committee"], reserves, payments)
            w = find_core_violation(A, m, k, res["committee"]) if m <= 12 else None
            if bad or w:
                block_errors += 1
                errors.append(("block", [sorted(a) for a in A], m, k, str(bad or w)))
            else:
                print(f"      g={g} pg={pg} cpg={cpg} k={k}: W={res['committee']} "
                      f"rounds={res['rounds']} L={res['L']} ok")
        except Exception as exc:
            block_errors += 1
            errors.append(("block-crash", [sorted(a) for a in A], m, k,
                           f"{type(exc).__name__}: {exc}"))

    print("--- larger k (truncation level grows) ---")
    for (n, m, k) in [(8, 10, 5), (10, 12, 6), (12, 14, 7)]:
        A = popular_instance(rng, n, m, k)
        try:
            res = CA.fast_core(A, m, k)
            reserves, payments = res["certificate"]
            bad = check_P1_P4(A, m, k, res["committee"], reserves, payments)
            print(f"      n={n} m={m} k={k}: L={res['L']} rounds={res['rounds']} "
                  f"LPs={res['lp_solves']} certificate={'BAD: ' + '; '.join(bad[:2]) if bad else 'ok'}")
            if bad:
                errors.append(("large", [sorted(a) for a in A], m, k, "; ".join(bad[:3])))
        except Exception as exc:
            errors.append(("large-crash", [sorted(a) for a in A], m, k,
                           f"{type(exc).__name__}: {exc}"))
            print(f"      n={n} m={m} k={k}: CRASH {type(exc).__name__}: {exc}")

    print()
    if errors:
        print(f"{len(errors)} FAILURE(S)")
        for kind, A, m, k, detail in errors[:8]:
            print(f"  [{kind}] m={m} k={k} A={A}")
            print(f"         {str(detail)[:300]}")
        return 1
    print("NO FAILURES: no infeasible LP, no round-bound breach, every certificate exact")
    return 0


if __name__ == "__main__":
    sys.exit(main())
