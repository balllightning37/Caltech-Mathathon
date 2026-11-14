#!/usr/bin/env python3
"""
Independent validation of core_algorithm.py.

Deliberately does NOT reuse the module's own `is_core` or
`check_certificate_for_m`, so a shared bug cannot hide from both the
implementation and its checker. Everything here is re-derived from the
definitions in the paper (arXiv:2609.11912v2, Sections 2-3).

Usage:
    python tests/verify_core_algorithm.py            # standard sweep
    python tests/verify_core_algorithm.py --full     # add exhaustive profiles
"""

from __future__ import annotations

import argparse
import itertools
import random
import sys
import traceback
from fractions import Fraction

sys.path.insert(0, ".")
import core_algorithm as CA


# --------------------------------------------------------------------------
# Independent re-implementations of the definitions
# --------------------------------------------------------------------------

def utility(A, i, T):
    return len(A[i] & set(T))


def blocked_by(A, k, W, T):
    """
    Section 3: coalition S blocks W with proposal T when |S| >= q|T| and
    every member strictly gains. The largest useful S is exactly the set of
    voters who strictly gain, so S is derived from T.

    Uses the quota q = n/k from the definition -- NOT n/|W|.
    """
    n = len(A)
    q = Fraction(n, k)
    uW = [utility(A, i, W) for i in range(n)]
    S = [i for i in range(n) if utility(A, i, T) >= uW[i] + 1]
    if not S:
        return None
    if Fraction(len(S)) >= q * len(T):
        return {"S": S, "T": sorted(T)}
    return None


def find_core_violation(A, m, k, W):
    """Exhaustive search over all 2^m - 1 non-empty proposals."""
    for size in range(1, m + 1):
        for T in itertools.combinations(range(m), size):
            w = blocked_by(A, k, W, T)
            if w is not None:
                return w
    return None


def check_P1_P4(A, m, k, W, reserves, payments):
    """
    Re-derive (P1)-(P4) from the paper. Returns a list of failure strings.
    """
    n = len(A)
    q = Fraction(n, k)
    W = set(W)
    bad = []

    for i in range(n):
        r = reserves[i]
        if r < 0:
            bad.append(f"(P1) negative reserve r[{i}]={r}")
        own = sorted(A[i] & W)
        total = r + sum((payments.get((i, c), Fraction(0)) for c in own), Fraction(0))
        if total != 1:
            bad.append(f"(P1) voter {i} budget {total} != 1")
        for c in own:
            p = payments.get((i, c), Fraction(0))
            if p < 0:
                bad.append(f"(P1) negative payment p[{i},{c}]={p}")
            if p > r:
                bad.append(f"(P2) p[{i},{c}]={p} > r[{i}]={r}")
        # A voter must not pay a candidate she does not approve, or a loser.
        for (j, c), p in payments.items():
            if j == i and p != 0 and (c not in A[i] or c not in W):
                bad.append(f"(P1) voter {i} pays non-approved/losing {c}")

    for c in W:
        paid = sum((payments.get((i, c), Fraction(0)) for i in range(n)), Fraction(0))
        if paid > q:
            bad.append(f"(P4) winner {c} collects {paid} > q={q}")

    for c in set(range(m)) - W:
        held = sum((reserves[i] for i in range(n) if c in A[i]), Fraction(0))
        if not held < q:
            bad.append(f"(P3) loser {c} has reserve {held} >= q={q}")

    return bad


# --------------------------------------------------------------------------
# One instance
# --------------------------------------------------------------------------

def check_instance(ballots, m, k, algorithm="fast", verify_core=True):
    """Returns (ok, label, detail)."""
    A = [set(b) for b in ballots]
    n = len(A)
    fn = CA.fast_core if algorithm == "fast" else CA.paper_core
    try:
        res = fn(A, m, k)
    except Exception as exc:
        return False, "crash", f"{type(exc).__name__}: {exc}\n{traceback.format_exc()}"

    W = res["committee"]

    if len(W) != k:
        return False, "size", f"|W|={len(W)} != k={k}"
    if len(set(W)) != len(W):
        return False, "dup", f"duplicate winners {W}"
    if any(not (0 <= c < m) for c in W):
        return False, "range", f"winner out of range {W}"

    # The certificate, when the algorithm produced one.
    cert = res.get("certificate")
    if cert is not None:
        reserves, payments = cert
        bad = check_P1_P4(A, m, k, W, reserves, payments)
        if bad:
            return False, "certificate", "; ".join(bad[:6])

    if verify_core:
        witness = find_core_violation(A, m, k, W)
        if witness is not None:
            return False, "core", (
                f"W={W} blocked by S={witness['S']} with T={witness['T']} "
                f"(|S|={len(witness['S'])}, q|T|={Fraction(n,k)*len(witness['T'])})"
            )

    return True, "ok", res


