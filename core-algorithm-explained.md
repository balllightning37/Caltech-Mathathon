# The core algorithm, without the technical machinery

This note explains both the paper's local-search algorithm and the faster constructive version. The complete exact-rational implementation is in [core_algorithm.py](core_algorithm.py). A proof of the latest square-root truncation improvement is in [core-algorithm-accelerated.md](core-algorithm-accelerated.md); the same bound is derived in section 5 of the [algorithm explainer](https://balllightning37.github.io/Caltech-Mathathon/algorithm.html).

## 1. What are we trying to find?

There are $n$ voters, $m$ candidates, and $k$ seats. Voter $i$ approves a set $A_i$ of candidates. If committee $W$ is elected, that voter's utility is

$$u_i(W)=|A_i\cap W|,$$

the number of approved candidates elected.

The relevant quota is

$$q=\frac nk.$$

Think of $q$ voters as the share of the electorate that justifies one seat.

A committee is **core-stable** if no group can nominate an affordable alternative that every member strictly prefers. More precisely, there must be no coalition $S$ and proposal $T$ such that:

- every voter in $S$ gets more approved candidates from $T$ than from $W$;
- $|S|\ge q|T|$, so the coalition has at least $q$ voters per proposed seat.

So we are looking for a committee for which no sufficiently large coalition is unanimously better off.

## 2. The payment certificate: the key picture

Give every voter an imaginary budget of $1$. They may spend parts of it on approved candidates in the elected committee. Whatever they do not spend is called their **reserve**.

A good reserve is like money available to support a challenge to the committee.

Call $p_{ic}$ voter $i$'s payment to winner $c$, and $r_i$ voter $i$'s reserve. The paper proves that $W$ is core+ (and therefore core-stable) if payments can be chosen with these four properties:

1. **Budget:** $r_i+\sum_{c\in A_i\cap W}p_{ic}=1$.
2. **Reserve dominance:** every individual payment is at most the reserve: $p_{ic}\le r_i$.
3. **Winner cap:** each winner receives total payments at most $q$.
4. **No threatening loser:** for each loser $c$, their supporters have total reserve strictly less than $q$:
   $$\sum_{i\in N_c}r_i<q.$$

Rules 1 and 2 describe an individual voter's split. Rule 3 prevents a winner being overcharged. Rule 4 says that no unelected candidate has enough unused support to destabilise the committee.

### Why these four rules imply core stability

Suppose coalition $S$ prefers $T$ to $W$.

For each coalition member, electing $T$ supplies enough new approved candidates to account for their whole unit budget:

- approved winners already in $T$ retain their original payments;
- enough newly approved candidates in $T$ can each claim the voter's reserve;
- strict improvement guarantees that there are enough such new candidates.

Therefore the proposed candidates in $T$ can collectively extract at least $|S|$ from the coalition.

But now count from the candidates' side:

- each winner in $T$ can collect at most $q$, by rule 3;
- each loser in $T$ can collect strictly less than $q$, by rule 4;
- strict improvement requires at least one approved loser in $T$.

So $T$ collects strictly less than $q|T|$. Hence

$$|S|<q|T|,$$

which contradicts affordability. No such coalition can exist.

**The computational goal is therefore to find a committee and payments satisfying all four rules.** Core+ allows a stronger fractional version of blocking, and the same certificate rules that out too.

## 3. Where harmonic entropy enters

There can be many valid payment splits for a fixed committee. The algorithm needs a good way to choose among them.

The paper's objective rewards **balanced** splits. In the ideal, uniform situation where a voter has $u$ approved winners, they split their unit budget equally among those $u$ winners and their reserve. Every piece has size $1/(u+1)$, and that voter contributes the harmonic number

$$H_u=1+\frac12+\cdots+\frac1u.$$

Paying $1/3$ to each of two winners and keeping $1/3$ in reserve is more balanced than paying $2/3$ to one winner and keeping $1/3$.

