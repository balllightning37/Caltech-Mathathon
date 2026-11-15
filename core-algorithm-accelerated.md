# Further acceleration: square-root truncation and $O(nk^{5/2})$ LPs

> Consolidated statement of the algorithm, its full complexity, and which factor is the remaining bottleneck: [core-algorithm-best.md](core-algorithm-best.md). This file is the derivation of the square-root truncation and the one-LP-per-repair loop.

## 0. New bound

The constructive algorithm in [core-algorithm-complexity.md](core-algorithm-complexity.md) uses three LPs per repair round and $O(nk^3)$ variables and constraints per LP at the Hare quota. A constant-per-committee correction to its truncated potential reduces the last bound to

$$\boxed{O(nk^{5/2})}$$

without changing any LP optimizer or the number of rounds. A carried-target formulation then reduces each repair to **one LP** rather than three.

The corrected addition loss is $O(U/L^2)$ instead of $O(U/L)$, where $U$ bounds total approved-winner incidences. Consequently, it suffices to take

$$L=\left\lceil\sqrt{\frac{2U}{\delta}}\right\rceil,\qquad
\delta=q-\frac n{k+1}.$$

At the Hare quota, the dense worst case has $U=nk$ and therefore

$$L=\left\lceil\sqrt{2k^2(k+1)}\right\rceil=\Theta(k^{3/2}),$$

rather than $L=\Theta(k^2)$. The new time bound is

$$T_{\rm new}=O\!\left(k^2H_k\left[
\operatorname{\mathscr L}(nk^{5/2},\beta)+b_H+(n+U)\log(n+k)
\right]\right),$$

with at most $2k(k+1)H_k$ exact rational LPs in the carried-target version, rather than $6k(k+1)H_k+1$. Compared with the previous $O(nk^3)$ LP, each LP is smaller by $\Theta(\sqrt k)$; compared with the paper's $O(nk^4)$ LP, it is smaller by $\Theta(k^{3/2})$.

This is an improvement of the derived worst-case upper bounds, not a claim of optimality.

---

## 1. A corrected truncated potential

For an integer dimension $s\ge1$, define the harmonic correction

$$C_L(s)=\sum_{h=1}^{s-1}\frac1{L+h}
=H_{s+L-1}-H_L,$$

with $C_L(1)=0$. For a distribution $x$ on $s$ declared coordinates, define

$$G_L^{(s)}(x)=F_L(x)+C_L(s).$$

For a committee $W$, put $s_i(W)=u_i(W)+1$ and

$$\widetilde V_L(W)
=\max_{(r,p)\in\mathcal P_{124}(W)}
\sum_iG_L^{(s_i(W))}(r_i,p_i).$$

### Lemma 1 (the correction changes no LP optimization)

For fixed $W$ and fixed $W^+=W\cup\{c\}$, the correction terms $C_L(s_i(W))$ are constants independent of the payments. Thus:

- a payment system maximizes $V_L(W)$ if and only if it maximizes $\widetilde V_L(W)$;
- minimum-total-reserve tie-breaking selects exactly the same system for both objectives;
- the existing LP is unchanged. Only the truncation parameter $L$ and the value used in the potential argument change.

Moreover,

$$0\le G_L^{(s)}(x)\le H_{s-1}.$$

**Proof.** Nonnegativity follows from $F_L\ge0$ and $C_L\ge0$. By concavity and symmetry, $F_L$ on the $s$-dimensional simplex is maximized at the uniform distribution. There $t_\ell=1/(s+\ell)$, so

$$F_L(\mathrm{uniform}_s)=H_{s-1}-C_L(s),$$

and hence $G_L^{(s)}(x)\le H_{s-1}$ for every $x$. $\square$

In particular, $0\le\widetilde V_L(W)\le nH_k$ on every $k$-committee. The sharper bound $\widetilde V_L(W)\le\sum_iH_{\min(|A_i|,k)}$ is also immediate.

---

## 2. The corrected Robin Hood identity

For every distribution $x$ on $s$ coordinates, the full-set term in the maximum defining $t_L$ gives

$$\frac1{s+L}\le t_L(x)\le\frac1{L+1}.$$

Define its **uniform-tail excess**

$$e_L(x)=t_L(x)-\frac1{s+L}\ge0. \tag{1}$$

It has the useful upper bound

$$e_L(x)
\le\frac1{L+1}-\frac1{s+L}
=\frac{s-1}{(L+1)(s+L)}
\le\frac{s-1}{(L+1)^2}. \tag{2}$$

