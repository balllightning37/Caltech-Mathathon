# A core committee in polynomial time: the algorithm, its complexity, and where the slack is

**Result.** For every approval election $(N,C,(A_i),k)$ a core-stable $k$-committee can be computed
with at most
$$N_{\rm LP}=1+\left\lfloor\frac{2\bar V}{\delta}\right\rfloor,\qquad
\bar V=\sum_{i\in N}H_{\min(|A_i|,k)}\le nH_k,\qquad \delta=\frac n{k(k+1)},$$
exact rational linear programs, each with $O\bigl((n+E_W)L\bigr)$ variables and constraints, where
$E_W=\sum_{c\in W}|N_c|\le U:=\min\{b,nk\}$, $b=\sum_i|A_i|$, and the truncation level is
$$L=\left\lceil\sqrt{2U/\delta}\right\rceil .$$
At the Hare quota in the dense worst case this is $O(k^2H_k)$ LPs of size $O(nk^{5/2})$, i.e.
$$T=O\!\left(k^2H_k\Bigl[\mathscr L\bigl(nk^{5/2},\log n\bigr)+b+nk\log(n+k)\Bigr]\right),$$
in the exact-rational-LP model $\mathscr L(s,\beta)$. This is the smallest bound proved so far that is
polynomial in all parameters; Section 6 states exactly which factor would have to fall to improve it.
When the candidate excess $m-k$ is $O(1)$ there is a different algorithm that is much faster ---
$\binom{m}{k}$ LPs of size $O(b+n+m)$, and a factor about $k^{5/2}\log k$ at $m=k+1$ (Section 9). And the
repair rounds themselves need **no LP at all**: with the payment-free potential $\Phi(W)=\sum_iH_{u_i(W)}$
each round costs $O(b+m)$ arithmetic, the round bound is $k(k+1)H_k$, and linear programming is needed only
to certify or repair a committee whose winner is over-subscribed --- which cannot happen at all when
$k\le2$ or $|N_c|\le2n/k$, where the algorithm is complete without any LP (Section 10).

Everything below is either proved (Section 3), or an explicit numerical check with its range (Section 7).

---

## 1. Setting

Voters $N$, $n=|N|$; candidates $C$, $m=|C|$; approval sets $A_i\subseteq C$; total input size
$b=\sum_i|A_i|$; committee size $k\le m$; Hare quota $q=n/k$; $u_i(X)=|A_i\cap X|$;
$N_c=\{i:c\in A_i\}$.

$W\subseteq C$ with $|W|=k$ is **core-stable** if for every non-empty $T\subseteq C$
$$\bigl|\{i\in N:\ u_i(T)>u_i(W)\}\bigr|<q|T| .\tag{1}$$
Only $|T|\le k$ matters. Existence for every instance is the theorem of Becker--Greger--Peters
(arXiv:2609.11912); the question here is to compute one.

**Certificate.** A family $x_{ic}\ge0$ ($i\in N$, $c\in A_i\cap W$) with
$r_i:=1-\sum_{c\in A_i\cap W}x_{ic}$ and
$$\textbf{(C1)}\ r_i\ge0,\qquad
\textbf{(C2)}\ x_{ic}\le r_i,\qquad
\textbf{(C3)}\ \sum_{i\in N_c}x_{ic}\le q\ (c\in W),\qquad
\textbf{(C4)}\ \sum_{i\in N_c}r_i<q\ (c\notin W)$$
implies (1) by the counting argument of `core-short.md` Lemma 1: a blocking $T$ collects at least $|S_T|$
and at most $q|T\cap W|+\sum_{c\in T\setminus W}\sum_{i\in N_c}r_i<q|T|$.

So it suffices to *find* a $k$-set carrying a certificate, and $(C1)$--$(C3)$ along the way are a convex
feasibility condition, while $(C4)$ is a finite list of $m-k$ strict linear inequalities. That is what the
algorithm maintains.

---

## 2. The algorithm

The recommended implementation first runs the **payment-free loop** of Section 10, which needs no LP at
all; the pseudocode below is the fallback that is always available and always terminates.

```text
Core(A, k):
    q = n/k;  delta = q - n/(k+1);  U = min(b, nk);  L = ceil(sqrt(2U/delta))
    H = { c in C : |N_c| >= q }                       # high-degree candidates
    if |H| <= k:  return any k-set containing H, with r_i = 1, p_ic = 0

    C = H                                             # low-degree candidates are irrelevant
    W = the k candidates of largest degree            # see Section 5.1
    x = zero payments (r_i = 1, p = 0);  lower = sum_i (H_{u_i(W)+L} - H_L)

    loop:
        R_c = sum_{i in N_c} r_i   for every c in C \ W
        if R_c < q for all such c:  return W, x        # (C1)--(C4) hold: W is core-stable

        choose a violating loser c (R_c >= q), preferring small E_c(W) = sum_{i in N_c} u_i(W)
        X = W + c
        target = lower + q - E_c(W)/(L+1)^2
        solve ONE exact rational LP:
             minimise  sum_i r_i
             subject to (C1),(C2),(C3) on X,  and  corrected entropy >= target
        de-reserve the solution; let d in X minimise the de-reserved total payment sum_i p_hat_{id}
        W = X \ {d};  lower = target - n/(k+1)
        carry the resulting feasible payment system for W
```