The winner caps in rule 3 can force non-uniform splits. Harmonic entropy measures how close a feasible split is to balanced. A linear program chooses the feasible payment system maximizing the sum of these scores.

Two operations make the proof work:

- **Add a candidate.** Its supporters introduce a payment coordinate for that candidate. A "Robin Hood" operation moves excess from larger payment coordinates to the new coordinate. This increases harmonic entropy by essentially the supporters' reserves.
- **Delete a candidate.** After a redistribution called *de-reservation*, one can bound the entropy lost by deleting a candidate.

The algorithm uses a finite truncation of the harmonic-entropy series. This is why its evaluation is a rational linear program rather than an infinite-sum computation.

## 4. The paper's algorithm: test every possible swap

Start with any committee $W$ of size $k$.

1. Use an LP to find the best feasible payment system for $W$.
2. For every pair consisting of a winner to remove and a loser to add, use another LP to evaluate the resulting committee.
3. If one swap raises the truncated score by at least $\delta/2$, perform it and repeat.
4. If no such swap exists, return $W$.

Here

$$\delta=q-\frac{n}{k+1}.$$

For the Hare quota, $\delta=n/(k(k+1))$.

### Why a violation tells us that a good swap exists

Suppose losing candidate $c$ has at least $q$ total reserve among its supporters.

- Adding $c$ increases the ideal objective by at least $q$.
- After adding $c$, the committee has $k+1$ members. Some member can be deleted at a loss of at most $n/(k+1)$.
- Therefore some swap gains at least
  $$q-\frac{n}{k+1}=\delta>0.$$

So if no swap gains enough, every losing candidate must have reserve sum below $q$, giving the certificate we want.

Each accepted swap increases the bounded potential by at least $\delta/2$, which supplies the polynomial iteration bound.

**The expensive feature is clear:** finding one improving swap by brute force examines $k(m-k)$ neighbours, with a large LP for each.

## 5. The faster algorithm: let the violation choose the swap

The add/delete proof already tells us where to look. We need not inspect all the other neighbours.

Start with any $k$-committee and repeat:

1. **Optimize current payments once.**
2. **Check the certificate directly.** If every loser has reserve sum below $q$, return immediately.
3. Otherwise choose a loser $c$ whose supporters have at least $q$ in reserve.
4. Temporarily form $X=W\cup\{c\}$ and solve two LPs for $X$:
   - the first maximizes truncated harmonic entropy;
   - the second, among those maximizers, minimizes total reserve. This tie-break is required by the deletion proof.
5. De-reserve the resulting system, and delete a candidate of minimum total de-reserved payment.

The potential gain is guaranteed. There is no need to compare all the other swaps.

### What de-reservation does

Initially some voters still have reserves even though they approve winners that have not reached their payment cap $q$.

De-reservation spends those reserves at equal rates on their still-unsaturated approved winners. A stage ends when:

- a voter exhausts their reserve; or
- a candidate reaches the cap $q$.

The implementation processes the same stages with kinetic heaps, so its work is $O((n+U)\log(n+k))$ rather than rescanning every voter and winner at every stage.

Afterwards, choose the candidate with the smallest total payment. Total payments are at most $n$, and there are $k+1$ candidates, so this minimum is at most

$$\frac{n}{k+1}.$$

In the entropy accounting, deleting that candidate costs at most its total payment. This is exactly the deletion bound needed above.

### Why fewer LPs also means smaller LPs

Truncation loses a small amount of the Robin Hood addition gain. A further correction adds a constant that depends only on the current committee and the number of water levels. Because it is constant within each LP, it changes no payment optimizer.

This correction improves the addition-loss bound to

$$\frac{E(W)}{(L+1)^2},$$

where $E(W)=\sum_i u_i(W)$ counts approved-winner incidences. Taking

$$L=\left\lceil\sqrt{\frac{2U}{\delta}}\right\rceil,$$

