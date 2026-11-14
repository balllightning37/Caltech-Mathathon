#!/usr/bin/env python3
"""Compute a core-stable approval committee with exact rational arithmetic.

Requires: z3-solver

Input JSON:
    {"m": 3, "k": 2, "A": [[0, 2], [0, 1]]}

Here A[i] is voter i's approval set, candidates are numbered 0,...,m-1,
and q=n/k is the Hare quota.

Usage:
    python3 results/core_algorithm.py input.json --algorithm fast --verify-core
    python3 results/core_algorithm.py input.json --algorithm paper --verify-core

"fast" is the carried-target algorithm with one LP per repair.
"paper" is Algorithm 1 in Becker--Greger--Peters (neighbourhood local search).

The exact LP arithmetic is deliberately slow but avoids floating-point errors.
"""

from __future__ import annotations

import argparse
import heapq
import itertools
import json
import math
from fractions import Fraction
from pathlib import Path
from typing import Iterable

import z3


def ceil_fraction(x: Fraction) -> int:
    return (x.numerator + x.denominator - 1) // x.denominator


def harmonic(x: int) -> Fraction:
    return sum((Fraction(1, j) for j in range(1, x + 1)), Fraction(0))


def ceil_sqrt_fraction(x: Fraction) -> int:
    """Return ceil(sqrt(x)) exactly, without floating-point arithmetic."""
    if x < 0:
        raise ValueError("Square root of a negative rational")
    if x == 0:
        return 0
    root = math.isqrt(x.numerator // x.denominator)
    while root > 0 and root * root * x.denominator >= x.numerator:
        root -= 1
    while root * root * x.denominator < x.numerator:
        root += 1
    return root


def as_z3(x: Fraction | int):
    x = Fraction(x)
    return z3.RealVal(x.numerator) / z3.RealVal(x.denominator)


def zsum(terms: Iterable):
    return sum(terms, z3.RealVal(0))


def z3_to_fraction(value) -> Fraction:
    """Convert an integer or rational z3 numeral exactly."""
    value = z3.simplify(value)
    if z3.is_int_value(value):
        return Fraction(value.as_long())
    if z3.is_rational_value(value):
        return Fraction(value.numerator_as_long(), value.denominator_as_long())
    raise ArithmeticError(f"Non-rational exact-arithmetic value: {value}")


def from_model(model, variable) -> Fraction:
    return z3_to_fraction(model.eval(variable, model_completion=True))


class HarmonicLP:
    """Exact LP for V_L(X), plus the optional minimum-reserve tie-break."""

    def __init__(self, approvals: list[set[int]], quota: Fraction, L: int):
        if L < 1:
            raise ValueError("The main LP requires L >= 1")
        self.A = approvals
        self.n = len(approvals)
        self.q = quota
        self.L = L
        self.H_L = harmonic(L)

    def solve(self, committee: set[int], fix_z: Fraction | None = None,
              z_upper: Fraction | None = None):
        """Return (V_L, reserves, payments, Z).

        If fix_z is None and z_upper is None, maximize truncated harmonic
        entropy, encoded as minimizing Z=sum(t[i,ell]).

        If fix_z=Z*, minimize total reserve subject to Z=Z*.
        If z_upper=Z0, minimize total reserve subject to Z<=Z0. The latter
        is the one-LP target-feasibility mode used by fast_core.
        """
        X = set(committee)
        active = [i for i in range(self.n) if self.A[i] & X]

        # An uncovered voter has reserve 1, no payments, and F_L=0.
        if not active:
            reserves = [Fraction(1) for _ in range(self.n)]
            return Fraction(0), reserves, {}, Fraction(0)

        opt = z3.Optimize()
        r = {i: z3.Real(f"r_{i}") for i in active}
        p = {(i, c): z3.Real(f"p_{i}_{c}")
             for i in active for c in sorted(self.A[i] & X)}
        t = {(i, ell): z3.Real(f"t_{i}_{ell}")
             for i in active for ell in range(self.L)}
        a = {(i, ell, c): z3.Real(f"a_{i}_{ell}_{'r' if c is None else c}")
             for i in active
             for ell in range(self.L)
             for c in [None] + sorted(self.A[i] & X)}

        for variable in itertools.chain(r.values(), p.values(), t.values(), a.values()):
            opt.add(variable >= 0)

        # (P1): each voter splits one unit between reserve and payments.
        for i in active:
            opt.add(r[i] + zsum(p[i, c] for c in sorted(self.A[i] & X)) == 1)

        # (P2): a payment never exceeds the reserve.
        for i, c in p:
            opt.add(p[i, c] <= r[i])

        # (P4): each winner receives at most quota q in total.
        for c in X:
            terms = [p[i, c] for i in active if (i, c) in p]
            if terms:
                opt.add(zsum(terms) <= as_z3(self.q))

        # Water levels. t[i,ell] represents t_ell(r_i,p_i).
        # The objective coefficient of every t[i,ell] is ONE.
        for i in active:
            coordinates = [None] + sorted(self.A[i] & X)
            payment_var = {c: p[i, c] for c in sorted(self.A[i] & X)}
            for ell in range(self.L):
                water = t[i, ell]
                for c in coordinates:
                    original = r[i] if c is None else payment_var[c]
                    auxiliary = a[i, ell, c]
                    opt.add(auxiliary >= original - water)
                opt.add(zsum(a[i, ell, c] for c in coordinates) <= ell * water)

        if fix_z is not None and z_upper is not None:
            raise ValueError("fix_z and z_upper are mutually exclusive")
        Z = zsum(t.values())
        z_handle = None
        if fix_z is None and z_upper is None:
            z_handle = opt.minimize(Z)
        else:
            if fix_z is not None:
                opt.add(Z == as_z3(fix_z))
            else:
                opt.add(Z <= as_z3(z_upper))
            opt.minimize(zsum(r.values()))

        if opt.check() != z3.sat:
            raise ArithmeticError("Exact LP was not solved to optimality")

        model = opt.model()
        z_value = sum((from_model(model, var) for var in t.values()), Fraction(0))
        if fix_z is not None and z_value != fix_z:
            raise ArithmeticError("Secondary LP lost the primary optimum")
        if z_upper is not None and z_value > z_upper:
            raise ArithmeticError("Target-feasibility LP exceeded the entropy floor")

        # If available, independently check Optimize's stored optimum bound.
        if z_handle is not None:
            bound = opt.lower(z_handle)
            bound_fraction = z3_to_fraction(bound)
            if bound_fraction != z_value:
                raise ArithmeticError("LP model and optimum bound disagree")

        reserves = [from_model(model, r[i]) if i in active else Fraction(1)
                    for i in range(self.n)]
        payments = {key: from_model(model, var) for key, var in p.items()}
        V = len(active) * self.H_L - z_value
        return V, reserves, payments, z_value


def dereserve(approvals, X, quota, reserves, payments):
    """Exact event-driven water-filling in O((E+n+k) log(n+k)) queue work."""
    n, X, t = len(approvals), set(X), Fraction(0)
    r, p = list(reserves), dict(payments)
    supporters = {c: [i for i in range(n) if c in approvals[i]] for c in X}
    totals = {c: sum((p.get((i, c), Fraction(0)) for i in supporters[c]),
                     Fraction(0)) for c in X}
    open_c = {c for c in X if totals[c] < quota}

    active = [r[i] > 0 and bool(approvals[i] & open_c) for i in range(n)]
    pair, pair_anchor = {}, {}
    for i in range(n):
        for c in approvals[i] & X:
            pair[i, c] = active[i] and c in open_c
            pair_anchor[i, c] = t
    width = {i: len(approvals[i] & open_c) if active[i] else 0
             for i in range(n)}
    demand = {c: sum(active[i] for i in supporters[c]) for c in X}
    r_anchor = [t] * n
    p_anchor = {c: t for c in X}
    voter_heap, cand_heap = [], []
    voter_ver, cand_ver = [0] * n, {c: 0 for c in X}

    def push_voter(i):
        voter_ver[i] += 1
        if active[i] and width[i] > 0 and r[i] > 0:
            heapq.heappush(voter_heap,
                           (t + r[i] / width[i], i, voter_ver[i]))

    def push_candidate(c):
        cand_ver[c] += 1
        if c in open_c and demand[c] > 0 and totals[c] < quota:
            heapq.heappush(cand_heap,
                           (t + (quota - totals[c]) / demand[c], c, cand_ver[c]))

    for i in range(n):
        push_voter(i)
    for c in X:
        push_candidate(c)

    def materialize_voter(i, time):
        if active[i] and width[i] > 0:
            r[i] -= width[i] * (time - r_anchor[i])
            r_anchor[i] = time

    def materialize_candidate(c, time):
        if c in open_c and demand[c] > 0:
            totals[c] += demand[c] * (time - p_anchor[c])
            p_anchor[c] = time

    def switch_pair(i, c, turn_on, time):
        if (i, c) not in pair:
            return
        if pair[i, c] and not turn_on:
            p[i, c] = p.get((i, c), Fraction(0)) + time - pair_anchor[i, c]
            pair_anchor[i, c] = time
            pair[i, c] = False
        elif turn_on and not pair[i, c]:
            pair_anchor[i, c] = time
            pair[i, c] = True

    def close_candidate(c, time):
        if c not in open_c:
            return
        materialize_candidate(c, time)
        if totals[c] != quota:
            raise ArithmeticError("Candidate closed away from its quota")
        open_c.remove(c)
        cand_ver[c] += 1
        for i in supporters[c]:
            if active[i]:
                materialize_voter(i, time)
                width[i] -= 1
                r_anchor[i] = time
                switch_pair(i, c, False, time)
                push_voter(i)
                if r[i] == 0:
                    deactivate_voter(i, time)

    def deactivate_voter(i, time):
        if not active[i]:
            return
        materialize_voter(i, time)
        if r[i] != 0:
            raise ArithmeticError("Voter deactivated with a positive reserve")
        active[i] = False
        voter_ver[i] += 1
        width[i] = 0
        for c in list(approvals[i] & open_c):
            materialize_candidate(c, time)
            demand[c] -= 1
            p_anchor[c] = time
            switch_pair(i, c, False, time)
            push_candidate(c)
            if totals[c] == quota:
                close_candidate(c, time)

    while True:
        while voter_heap:
            tau, i, version = voter_heap[0]
            if (not active[i] or width[i] == 0 or version != voter_ver[i]
                    or r[i] <= 0
                    or tau != r_anchor[i] + r[i] / width[i]):
                heapq.heappop(voter_heap)
            else:
                break
        while cand_heap:
            tau, c, version = cand_heap[0]
            if (c not in open_c or demand[c] == 0
                    or version != cand_ver[c] or totals[c] >= quota
                    or tau != p_anchor[c] + (quota - totals[c]) / demand[c]):
                heapq.heappop(cand_heap)
            else:
                break
        if not voter_heap and not cand_heap:
            break
        next_voter = voter_heap[0][0] if voter_heap else None
        next_cand = cand_heap[0][0] if cand_heap else None
        time = min(x for x in (next_voter, next_cand) if x is not None)
        if time < t:
            raise ArithmeticError("De-reservation time moved backwards")
        t = time
        if next_voter is not None and next_voter == t:
            _, i, version = heapq.heappop(voter_heap)
            if active[i] and version == voter_ver[i] and width[i] > 0 and r[i] > 0:
                materialize_voter(i, t)
                if r[i] == 0:
                    deactivate_voter(i, t)
        elif next_cand is not None and next_cand == t:
            _, c, version = heapq.heappop(cand_heap)
            if c in open_c and version == cand_ver[c] and demand[c] > 0:
                materialize_candidate(c, t)
                close_candidate(c, t)

    for i in range(n):
        for c in approvals[i] & X:
            if pair.get((i, c), False):
                p[i, c] = p.get((i, c), Fraction(0)) + t - pair_anchor[i, c]
                pair_anchor[i, c] = t
                pair[i, c] = False
    return r, p


def fast_core(approvals, m, k):
    """One-LP-per-round constructive algorithm with exact core+ certificate."""
    A = [set(x) for x in approvals]
    n = len(A)
    quota = Fraction(n, k)
    delta = quota - Fraction(n, k + 1)
    support = [{i for i in range(n) if c in A[i]} for c in range(m)]
    high = [c for c in range(m) if len(support[c]) >= quota]

    # Low-degree candidates can never gather q units of reserve.
    if len(high) <= k:
        W = set(high)
        for c in range(m):
            if len(W) == k:
                break
            W.add(c)
        certificate = ([Fraction(1)] * n, {})
        check_certificate_for_m(A, m, W, quota, *certificate)
        return {"committee": sorted(W), "rounds": 0, "lp_solves": 0,
                "L": 0, "certificate": certificate}

    # Work only with high-degree candidates. Any resulting certificate also
    # works for removed candidates, since all reserves are at most one.
    candidates = high
    candidate_set = set(candidates)
    approval_incidences = sum(len(A[i] & candidate_set) for i in range(n))
    U = min(approval_incidences, n * k)
    L = max(1, ceil_sqrt_fraction(2 * U / delta))
    lp = HarmonicLP(A, quota, L)
    W = set(candidates[:k])

    # Carry a feasible payment system. The zero-payment system is feasible.
    reserves = [Fraction(1)] * n
    payments = {}
    lower = Fraction(0)          # certified lower bound on corrected entropy
    rounds = 0
    lp_solves = 0
    potential_cap = (2 * sum((harmonic(min(len(A[i]), k)) for i in range(n)),
                             Fraction(0))) / delta
    max_rounds = math.floor(potential_cap)

    # H_0,...,H_{L+k}; the dimension correction is a difference of these.
    H = [harmonic(j) for j in range(L + k + 2)]

    while True:
        if rounds > max_rounds:
            raise ArithmeticError("Round bound exceeded")

        reserve_sum = {c: sum((reserves[i] for i in support[c]), Fraction(0))
                       for c in candidates if c not in W}
        violations = [c for c, amount in reserve_sum.items() if amount >= quota]
        if not violations:
            check_certificate_for_m(A, m, W, quota, reserves, payments)
            return {"committee": sorted(W), "rounds": rounds,
                    "lp_solves": lp_solves, "L": L,
                    "certificate": (reserves, payments)}

        # Prefer the violating loser with the smallest certified addition
        # loss. Any violation is valid for correctness; this choice raises
        # the carried entropy target and improves practical progress.
        supporter_utility = {v: sum(len(A[i] & W) for i in support[v])
                             for v in violations}
        c = min(violations, key=lambda v: (supporter_utility[v], v))
        X = W | {c}

        # Feasibility is guaranteed by the corrected addition lemma. The
        # carried system need not itself be an optimizer of W.
        addition_loss = Fraction(supporter_utility[c], (L + 1) ** 2)
        target = lower + quota - addition_loss

        # Correction C_L(s)=sum_{h=1}^{s-1}1/(L+h) for s=u_i(X)+1.
        correction_X = sum((H[L + len(A[i] & X)] - H[L] for i in range(n)),
                           Fraction(0))
        active_X = sum(bool(A[i] & X) for i in range(n))
        z_upper = active_X * H[L] + correction_X - target

        # ONE exact LP: minimum total reserve among systems whose corrected
        # entropy is at least target.
        _, rX, pX, _ = lp.solve(X, z_upper=z_upper)
        lp_solves += 1

        rhat, phat = dereserve(A, X, quota, rX, pX)
        totals = {d: sum((phat.get((i, d), Fraction(0)) for i in range(n)),
                         Fraction(0)) for d in X}
        d = min(X, key=lambda candidate: (totals[candidate], candidate))

        Wn = X - {d}
        new_reserves = [Fraction(0)] * n
        new_payments = {}
        for i in range(n):
            if d in A[i]:
                # Delete d's payment coordinate and rename it as reserve.
                new_reserves[i] = phat.get((i, d), Fraction(0))
                source_r, source_p = rhat, phat
            else:
                new_reserves[i] = rX[i]
                source_r, source_p = rX, pX
            for cc in A[i] & Wn:
                new_payments[i, cc] = source_p.get((i, cc), Fraction(0))

        # Deleting the minimum-payment candidate loses at most n/(k+1).
        lower = target - Fraction(n, k + 1)
        W, reserves, payments = Wn, new_reserves, new_payments
        rounds += 1


def paper_core(approvals, m, k):
    """The paper's Algorithm 1: exhaustive single-swap local search."""
    A = [set(x) for x in approvals]
    n = len(A)
    candidates = list(range(m))
    quota = Fraction(n, k)
    delta = quota - Fraction(n, k + 1)
    L = ceil_fraction(2 * n * k / delta)
    lp = HarmonicLP(A, quota, L)
    W = set(candidates[:k])
    value, _, _, _ = lp.solve(W)
    lp_solves = 1
    rounds = 0
    max_rounds = math.floor(2 * n * harmonic(k) / delta)

    while True:
        improving = None
        for removed in sorted(W):
            for added in sorted(set(candidates) - W):
                neighbour = (W - {removed}) | {added}
                new_value, _, _, _ = lp.solve(neighbour)
                lp_solves += 1
                if new_value - value >= delta / 2:
                    improving = (neighbour, new_value)
                    break
            if improving is not None:
                break
        if improving is None:
            if rounds > max_rounds:
                raise ArithmeticError("Paper algorithm exceeded its round bound")
            return {"committee": sorted(W), "rounds": rounds,
                    "lp_solves": lp_solves, "L": L, "certificate": None}
        rounds += 1
        if rounds > max_rounds:
            raise ArithmeticError("Paper algorithm exceeded its round bound")
        W, value = improving


def assert_certificate(approvals, W, quota, reserves, payments):
    """Check (P1), (P2), and (P4) exactly."""
    n = len(approvals)
    for i in range(n):
        assert reserves[i] >= 0
        spent = sum((payments.get((i, c), Fraction(0)) for c in approvals[i] & W),
                    Fraction(0))
        assert reserves[i] + spent == 1
        for c in approvals[i] & W:
            p = payments.get((i, c), Fraction(0))
            assert 0 <= p <= reserves[i]
    for c in W:
        paid = sum((payments.get((i, c), Fraction(0)) for i in range(n)), Fraction(0))
        assert paid <= quota


def check_certificate_for_m(approvals, m, W, quota, reserves, payments):
    """Complete certificate check, including every losing candidate 0,...,m-1."""
    assert_certificate(approvals, W, quota, reserves, payments)
    for c in set(range(m)) - W:
        available = sum((reserves[i] for i in range(len(approvals)) if c in approvals[i]),
                        Fraction(0))
        assert available < quota


def is_core(approvals, m, W):
    """Exhaustive ordinary-core checker, intended only for small m."""
    A = [set(x) for x in approvals]
    n = len(A)
    W = set(W)
    utilities = [len(a & W) for a in A]
    for size in range(1, m + 1):
        for proposal in itertools.combinations(range(m), size):
            T = set(proposal)
            supporters = sum(len(A[i] & T) > utilities[i] for i in range(n))
            if supporters * len(W) >= n * size:
                return False, {"proposal": sorted(T), "supporters": supporters}
    return True, None


def validate_input(data):
    if not {"m", "k", "A"} <= data.keys():
        raise ValueError("Input must contain m, k, and A")
    m, k, raw_A = data["m"], data["k"], data["A"]
    if not isinstance(m, int) or not isinstance(k, int) or not (1 <= k <= m):
        raise ValueError("Require integers 1 <= k <= m")
    if not isinstance(raw_A, list) or not raw_A:
        raise ValueError("A must be a nonempty list of approval sets")
    A = []
    for ballot in raw_A:
        if not isinstance(ballot, list) or len(set(ballot)) != len(ballot):
            raise ValueError("Each ballot must be a list of distinct candidates")
        ballot = set(ballot)
        if any(not isinstance(c, int) or not 0 <= c < m for c in ballot):
            raise ValueError("Candidate IDs must be integers in [0,m)")
        A.append(ballot)
    return A, m, k


def printable(result, approvals, m, k, verify=False):
    W = set(result["committee"])
    quota = Fraction(len(approvals), k)
    out = {key: value for key, value in result.items() if key != "certificate"}
    certificate = result["certificate"]
    if certificate is not None:
        reserves, payments = certificate
        check_certificate_for_m(approvals, m, W, quota, reserves, payments)
        out["certificate"] = {
            "reserves": {str(i): str(reserves[i]) for i in range(len(approvals))},
            "payments": {
                str(i): {str(c): str(payments.get((i, c), Fraction(0)))
                         for c in sorted(approvals[i] & W)}
                for i in range(len(approvals)) if approvals[i] & W
            },
        }
        out["certificate_verified"] = True
    if verify:
        if m > 24:
            raise ValueError("--verify-core is exponential in m; refusing m > 24")
        ok, witness = is_core(approvals, m, W)
        out["ordinary_core_verified"] = ok
        if not ok:
            out["core_violation"] = witness
    return out


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, help="JSON file containing m, k, A")
    parser.add_argument("--algorithm", choices=("fast", "paper"), default="fast")
    parser.add_argument("--verify-core", action="store_true",
                        help="Exhaustively verify ordinary core stability (small m only)")
    args = parser.parse_args()
    approvals, m, k = validate_input(json.loads(args.input.read_text()))
    if k == m:
        result = {"committee": list(range(m)), "rounds": 0,
                  "lp_solves": 0, "L": 0,
                  "certificate": ([Fraction(1)] * len(approvals), {})}
    else:
        algorithm = fast_core if args.algorithm == "fast" else paper_core
        result = algorithm(approvals, m, k)
    print(json.dumps(printable(result, approvals, m, k, args.verify_core), indent=2))


if __name__ == "__main__":
    main()