The LP is the only expensive step. Written out, with $t_{i\ell}$ the water levels of voter $i$'s
distribution $x_i=(r_i,(p_{ic})_{c\in A_i\cap X})$,
$$\max\ \sum_{i\in N}\sum_{\ell=0}^{L-1}\frac1{\ell+1}\ -\ \sum_{i\in N}\sum_{\ell=0}^{L-1}t_{i\ell}
\quad\text{s.t.}\quad
r_i+\sum_{c}p_{ic}=1,\ \ 0\le p_{ic}\le r_i,\ \ \sum_{i\in N_c}p_{ic}\le q,\ \
a_{ij\ell}\ge x_{ij}-t_{i\ell},\ \ \sum_j a_{ij\ell}\le\ell t_{i\ell},$$
and the carried lower bound enters as the single linear row
$\sum_{i,\ell}t_{i\ell}\le\sum_i H_{u_i(X)+L}-\text{target}$, since
$\sum_iG^{(s_i(X))}_L=\sum_iH_{u_i(X)+L}-\sum_{i,\ell}t_{i\ell}$. The objective of the *carried* version is the reserve sum, so
the LP is a plain rational LP with no artificial weights.

**Two implementation details are load-bearing.** (i) The deletion must include the de-reservation:
merging $d$'s payment back into the reserve *without* it is not the operation Lemma D bounds, because the
merge cost is not additive in the payments (`core-short.md` Section 3(c)). Witness: $n=4$, $m=4$, $k=3$,
$A=\{\{0,1\},\{1,2\},\{2,3\},\{0,3\}\}$. The optimum of $C$ is uniform, $(r,p,p)=(\frac13,\frac13,\frac13)$;
de-reserving gives $0,\frac12,\frac12$ and deleting $d=0$ gives entropy exactly $5=6-1$, while the merge
gives $14/3<5$ --- below the lemma's own guarantee, after which the carried bound drifts above the true
value. A second, smaller witness, with no truncation involved: $n=3$ voters all approving all of
$C$, $k=2$, $X=C$; the optimum is $11/6$ per voter, folding the payment into the reserve gives
$F(\frac12,\frac14,\frac14)=\frac43$, a loss of $\frac32$ against $n/(k+1)=1$, while the de-reserved
deletion loses exactly $1$. (ii) Voters who do not support $d$ keep their *pre-de-reservation* system. Done correctly the
algorithm returns on that instance after one round and one LP, with certificate reserves
$(\frac12,\frac13,\frac13,\frac12)$.

`results/core_algorithm.py` is an exact-rational implementation (z3), with `--verify-core` checking (1)
by brute force over all $T$. It starts from the first $k$ candidates rather than from the highest-degree
$k$-set of Section 5.1; that changes only the initial value of `lower`.

---

## 3. Correctness

Let $s_i(X)=u_i(X)+1$ and, for a distribution $x$ on $s$ declared coordinates,
$$t_\ell(x)=\max_{\emptyset\ne S\subseteq D}\frac{\sum_{j\in S}x_j}{|S|+\ell},\quad
F_L(x)=\sum_{\ell=0}^{L-1}\Bigl(\frac1{\ell+1}-t_\ell(x)\Bigr),\quad
C_L(s)=\sum_{h=1}^{s-1}\frac1{L+h},\quad
G^{(s)}_L(x)=F_L(x)+C_L(s).$$
Write $\widetilde V_L(X)=\max\{\sum_iG^{(s_i(X))}_L(x_i):x\in\mathcal P_{124}(X)\}$, where
$\mathcal P_{124}$ is $(C1)$--$(C3)$ on $X$.

**Lemma A (range).** $0\le G^{(s)}_L(x)\le H_{s-1}$ on the $s$-simplex; hence
$0\le\widetilde V_L(X)\le\sum_iH_{u_i(X)}\le\bar V$ for $|X|\le k$.

*Proof.* $F_L\ge0$, $C_L\ge0$. By concavity and symmetry $F_L$ is maximised at the uniform point, where
$t_\ell=1/(s+\ell)$, so $F_L({\rm uniform}_s)=H_{s-1}-C_L(s)$. $\square$