### Lemma 2 (corrected one-step identity)

$$\boxed{
G_L^{(s+1)}(\Phi x)-G_L^{(s)}(x)
=\|x\|_\infty-e_L(x).}
$$

**Proof.** The old truncation identity gives

$$F_L(\Phi x)-F_L(x)=\|x\|_\infty-t_L(x),$$

while

$$C_L(s+1)-C_L(s)=\frac1{s+L}.$$

Adding these equations proves the claim. $\square$

The leading $1/L$ error is replaced by the uniform-tail excess, whose aggregate bound is quadratic in $1/L$.

---

## 3. Addition with quadratic truncation loss

Let $E(W)=\sum_i u_i(W)$ and let $U$ be a computable upper bound on $E(W)$ over all $k$-committees. One may use $U=\min\{b,nk\}$, or restrict $b$ to the high-degree candidates after preprocessing.

### Lemma 3 (corrected addition)

Under the hypotheses of the old addition lemma,

$$\widetilde V_L(W\cup\{c\})
\ge\widetilde V_L(W)+q-\frac{E(W)}{(L+1)^2}
\ge\widetilde V_L(W)+q-\frac{U}{(L+1)^2}.$$

**Proof.** Let $R=\sum_{i\in N_c}r_i\ge q$ and $\lambda=q/R\le1$. Use the same Robin Hood operation and convex mixture as in the old proof. For a supporter with current dimension $s=s_i(W)$, the correction in every new $(s+1)$-dimensional distribution is the same, so concavity still applies. The new contribution, minus the old one, is at least

$$\lambda(r_i-t_L(x_i))+\frac1{s+L}.$$

Summing over supporters gives

$$\widetilde V_L(W\cup\{c\})-\widetilde V_L(W)
\ge q-\lambda\sum_{i\in N_c}t_L(x_i)
+\sum_{i\in N_c}\frac1{s_i+L}.$$

Since $\lambda\le1$ and $e_L(x_i)\ge0$,

$$\lambda t_L(x_i)-\frac1{s_i+L}\le e_L(x_i).$$

Consequently the gain is at least $q-\sum_{i\in N_c}e_L(x_i)$. By (2),

$$\sum_{i\in N_c}e_L(x_i)
\le\sum_{i\in N_c}\frac{u_i(W)}{(L+1)^2}
\le\frac{E(W)}{(L+1)^2},$$

as claimed. $\square$

---

## 4. Deletion loses at most $n/(k+2)$

### Lemma 4 (corrected deletion)

The same minimum-total-reserve optimizer, de-reservation, and minimum-payment candidate $z$ used before satisfy

$$\widetilde V_L(X\setminus\{z\})
\ge\widetilde V_L(X)-\frac n{k+2}.$$

**Proof.** Consider a supporter $i$ of $z$, and let $\hat p_i$ be the de-reserved payment vector with $p=\|\hat p_i\|_\infty=\hat p_{iz}$. If $\hat p_i$ has $s$ declared coordinates, the original optimal distribution is $\Phi\hat p_i$ in $s+1$ declared dimensions. Applying Lemma 2 to $\hat p_i$ gives

$$G_L^{(s)}(\hat p_i)-G_L^{(s+1)}(x_i)
=-p+e_L(\hat p_i)\ge-p.$$

After deleting $z$, the replacement distribution is $\hat p_i$ up to a permutation and zero coordinates. Non-supporters of $z$ retain both their base objective and their correction term. Therefore the corrected deletion loss is at most $\sum_i\hat p_{iz}$. Summing over all $k+1$ candidates and using (P1)--(P2),

$$\sum_{z\in X}P_z
=\sum_i(1-\hat r_i)
\le n-\sum_i\frac1{1+u_i(X)}
\le n-\frac n{k+2},$$

because $u_i(X)\le k+1$; hence some candidate has $P_z\le n/(k+2)$. This is sharp when all voters approve all members of $X$. $\square$

Thus the correction introduces a nonnegative term that can only improve the old deletion bound.

---

## 5. Termination with $L=\lceil\sqrt{2U/\delta}\rceil$

Run the constructive algorithm unchanged except for the new $L$. If a round does not return a certificate, Lemmas 3 and 4 give