# --------------------------------------------------------------------------
# Sweeps
# --------------------------------------------------------------------------

def random_profiles(count, seed, m_range=(2, 6), n_range=(2, 7)):
    rng = random.Random(seed)
    out = []
    for _ in range(count):
        m = rng.randint(*m_range)
        n = rng.randint(*n_range)
        k = rng.randint(1, m)
        density = rng.choice([0.25, 0.4, 0.5, 0.7, 0.9])
        ballots = []
        for _ in range(n):
            b = [c for c in range(m) if rng.random() < density]
            ballots.append(b)
        if rng.random() < 0.3 and n >= 2:          # duplicated ballots
            ballots[-1] = list(ballots[0])
        out.append((ballots, m, k))
    return out


def structured_profiles():
    """Hand-picked shapes that stress the proof's corner cases."""
    P = []
    # The paper's Figure 2 instance (k=8 is slow, so also a shrunken variant).
    P.append(([[0, 1, 2], [0, 1, 3], [4, 5, 6, 7, 8, 9], [4, 5, 6, 7, 8, 9]], 10, 8))
    # Two disjoint blocks competing for one seat each.
    P.append(([[2, 3], [2, 3], [0, 1], [0, 1]], 4, 2))
    # Everyone approves everything.
    P.append(([[0, 1, 2], [0, 1, 2], [0, 1, 2]], 3, 2))
    # Nobody approves anything.
    P.append(([[], [], []], 3, 2))
    # Some voters abstain.
    P.append(([[0], [], [1, 2], []], 3, 2))
    # A candidate nobody approves.
    P.append(([[0], [0], [1]], 3, 2))
    # k = 1.
    P.append(([[0], [1], [0]], 2, 1))
    # k = m.
    P.append(([[0], [1]], 2, 2))
    # Single voter.
    P.append(([[0, 1]], 3, 2))
    # Majority/minority split, tight quota.
    P.append(([[0], [0], [0], [1]], 3, 2))
    # Nested approvals.
    P.append(([[0], [0, 1], [0, 1, 2]], 3, 2))
    # Duplicated identical ballots, many voters.
    P.append(([[0, 1]] * 5 + [[2, 3]] * 2, 4, 3))
    return P


def exhaustive_profiles(m, n, k):
    """All profiles over m candidates with n voters (ballots as subsets)."""
    subsets = [list(s) for r in range(m + 1) for s in itertools.combinations(range(m), r)]
    for combo in itertools.product(subsets, repeat=n):
        yield (list(combo), m, k)


def run(label, cases, algorithm="fast", verify_core=True, stop_after=None):
    passed = failed = 0
    failures = []
    for idx, (ballots, m, k) in enumerate(cases):
        ok, kind, detail = check_instance(ballots, m, k, algorithm, verify_core)
        if ok:
            passed += 1
        else:
            failed += 1
            failures.append((kind, ballots, m, k, detail))
            if stop_after and failed >= stop_after:
                break
    status = "PASS" if failed == 0 else "FAIL"
    print(f"{status}  {label}: {passed} ok, {failed} failed")
    for kind, ballots, m, k, detail in failures[:5]:
        print(f"      [{kind}] m={m} k={k} A={ballots}")
        print(f"             {str(detail)[:400]}")
    return failed


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--full", action="store_true", help="add exhaustive sweeps")
    ap.add_argument("--seed", type=int, default=20261114)
    args = ap.parse_args()

    total = 0

    print("--- structured corner cases (fast) ---")
    total += run("structured/fast", structured_profiles())

    print("--- random profiles (fast) ---")
    total += run("random/fast x120", random_profiles(120, args.seed))

    print("--- random profiles (paper algorithm) ---")
    total += run("random/paper x25",
                 random_profiles(25, args.seed + 1, m_range=(2, 4), n_range=(2, 5)),
                 algorithm="paper")

    print("--- structured corner cases (paper) ---")
    total += run("structured/paper", [c for c in structured_profiles() if c[1] <= 4],
                 algorithm="paper")

    if args.full:
        print("--- exhaustive: m=3, n=3, all k ---")
        for k in (1, 2, 3):
            total += run(f"exhaustive m=3 n=3 k={k}", exhaustive_profiles(3, 3, k))
        print("--- exhaustive: m=4, n=2, all k ---")
        for k in (1, 2, 3, 4):
            total += run(f"exhaustive m=4 n=2 k={k}", exhaustive_profiles(4, 2, k))

    print()
    print("ALL CHECKS PASSED" if total == 0 else f"{total} FAILURE(S)")
    return 0 if total == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