**Lemma B (one-step identity).** With $\Phi$ the Robin Hood shift ($t_\ell(\Phi x)=t_{\ell+1}(x)$),
$$G^{(s+1)}_L(\Phi x)-G^{(s)}_L(x)=\|x\|_\infty-e_L(x),\qquad
e_L(x)=t_L(x)-\frac1{s+L},\qquad 0\le e_L(x)\le\frac{u}{(L+1)^2}$$
for a distribution whose declared dimension is $s=u+1$.

*Proof.* The truncation identity $F_L(\Phi x)-F_L(x)=\|x\|_\infty-t_L(x)$ telescopes; the correction
contributes $C_L(s+1)-C_L(s)=1/(s+L)$; and
$e_L\le\frac1{L+1}-\frac1{s+L}=\frac{s-1}{(L+1)(s+L)}\le\frac{u}{(L+1)^2}$. $\square$

**Lemma C (addition).** Let $x\in\mathcal P_{124}(W)$ be any feasible system (not necessarily optimal)
with $\sum_{i\in N_c}r_i\ge q$ for a candidate $c\notin W$. Then
$$\widetilde V_L(W\cup\{c\})\ \ge\ \sum_iG^{(s_i(W))}_L(x_i)+q-\frac{E_c(W)}{(L+1)^2},\qquad
E_c(W)=\sum_{i\in N_c}u_i(W).$$

*Proof.* Apply $\Phi$ to every supporter's distribution, put the new coordinate on $c$, and mix with
weight $\lambda=q/R_c\le1$ ($R_c=\sum_{i\in N_c}r_i$) against the old system extended by a zero payment.
Feasibility is preserved and concavity plus Lemma B give the gain
$q-\lambda\sum_{i\in N_c}t_L(x_i)+\sum_{i\in N_c}1/(s_i+L)\ge q-\sum_{i\in N_c}e_L(x_i)$, which
Lemma B bounds by $q-E_c(W)/(L+1)^2$. $\square$

**Lemma D (deletion).** For a committee $X$ with $|X|=j\ge k+1$, an entropy-maximal payment system for
$X$ chosen with minimum total reserve admits after de-reservation a candidate $d\in X$ with
$$\widetilde V_L(X\setminus\{d\})\ \ge\ \widetilde V_L(X)-\frac nj .$$

*Proof.* This is `core-short.md` Lemma 4 (canonical form $(\ast)$, de-reservation, blow-up) with $F$
replaced by $G_L$. The canonical-form step there uses only that the potential is **symmetric and concave**,
not that it is harmonic entropy: for any symmetric concave $\psi$ and any target $\tau$, a minimiser of
$\sum_ir_i$ subject to $(C1)$--$(C3)$ and $\sum_i\psi(x_i)\ge\tau$ satisfies $(\ast)$, because each
exchange in that step is a convex combination with a coordinate transposition, so $\psi$ does not decrease
while $\sum_ir_i$ strictly falls. That is what makes the carried-target LP of Section 2 sound, and it means
a cheaper symmetric concave potential could replace $G_L$ without losing this lemma. The only change is
Step 4, where Lemma B gives
$G^{(s)}_L(\hat x_i)-G^{(s+1)}_L(x_i)=-p+e_L(\hat x_i)\ge-p$ with $p=\hat x_{id}$, so the loss is still
$\sum_{i\in N_d}\hat x_{id}$, which is at most $n/|X|$ by averaging
$\sum_{d\in X}\sum_i\hat x_{id}\le n$. $\square$