with $U\ge E(W)$, makes the total addition loss less than $\delta/2$. Every repair round therefore still increases the corrected potential by more than $\delta/2$. The correction is used only in this proof; the algorithm does not even need to compute it.

At the Hare quota, the largest truncation level is now $\Theta(k^{3/2})$, down from $\Theta(k^2)$ in the previous fast version and $\Theta(k^3)$ in the paper. The corresponding LP sizes are $O(nk^{5/2})$, $O(nk^3)$, and $O(nk^4)$, respectively. Each repair round uses one LP rather than $k(m-k)+1$.

## 6. Safe preprocessing

A candidate with fewer than $q$ approvers can never accumulate $q$ units of reserve, because every reserve is at most $1$.

Therefore:

- if at most $k$ candidates have at least $q$ approvers, put all of them in the committee, fill the remaining seats arbitrarily, and use zero payments with all reserves equal to $1$;
- otherwise the local search may restrict itself to candidates with at least $q$ approvers. Low-degree candidates are harmless losers in any final certificate.

This step is exact, not a heuristic.

## 7. Using the code

The implementation uses `z3` exact rational linear arithmetic. It does not use floating-point LP tolerances.

Files:

- [core_algorithm.py](core_algorithm.py): both algorithms, JSON output, exact certificate checks, and an optional exhaustive ordinary-core checker.
- [core_example.json](core_example.json): a small input.

Input:

```json
{
  "m": 3,
  "k": 2,
  "A": [[0, 2], [0, 1]]
}
```

Candidates are numbered from $0$ to $m-1$, and `A[i]` lists the candidates approved by voter $i$.

Run the faster algorithm:

```bash
python3 core_algorithm.py core_example.json --algorithm fast --verify-core
```

Run the paper's original neighbourhood search:

```bash
python3 core_algorithm.py core_example.json --algorithm paper --verify-core
```

For the supplied example, the carried-target fast algorithm returns committee `[0,2]` in one repair, using one LP. Its verified reserves are $1/3$ and $1/2$. The paper algorithm returns `[0,1]` after its neighbourhood scan. Both committees pass the independent ordinary-core check.

The fast JSON output includes:

- `committee`: the chosen candidates;
- `rounds`: carried-target repair rounds, including a possible payment-only round with the committee unchanged;
- `lp_solves`: exact LP count (equal to `rounds` in fast mode);
- `certificate`: exact rational reserves and payments;
- `certificate_verified`: rules (P1)--(P4) were checked exactly;
- `ordinary_core_verified`: the optional exhaustive checker found no blocking proposal.

The `--verify-core` flag enumerates $2^m-1$ candidate proposals and is intended for small inputs. It is independent of the payment-certificate check.

The fast algorithm also works as a Python function:

```python
from core_algorithm import fast_core

A = [{2, 3}, {2, 3}, {0, 1}, {0, 1}]
result = fast_core(A, m=4, k=2)
print(result["committee"])  # [1, 2]
```

This profile requires a repair. The exact implementation uses one round and one LP solve, matching the one-LP-per-round claim above. The paper implementation uses six solves for that same starting committee and scan order.

## 8. What was tested

The delivered exact-`z3` implementation was checked on 100 hard random one-LP fast-mode instances, all 1,920 exhaustive small-profile one-LP fast-mode instances, and 30 random paper-mode instances covering $2\le m\le6$, $2\le n\le8$, every sampled $1\le k\le m$, varied densities, and duplicated ballots. Every fast-mode payment certificate was checked exactly, and every returned committee in both modes was independently verified by exhaustive ordinary-core enumeration.

A dedicated repair example checked the secondary LP, de-reservation, deletion, and strict round/LP-count behaviour.

Exact rational solving is slow and the implementation prioritises readability over engineering performance. Floating-point LP solvers can be substituted only with rigorous certification; changing tolerances in the payment comparisons is not a correctness-preserving implementation of the algorithm.