$$\begin{aligned}
\widetilde V_L(W')
&\ge \widetilde V_L(W)+q-\frac n{k+2}-\frac{U}{(L+1)^2}\\
&>\widetilde V_L(W)+q-\frac n{k+2}-\frac\delta2\\
&=\widetilde V_L(W)+\gamma,
\end{aligned}$$

because $L+1>\sqrt{2U/\delta}$, so $U/(L+1)^2<\delta/2$. The guaranteed gain is

$$\gamma=q-\frac n{k+2}-\frac n{2k(k+1)}
=\frac nk\cdot\frac{3k+2}{2(k+1)(k+2)}.$$

In the one-LP carried formulation, the selected deletion candidate may be the newly added candidate. The committee then remains fixed, but the carried payment potential still increases by more than $\gamma$, so this remains a valid repair round.

Since $0\le\widetilde V_L(W)\le nH_k$, there are at most

$$\left\lfloor\frac{nH_k}{\gamma}\right\rfloor
=\left\lfloor\frac{2k(k+1)(k+2)H_k}{3k+2}\right\rfloor
=\frac23k^2H_k+O(kH_k)$$

rounds, or the same statement with $\bar V$ instead of $nH_k$. The exit test is unchanged: a current optimal payment system whose losing reserve sums are all strictly below $q$ is an exact (P1)--(P4) certificate. No floating-point or full-entropy approximation is involved.

In pseudocode, the truncation parameter is

```text
U = min(total relevant approval incidences, n*k)
L = ceil_sqrt(2*U/delta)       # rather than ceil(2*D/delta)
```

The correction need not be optimized: for fixed committee dimensions it is a constant in the LP and is needed only to reason about progress.

### 5.1 Carrying a payment system: one LP per repair

The current committee does not have to be optimized from scratch. Carry a feasible payment system $x$ for $W$ and a certified lower bound $\ell$ on its corrected entropy. Start with zero payments, so $x$ is feasible and $\ell=0$.

If some loser $c$ has reserve sum at least $q$, Lemma 3 gives a feasible system $y$ on $X=W\cup\{c\}$ with corrected entropy at least

$$\ell+q-\frac{E_c(W)}{(L+1)^2},\qquad E_c(W)=\sum_{i\in N_c}u_i(W).$$

Set this target to $\tau$. Now solve **one LP**:

$$\begin{aligned}
\text{minimize}\quad &\sum_i r_i\\
\text{subject to}\quad &(r,p)\in\mathcal P_{124}(X),\\
&\text{corrected entropy}\ge\tau.
\end{aligned}$$

The entropy inequality is linear in the existing water-level variables: it is one upper bound on $Z=\sum_{i,\ell}t_{i\ell}$. Feasibility is guaranteed by the addition lemma.

Let $(r^X,p^X)$ be the minimum-reserve target-feasible system. The canonical-system proof still applies: if an unsaturated candidate $d$ had $p_{id}<r_i$ for a supporter, the exchange used for property (7) would preserve the entropy target and strictly lower reserve, contradicting minimality. Thus the de-reservation and deletion proof applies. After choosing the minimum-total de-reserved-payment candidate $d$, the resulting feasible system $x'$ for $X\setminus\{d\}$ has

$$\text{corrected entropy}(x')\ge\tau-\frac n{k+2}
=\ell+\delta-\frac{E_c(W)}{(L+1)^2}.$$

Update the lower bound `lower` accordingly.

The candidate $d$ is allowed to equal the newly added $c$. In that case the committee is unchanged, but the carried payment system has strictly higher certified entropy; this is a legitimate payment-repair round. All progress remains measured by the potential lower bound, never by committee change.

Thus the loop is:

```text
x = zero payments; lower = 0
loop:
    if every losing reserve sum is < q:
        return W and x                  # exact P1--P4 certificate
    choose a violating loser c
    solve ONE minimum-reserve target-feasibility LP for W+c
    de-reserve; delete the minimum-payment candidate d
    carry the resulting feasible system for W+c-d
    lower = lower + delta - E_c(W)/(L+1)^2
```

The current committee is never re-optimized and there is no final LP. A repair therefore costs one LP, not three. The carried system is not assumed optimal; optimality was only needed when the proof derived a gain relative to the current *maximum*. Here the lower bound is carried explicitly instead.

### 5.2 Event-driven de-reservation

The paper describes de-reservation as up to $n+k+1$ continuous stages. A direct array update over every voter and candidate at every stage costs $O((n+k)(n+U))$ arithmetic per repair.

This can be reduced to

$$O((n+U)\log(n+k))$$

with an exact kinetic-heap implementation. Between events, each active voter's reserve falls at the constant rate equal to their number of approved open winners, and each open candidate's total payment rises at the constant rate equal to their number of active supporters. Store an anchor value and anchor time for each voter, candidate, and active voter-candidate pair. Two lazy heaps hold:

- the next voter-exhaustion time $t+\hat r_i/|A_i\cap U|$;
- the next candidate-saturation time $t+(q-\sum_j\hat p_{jc})/d_c$.

At a candidate event, only its supporters' widths change. At a voter event, only that voter's approved open candidates change demand. Every voter deactivates once, every candidate closes once, and every approval pair changes status at most once. Therefore there are $O(n+U)$ entity changes and $O(n+U)$ heap insertions/removals. Pair payments are materialized at their status-change events with the accumulated elapsed time, so the implementation returns exactly the same rational de-reserved payment system as the stage-by-stage process; it is not a fluid approximation.

The shipped exact code uses this event-driven routine. It was checked against the direct stage implementation on 1,000 independent random rational de-reservation instances before being used in the full algorithm.

---

## 6. Complexity comparison

At the Hare quota, use $U=nk$ for a uniform dense worst-case bound. Then

$$L_{\rm new}=\left\lceil\sqrt{2k^2(k+1)}\right\rceil,
\qquad \text{LP size}=O(nkL)=O(nk^{5/2}).$$

| Quantity | Paper | Previous fast version | Corrected version |
|---|---:|---:|---:|
| $L$ | $\Theta(k^3)$ | $\Theta(k^2)$ | $\Theta(k^{3/2})$ |
| Size of one LP | $O(nk^4)$ | $O(nk^3)$ | $O(nk^{5/2})$ |
| LPs per repair | $k(m-k)+1$ | $3$ | $1$ |
| Repair-round bound | $O(k^2H_k)$ | $O(k^2H_k)$ | $\frac23k^2H_k+O(kH_k)$ |
| Total LP calls | $O(k^3(m-k)H_k)$ | $O(k^2H_k)$ | $O(k^2H_k)$; bound $2k(k+1)H_k$ |
| De-reservation per round | not separately bounded | $O((n+k)(n+U))$ | $O((n+U)\log(n+k))$ |

For the general quota, the new LP size is

$$O\!\left(nk\sqrt{\frac U\delta}\right).$$

If exact-LP cost scales as $s^\alpha$, the comparison of LP-work upper-bound expressions gains a further factor $\Theta(k^{\alpha/2})$ over the previous fast version. In particular, a nearly linear LP-input cost gains $\Theta(\sqrt k)$ and a cubic cost gains $\Theta(k^{3/2})$.

LP working space similarly drops from $O(nk^3)$ LP input size to $O(nk^{5/2})$ in the uniform dense bound.

---

## 7. Verification

A prototype evaluated the corrected potential explicitly while using the unchanged payment LPs. It checked every corrected potential increase against both

$$\Delta\widetilde V_L\ge\delta-\frac{E(W)}{(L+1)^2}
\quad\text{and}\quad
\Delta\widetilde V_L>\frac\delta2,$$

and independently enumerated every candidate proposal to verify ordinary core stability on return.

All 3,570 prior regression instances passed:

- 1,350 random instances with $2\le m\le6$, $2\le n\le7$;
- 1,920 exhaustive small-profile instances;
- 300 larger random instances with $6\le m\le8$ and $8\le n\le12$.

No instance exceeded two repair rounds in these prototype suites. In addition, the delivered exact-`z3` implementation using the new level passed 100 baseline random instances and 100 harder instances with more high-support candidates than seats. In the harder batch, all 100 instances required repairs; they used 108 repair rounds and 108 total LP solves, exactly one per round. Every payment certificate was verified exactly and every committee passed independent exhaustive ordinary-core verification. The exact integer ceiling-square-root routine also passed boundary tests on a rational grid. The same shipped one-LP implementation also passed all 1,920 exhaustive small-profile cases, including 460 cases with repair rounds (up to two rounds per instance); these used 474 LP solves, exactly one per round, and had maximum truncation level 9. A separate finite-subset, exact-rational test of the corrected identities and inequalities passed 3,000 additional checks. Maximum levels of 11 and 13 were observed in the two exact-`z3` batches, respectively.

These tests support but do not substitute for Lemmas 1--4, which provide the correctness proof. The exact rational implementation uses the new truncation level via an integer-only ceiling-square-root routine. No sub-quadratic-in-$L$ claim is made: inequality (2) is the mechanism, and the square-root dependence on $U/\delta$ follows directly from it.