**Termination.** If a round does not return, then
$$\widetilde V_L(W')-\widetilde V_L(W)\ \ge\ q-\frac n{k+1}-\frac U{(L+1)^2}
=\delta-\frac U{(L+1)^2}\ >\ \frac\delta2,$$
because $L+1>\sqrt{2U/\delta}$. The carried bound `lower` therefore increases by more than $\delta/2$ per
round, while by Lemma A it never exceeds $\bar V$; so the loop stops, and it stops only at a certificate.
Then $(C1)$--$(C4)$ hold and `core-short.md` Lemma 1 gives core stability. $\blacksquare$

Note where exactness is needed: $L$ may depend on the instance, but a *single* $L$ must be used
throughout (it defines $\widetilde V_L$), and the exit test $R_c<q$ is a strict rational comparison.

---

## 4. Complexity

| Quantity | Paper, Algorithm 1 | Here |
|---|---:|---:|
| truncation level $L$ | $\lceil 2nk/\delta\rceil=\Theta(k^3)$ | $\lceil\sqrt{2U/\delta}\rceil=\Theta(k^{3/2})$ |
| LPs per repair round | $k(m-k)+1$ | $1$ |
| LPs in total | $O(k^3(m-k)H_k)$ | $1+\lfloor2\bar V/\delta\rfloor\le1+2k(k+1)H_k$ |
| LP size (dense worst case) | $O(nk^4)$ | $O(nk^{5/2})$ |
| extra work per round | --- | $O(b)$ for the reserve sums, $O((n+U)\log(n+k))$ de-reservation |
| input preprocessing | --- | $O(b+m)$ |

**With the payment-free loop (Section 10) the repair rounds need no LP at all:** $O(k(k+1)H_k)$ rounds
of $O(b+m)$ exact arithmetic, and a linear program is needed only to certify or repair a committee with an
over-subscribed winner. In the regimes $k\le2$ or $\max_c|N_c|\le2n/k$ no LP is needed at any point.

Derivation. (i) *Rounds.* Range $\bar V$, gain $>\delta/2$: at most $2\bar V/\delta$ rounds.
(ii) *One LP per round.* The addition lemma is used as an existence statement for the target entropy, so
the target-feasibility LP is feasible; optimality of the current system is never needed, only a carried
lower bound. So a repair costs one LP, and no final LP is needed because the return test is a direct
certificate check. (iii) *LP size.* The LP has one variable $t_{i\ell}$ for each $i$ and $\ell<L$, and one
auxiliary per incidence of $i$ with a declared coordinate, i.e. $O\bigl((n+E_X)L\bigr)$ variables and
constraints with $E_X=\sum_{c\in X}|N_c|\le U$. (iv) *Level.* The addition loss is $U/(L+1)^2$, not
$U/(L+1)$, thanks to the constant correction $C_L$; killing it against $\delta/2$ gives
$L=\Theta(\sqrt{U/\delta})$. (v) *Values.*
$\delta=n/(k(k+1))$; $U=nk$ in the dense case; $2U/\delta=2k^2(k+1)$, so $L=\Theta(k^{3/2})$ and the LP
has $O(nk^{5/2})$ variables.

Substituting a cubic-time exact LP solver $\mathscr L(s,\beta)=O(s^3\beta^{O(1)})$ and
$L=\Theta(k^{3/2})$ gives the concrete polynomial
$$O\!\left(n^3k^{19/2}\log k+nk^3\log k\log(n+k)\right)$$
arithmetic operations on rationals of polynomial bit length (in the dense regime $U=nk$); any polynomial-time LP algorithm
keeps the whole procedure polynomial. For the general quota $n/(k+1)<q\le n/k$ replace $\delta$ by
$q-n/(k+1)$ everywhere.

---

## 5. Refinements that cost nothing

**5.1 Start from the highest-degree committee.** The zero-payment system has corrected entropy
$\sum_iC_L(u_i(W)+1)=\sum_i\sum_{h=1}^{u_i(W)}1/(L+h)$, which is increasing in
$\sum_i u_i(W)=\sum_{c\in W}|N_c|$. Taking the $k$ candidates of largest degree maximises it, so the
round bound improves to $1+\lfloor2(\bar V-\text{lower}_0)/\delta\rfloor$ at no cost ($O(m\log m+b)$).

**5.2 The LP splits over connected components.** The payment LP couples voters only through shared
candidates of $X$, so its constraint matrix is block diagonal over the connected components of the
bipartite graph on $(N,X)$ with edges $i$--$c$ for $c\in A_i\cap X$, and the objective is separable. Solve
one LP per component (a voter with no approved winner in $X$ is omitted: $r_i=1$, entropy $0$). Same
bound, much smaller LPs in practice.

**5.3 Sparsity.** $U=\min\{b,nk\}$, so $L=\Theta(\sqrt{bk^2/n})$ for sparse instances; and the LP size is
$O((n+E_W)L)$ with $E_W\le\min\{b,nk\}$, not $O(nmL)$.

**5.4 Free exactness when the caps are slack.** If the uniform system is admissible, i.e.
$\sum_{i\in N_c}\frac1{u_i(W)+1}\le q$ for every $c\in W$, then it sits at the per-voter ceiling, so the
corrected potential equals its upper bound, $\widetilde V_L(W)=\sum_iH_{u_i(W)}$ for *every* $L$.
Consequently the potential can be evaluated with $L=1$ — no level variables at all — and adding a losing
$c$ (with the same condition at $W+c$) gains exactly $\sum_{i\in N_c}\frac1{u_i(W)+1}$, with no
truncation correction. The $\Theta(k^{3/2})$ levels are needed only when some cap binds; testing the
condition costs $O(b)$. Note this is a statement about *evaluating* the potential, not about which
committees are certifiable: the uniform system is not a certificate in general. Example: $n=4$, $m=5$,
$k=4$, $q=1$, every voter approving only $c_0$, $W=\{c_0,c_1,c_2,c_3\}$. Then $u_i(T)\le1=u_i(W)$ for
every $T$, so $W$ is core-stable, yet the uniform system overloads $c_0$ ($4\cdot\frac12=2>q$), while
$p_{ic_0}=\frac14$, $r_i=\frac34$ is a valid system.

**5.5 High-degree preprocessing.** A losing candidate with $|N_c|<q$ can never violate $(C4)$ since
$r_i\le1$; so candidates of degree $<q$ can be dropped from the search (and restored afterwards: a
certificate for the restricted instance is a certificate for the original one). If the high-degree set
$H$ has $|H|\le k$, the zero-payment system is already a certificate and the answer is immediate.

---

## 6. Where the remaining slack is, exactly

Write the cost as $N_{\rm LP}\cdot\mathscr L(\text{size})$. Both factors are now understood.

*Size.* $L=\lceil\sqrt{2U/\delta}\rceil$ is optimal to within a factor $\sqrt2$ **in this accounting**,
and that is proved, not conjectured. The per-voter truncation error has the exact supremum
$$e_L(x)=t_L(x)-\frac1{s+L}\;\le\;\frac1{L+1}-\frac1{s+L}=\frac{s-1}{(L+1)(s+L)},$$
attained at a point mass, whereas Lemma B uses $\frac{s-1}{(L+1)^2}$; the two differ by the factor
$\frac{L+1}{s+L}\in[\frac12,1]$. Since this error must be killed against $\delta/2$, the least
admissible level is $\Theta(\sqrt{U/\delta})$, and no sharper *per-voter* constant lowers it by more than
$\sqrt2$. Moreover $G_L-G_{L+1}=e_L$ identically, so
$$G_L=G_\infty+\sum_{\ell\ge L}e_\ell:$$
the entire $L$-dependence of the potential is the tail of these excesses, and $e_\ell(x)=0$ for
$\ell\ge\ell^*(x)=\max_{t<s,\,T_t<1}(sT_t-t)/(1-T_t)$. Hence the LP size can fall below $O(nk^{5/2})$
only through one of two doors, both open: a bound on $\sum_{i\in N_c}e_L(x_i)$ at the *optimal* system
rather than for arbitrary systems (equivalently $\ell^*(x_i)$ uniformly small, which is controlled by
$1-r_i$), or a different potential.

*Rounds.* $N_{\rm LP}=1+\lfloor2\bar V/\delta\rfloor$ is the honest weak point: it is
$\Theta(k^2H_k)$ because the potential ranges over $nH_k$ while one swap is only certified to gain
$$q-\frac n{k+1}=\frac n{k(k+1)}.$$
The gain is small because the deletion step must return from a $(k+1)$-set to a $k$-set, and the deleted
candidate's payments can be as large as the average $n/(k+1)$. Three things would improve the bound;
the first is impossible, the other two are open:

1. a certified per-round gain $\Omega(q)$ instead of $\Omega(q/k)$ --- equivalently a deletion bound
   $o(n/(k+1))$, and that is impossible: **the deletion lemma is exactly tight.** Take
   $n=(k+1)s$ voters and $m=k+1$ candidates, every voter approving all candidates but one, cyclically
   (each candidate approved by $sk$ voters). Then every $u_i(X)=k$, so
   $\widetilde V_L(X)=nH_k=\max$, and after deleting *any* $d$ the $sk$ supporters of $d$ drop to $u_i=k-1$
   with $G^{(k)}_{L}\le H_{k-1}$, giving
   $$\widetilde V_L(X)-\widetilde V_L(X\setminus\{d\})=sk\cdot\tfrac1k=\frac n{k+1}$$
   for every $d$ and every $L$; both bounds are attained (uniform distributions), so this is an identity,
   not an estimate. Verified exactly with the shipped LP for $k=2,3,4$ and $s=1,2$: $\widetilde V_L(X)=nH_k$
   and the difference equals $n/(k+1)$ for every $d$. So no choice of the deleted candidate beats $n/(k+1)$.
   The same sandwich at committee size $j\ge k$ (cyclic $j$-sets, $n=js$ voters) gives loss exactly
   $n/j$ for every $d$, so the block-move cost $\sum_jn/(k+j)$ is tight as well. And at a state that
   actually carries a violating loser the loss can be as small as $(1-1/k^2)\,n/(k+1)$: take $n=ks$,
   $W=\{w_1,\dots,w_k\}$, $X=W\cup\{c\}$ and let the voters of $H_t$ approve $X\setminus\{w_t\}$, so
   $N_c=N$ and the flat system on $W$ has $\sum_{i\in N_c}r_i=q$ exactly. Then one round gains exactly
   $n/k^2=\delta(1+1/k)$. So the guaranteed gain $\delta$ is not attained by any known instance, and the
   round bound inherits the corridor $[\delta,\ \delta(1+1/k)]$.
2. a potential with range $O(n)$ and per-swap gain $\Omega(n/k)$ (this would give $O(k)$ rounds). The
   obvious candidate, the reserve count $D=\sum_ir_i$, does not work: $(C2)$ says every payment is at most
   the reserve, so a voter with $s_i$ declared coordinates can never have reserve below $1/s_i$, and a
   round can only spend $r_i-1/s_i$ of voter $i$'s reserve --- zero for a voter already at the floor. The
   decrease of $D$ per round is therefore at most $R_c-\sum_{i\in N_c}1/s_i$, not $\Omega(q)$, and the
   potential stalls on systems whose reserves sit at the floor. (The entropy potential is exactly what
   repairs this: Lemma B turns the floor into the correction $C_L$.)
3. a lower bound showing that $\Omega(k^2)$ rounds really occur for some instance and this scheme (we
   do not have one either);
4. amortising several additions in one round (block moves): with $a$ simultaneous violating losers an
   $a$-block gains about $n\,a(a+1)/(2k(k+a))$, so $a=k$ would give $O(\log k)$ rounds and $O(k\log k)$
   LPs of size $O(nk^2)$ --- $\delta$ rises to $n/(2k)$ and $L$ falls to $\Theta(k)$ at committee size
   $2k$. The obstacle is that every added candidate must be a violating loser *at the system current when
   it is added*, and that cannot be had from the state: **the hypothesis is false.** Take a single-approval
   profile, $A_i=\{c\}$ for every voter, with $\deg(c_0)\ge q$ and $\deg(c)<q$ for all other $c$ (such
   degrees exist for every $k\ge2$, $m\ge k+2$, $n\ge2k$). A voter approving only $c\notin W$ has
   $u_i(W)=0$, hence $r_i=1$ in *every* feasible system, so $\rho_W(c)=\deg(c)$ exactly at every $k$-set
   and in both frameworks: the violator set is $\{c\notin W:\deg(c)\ge q\}$, of size at most one, at every
   reachable state under every policy. Checked at $(n,m,k,\deg)=(6,4,2,(3,1,1,1))$, $(8,5,2,(4,1,1,1,1))$,
   $(9,5,3,(5,1,1,1,1))$, $(10,6,2,(5,1,1,1,1,1))$: over all $k$-sets the maximum number of violators is
   $1$. So no state-local argument can supply the batching gain; it would have to be amortised over a
   trajectory.

*Overshoot.* The algorithm returns a committee satisfying $(C1)$--$(C4)$, i.e. core+, which is strictly
stronger than the core. Explicit separation: $n=2$, $m=3$, $k=2$, $A_1=\{c_0,c_1\}$, $A_2=\{c_0,c_2\}$,
$W=\{c_1,c_2\}$; then $q=1$, every blocking $T$ has $|S_T|<q|T|$, so $W$ is core-stable, yet no
certificate exists, since $p_{ic}\le r_i$ forces $r_1,r_2\ge\frac12$ and the loser $c_0$ then has reserve
sum $\ge1=q$, violating the strict $(C4)$. So the certificate is a sufficient device, not a necessary
one, and a weaker certificate class that is still cheap to optimise would reduce the LP and possibly the
round count. That is open, and it is the most concrete opening left in this scheme.

For orientation: the number of repair rounds was at most **2** in the exhaustive and random suites, and
the deliberately repair-forcing batch needed 108 LPs over 100 instances. Exhaustive sweeps over *all*
approval profiles at $(n,k,m)=(3,2,3),(4,2,3),(3,3,4),(3,2,4)$ give maxima $1,1,1,2$ against the bounds
$18,18,44,18$; a hill-climbing search over about 3,500 instances with $n\le8$, $k\le5$, $m\le k+4$ found
nothing beyond **3** rounds, the witness being $n=6$, $k=3$, $m=6$ with approvals
$\{0,1,3\},\{0,4\},\{2,3,4,5\},\{0,2,3,5\},\{0,3,4\},\{1,3,4\}$ (3 rounds, 3 LPs, output core-stable, and
only 1 round of the payment-free loop of Section 10). So the bound $\Theta(k^2H_k)$ is loose by at least a
factor 15 already at $k=3$ and the binding cost is elsewhere;
the algorithm also returns as soon as *any* visited optimal system satisfies $(C4)$, not only at a
local optimum.

---

## 7. What is checked

* Proved: Lemmas A--D and the termination argument above, on top of `core-short.md` Lemma 1
  (certificate implies core) and the canonical-form/de-reservation argument of its Lemma 4.
* Exact-rational implementation: `results/core_algorithm.py` (z3), one LP per repair, event-driven
  de-reservation, certificate verified for every returned committee, and `--verify-core` for brute-force
  checking of (1).
* Earlier suites (recorded in `core-algorithm-accelerated.md`): 1,350 random instances with $2\le m\le6$,
  $2\le n\le7$; 1,920 exhaustive small-profile instances; 300 random instances with $6\le m\le8$,
  $8\le n\le12$; plus 200 exact-$z3$ instances built to force repairs. No failure, at most two rounds
  each.
* Sharpness of the deletion step (Section 6): proved for all $k\ge2$, $j\ge k$, $s\ge1$ and every $L$,
  and the scripts were re-run here with exact rationals (loss $n/j$ for $k=2..12$, $j=k..2k$, $s=1..5$;
  and $(1-1/k^2)\,n/(k+1)$ with a violating loser present for $k=2..9$, $s=1..5$, $L\in\{1,2,3,5,9\}$).
* Independent rerun for this note: 120 random instances, $3\le m\le6$, $1\le k<m$, $2\le n\le8$, approval
  densities $0.2$--$1.0$; every returned committee passed both the exact certificate check and the brute
  force core test; 72 LPs in total, round histogram $\{0:49,\ 1:70,\ 2:1\}$.
* Pinning of the two cost factors: the deletion step is exactly tight (loss $n/j$ at every committee
  size $j\ge k$, attained for every choice of the deleted candidate), and the truncation step is tight to
  within $\sqrt2$ in $L$ (exact supremum of $e_L$; verified on rational grids $s\le5$, denominators
  $12$, $L\le8$).
* Not checked: no claim that the bounds are optimal, and no claim about floating-point LP solvers ---
  a production implementation must use exact rational arithmetic (or certified refinement), because the
  exit test is a strict inequality at a rational boundary.

---

## 8. Correction to earlier notes

`core-algorithm-complexity.md` says that verifying the ordinary core for a given committee "is
coNP-complete". That statement is not established here and should not be quoted. What is true: the
negation of (1) is an NP-witness ($T$ itself), so membership is in coNP; the exact test is a
maximum-density problem over the threshold functions $1[\,|A_i\cap T|\ge u_i(W)+1\,]$ and the natural
polynomial cases are special (all voters uncovered, where the best ratio is attained at a single
candidate; and two-element ballots with threshold $2$, which is graph density). The literature's hardness
result in this area concerns *auditing* in participatory budgeting with additive utilities
(Munagala--Shen--Wang: no $(1+1/e-\varepsilon)$-approximation), not exact approval-core membership. The
algorithm never needs the exact test: it maintains a certificate instead, which is what makes it
incremental and polynomial.

---

## 9. A second algorithm: exact certification by enumeration

For small candidate excess $m-k$ the truncation and the repair loop are unnecessary, because a *single*
LP decides membership exactly.

**The slack LP.** For a $k$-set $W$ put
$$t(W)=\max_{(r,p)\in\mathcal P_{124}(W)}\ \min_{c\notin W}\Bigl(q-\sum_{i\in N_c}r_i\Bigr).$$
Inserting $t\le q-\sum_{i\in N_c}r_i$ for the $m-k$ losing candidates turns this into an ordinary LP
(the max of a concave piecewise-linear function is attained, $\mathcal P_{124}$ is compact and non-empty
with $p=0,r=1$). Then
$$t(W)>0\iff \mathcal P_{1234}(W)\ne\varnothing\iff W\ \text{carries a certificate},$$
and $t(W)>0$ is one exact rational comparison, so the strict $(C4)$ is decided, not approximated. The LP
has $b_W+n+1$ variables and $n+b_W+m$ constraints with data in $\{0,\pm1,q\}$, i.e. $O(\log n)$-bit
coefficients --- no $L$, no $\delta$, no rounds.

**Algorithm E.** Enumerate the $\binom{m}{k}$ $k$-sets; solve the slack LP; return the first $W$ with
$t(W)>0$. It terminates because some $k$-set carries a certificate (the existence theorem), and what it
returns is core-stable by the certificate lemma. Complexity
$$\binom{m}{k}\cdot\mathscr L\bigl(b+n+m,\log n\bigr).$$

**When it wins.** With $\mathscr L(s)=s^\omega$ and $m\le2k$, the size ratio against the baseline is
$k^{3/2}$ and the LP-count ratio is $\Theta(k^{2-c}\log k)$ with $c=m-k$, so E wins whenever
$$\omega>\frac{c-2}{1.5},$$
in particular for $m-k\le3$ already at $\omega=1$; at $m=k+1$ the LP count drops from $2k(k+1)H_k$ to
$k+1$ and the overall factor is about $k^{5/2}\log k$. Without a cost model the exact condition is
$\binom{m}{k}\mathscr L(b+n+m,\log n)<2k(k+1)H_k\,\mathscr L(nk^{5/2},\log n)$.

**Few candidate types.** If two candidates have the same approver set, swapping them is a bijection of
the feasible set preserving every loser sum, so $t(W)$ depends only on the vector of class counts
$(|W\cap\mathcal C_1|,\dots,|W\cap\mathcal C_p|)$. E then needs at most
$\min\{\binom{m}{k},\binom{k+p-1}{p-1}\}$ LPs, which is polynomial in $k$ for $p=O(1)$: this covers
party-approval instances with $p$ parties and instances with $t$ voter types ($p\le2^t$).

**Limits.** E is exponential in $\min(k,m-k)$ for general $m$, so it does not replace the bound of
Section 4; and its correctness is relative to the existence theorem (it is a reduction to small LPs, not
a new existence proof). Its practical merit is that it is exact and far simpler: one LP per committee,
no truncation level, no repair loop, no de-reservation. Certificate $\Rightarrow$ core was checked
exhaustively over all profiles with $m\le3,n\le3$ and $m\le4,n\le2$ (7,480 (instance, $k$-set) pairs, no
violation, and some core+ $k$-set in every instance).

---

## 10. The LP is only needed to certify congested committees

Everything above uses the truncated harmonic entropy and the payment system to obtain the per-round gain
$\delta$. That machinery is unnecessary for the *progress* argument, because the plain potential
$$\Phi(W)=\sum_{i\in N}H_{u_i(W)}$$
has exact one-step identities
$$\Phi(W{+}c)-\Phi(W)=\rho_W(c):=\sum_{i\in N_c}\frac1{u_i(W)+1},\qquad
\Phi(W)-\Phi(W\setminus\{a\})=\sum_{i\in N_a}\frac1{u_i(W)},$$
each a one-line consequence of $H_{m+1}-H_m=1/(m+1)$. Hence for a $(k+1)$-set $X$
$$\sum_{d\in X}\ \sum_{i\in N_d}\frac1{u_i(X)}=\sum_{i:\,u_i(X)\ge1}\frac{u_i(X)}{u_i(X)}=n'\le n,$$
so deleting the argmin costs at most $n/(k+1)$ --- with no de-reservation, no optimality and no LP.

```text
PaymentFree(W):                          # state: the committee only, no payments
  repeat
    rho_c = sum_{i in N_c} 1/(u_i(W)+1)  for every candidate c            # O(b+m)
    if rho_c <= q for c in W  and  rho_c < q for c not in W:  return W    # certified at the equal point
    if some loser c has rho_c >= q:  X = W+{c};  W = X minus argmin_d sum_{i in N_d} 1/u_i(X)
    else:  return CONGESTED             # a winner is over-subscribed; go to Section 2
```

Each repair raises $\Phi$ by at least $q-n/(k+1)=\delta$ while $\Phi\le nH_k$, so there are at most
$k(k+1)H_k$ rounds of $O(b+m)$ work and **zero** LPs. The certificate is the equal-share system
$p_{ic}=r_i=\frac1{u_i+1}$: it meets $(C1),(C2)$ with equality, and both its winner loads and its
loser reserve sums equal $\rho_W(c)$.

**Where it is complete.** For a winner $c$, $u_i(W)\ge1$ on $N_c$, so $\rho_W(c)\le|N_c|/2$; the winner
cap therefore holds automatically when $|N_c|\le2n/k$, and always when $k\le2$ (then $q=n/k\ge n/2$). On
those instances the loop always returns: a complete, strongly combinatorial algorithm in
$O(k(k+1)H_k(b+m))$ arithmetic operations, with no LP, against $2k(k+1)H_k$ LPs of size $\Theta(nk^{5/2})$.

**Where it cannot be complete.** If all $n$ voters approve only $c^*$ and $k\ge2$, then
$\rho_W(c^*)=n/(1+[c^*\in W])\ge n/2\ge q$ for *every* $k$-set, so no committee passes the test, although
every $k$-set containing $c^*$ is core-stable --- certified by the *priced* system $p_{ic^*}=q/n$, not by
the equal-share one. So the LP's prices are not redundant: they are exactly what an over-subscribed
winner requires.

**Consequence for the algorithm.** Run the payment-free loop to convergence (no LP), then certify the
endpoint with one slack LP (Section 9); only if that fails, continue with the LP-based loop of Section 2.
The worst case is unchanged, but the rounds are combinatorial and the LP appears only where it is
provably needed. Caution: the winner condition cannot be dropped --- states exist where every *loser* has
$\rho_W(c)<q$ and $W$ is still not core-stable (2 witnesses in 314,652 exact (instance, $W$) pairs), so
returning on the loser test alone is unsound.

**Checked** (independent implementation, exact rationals, 143 random instances with $m-k\le3$, $k\le4$):
every round gain was at least $\delta$; 135 runs terminated certified, each returned committee verified
core-stable by brute force, with zero LPs; 8 runs were congested; the largest number of rounds was 2.
