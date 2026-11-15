# Why harmonic entropy is natural in the core proof

*A motivation and literature note for Becker–Greger–Peters, [Existence of the Core in Approval-Based Committee Elections, arXiv:2609.11912v2](https://arxiv.org/abs/2609.11912v2). Section and theorem references below are to v2 (3 November 2026).*

## The short answer

> **Harmonic entropy is the potential obtained by extending PAV from uniform voter payments to non-uniform, quota-capped payments while preserving the exact marginal-gain identity that makes PAV's swap proof work.**

The phrase “entropy rewards balanced payments” is true but incomplete. Balance alone would suggest Shannon entropy, but it does not supply the exact addition identity used by this proof. The essential requirements are:

1. on a uniform distribution over $d$ payment destinations, recover the PAV score $H_{d-1}$;
2. when a new approved candidate is paid by water-filling, increase the score by **exactly the voter's old reserve**;
3. retain concavity, symmetry, and invariance under adding zero coordinates.

Requirements (1) and (2) lead directly to the recursive definition of harmonic entropy and thence to its series formula. Requirement (3) is what lets the proof repair a winner's quota violation by averaging payment systems.

There is a second useful formulation:

> **It is PAV with an imbalance penalty, optimized over all payment systems obeying the per-winner quota.**

Indeed, writing $V(W)$ for the committee objective and $\mathrm{PAV}(W)$ for the ordinary PAV score, Becker–Greger–Peters prove
$$V(W)\leq \mathrm{PAV}(W),$$
with equality whenever the uniform payment system of $W$ already satisfies the payment caps (Appendix D, Lemma D.3).

More structurally, Lemma D.2 proves that **PAV is exactly the harmonic-entropy objective optimized over $P_{123}$**. The harmonic-entropy rule optimizes over $P_{124}$ instead: replace the loser-reserve condition (P3) with the winner cap (P4), then use the swap argument to prove that (P3) reappears at the optimum. This constraint-level comparison is the cleanest formal statement of how the new rule extends PAV.

---

## 1. What the objective has to accomplish

Each voter $i$ splits a unit budget into payments $p_{ic}$ to approved winners and a reserve $r_i$. The payment characterization of core+ uses four conditions:

| condition | content | economic role |
|---|---|---|
| (P1) | $r_i+\sum_{c\in A_i\cap W}p_{ic}=1$ | unit budget |
| (P2) | $p_{ic}\leq r_i$ | every payment is backed by at least as much reserve |
| (P3) | $\sum_{i\in N_c}r_i<q$ for every loser $c$ | no losing candidate has one quota of reserve behind it |
| (P4) | $\sum_{i\in N_c}p_{ic}\leq q$ for every winner $c$ | no winner overcharges its supporters |

Theorem 3.2 says that a committee admits a payment system satisfying all four conditions **if and only if it satisfies core+**; core+ implies the ordinary core. For the existence proof, (P1), (P2), and (P4) are imposed by restricting the feasible payment systems. The task is to force (P3) by optimization.

The tension is visible already:

- (P2) discourages spending too much: large reserve must remain.
- (P3) discourages spending too little: supporters of a loser must not collectively retain a whole quota.
- (P4) may force non-uniform payments because some winners cannot accept their uniform share.

A successful objective must resolve all three at once.

## 2. PAV supplies the prototype, not just a name

If voter $i$ has $u_i=u_i(W)$ approved winners, split her unit budget uniformly among those winners **and the reserve**. Every coordinate is $1/(u_i+1)$, so

$$r_i=\frac1{u_i+1},\qquad p_{ic}=\frac1{u_i+1}\quad(c\in A_i\cap W).$$

Her PAV contribution is $H_{u_i}=1+\frac12+\cdots+\frac1{u_i}$.

Two elementary identities make the classic PAV swap argument work.

**Addition.** Adding an approved candidate changes $u_i$ to $u_i+1$, and the gain is exactly the old reserve:

$$H_{u_i+1}-H_{u_i}=\frac1{u_i+1}=r_i.$$

So, for every candidate $c\notin W$,
$$\mathrm{PAV}(W\cup\{c\})-\mathrm{PAV}(W)=\sum_{i\in N_c}r_i.$$

**Deletion and averaging.** If $W'$ has $k+1$ members, deleting $d$ costs voter $i$ the amount $1/u_i(W')$ when $i$ approves $d$. Summing all deletion costs gives

$$\sum_{d\in W'}\sum_{i\in N_d}\frac1{u_i(W')}
 =\sum_{i:\,u_i(W')>0}u_i(W')\frac1{u_i(W')}
 \leq n.$$

Some deletion therefore costs at most $n/(k+1)$.

Consequently, if a loser has reserve mass at least $q$, add it (gain at least $q$), then delete a cheap candidate (lose at most $n/(k+1)$). At the Hare quota $q=n/k$, the net gain is at least

$$q-\frac{n}{k+1}=\frac{n}{k(k+1)}>0,$$

contradicting PAV optimality. This proves (P3) for the uniform payment system.

**The obstruction.** The uniform payment system can violate (P4): PAV can overcharge supporters of some winners. Section 4, Figure 2, gives a four-voter, eight-seat example. The natural repair is to optimize over non-uniform payments satisfying (P4), but then the simple marginal-gain identity is lost. Harmonic entropy is designed specifically to restore it.

### The example turns the slogan into a comparison

Take $k=8$, $q=1/2$, and ballots
$$A_1=\{c_1,c_2,c_3\},\quad A_2=\{c_1,c_2,c_4\},\quad A_3=A_4=\{c_5,\ldots,c_{10}\}.$$
The PAV-optimal committee $W=\{c_1,c_2,c_5,\ldots,c_{10}\}$ is blocked by $T=\{c_1,c_2,c_3,c_4\}$: voters 1 and 2 have utility $2$ from $W$ but $3$ from $T$, and $|S|=2=q|T|$. Under uniform payments, both voters pay $1/3$ to $c_1$ and $1/3$ to $c_2$, so each receives $2/3>q=1/2$: the cap (P4) fails.

By contrast, $W'=\{c_1,c_2,c_3,c_5,\ldots,c_9\}$ has an explicit certificate. The two committees have the same PAV score, $7.9$, but exact evaluation gives
$$V(W)=\frac{227}{30}\approx7.5667,$$
whereas the certificate on $W'$ has value $467/60\approx7.7833$. The capped, non-uniform payments therefore separate a non-core committee from a feasible core alternative that PAV cannot distinguish. This is the most direct illustration of what is gained by jointly optimizing payments and committees.

## 3. Deriving the potential instead of postulating it

### 3.1 The right way to add a payment destination

Let $x=(x_1,\ldots,x_d)$ be a voter's reserve-and-payment distribution. When one new coordinate is introduced, the **Robin Hood operator** $\Phi$ caps all old coordinates at a water level $t_1$ and puts the removed mass into the new coordinate:

$$\Phi(x)=(\min\{x_1,t_1\},\ldots,\min\{x_d,t_1\},t_1),
 \qquad t_1=\sum_j(x_j-t_1)^+.$$

This is not an arbitrary reallocation. Among all extensions that add a coordinate without increasing any old coordinate, it is the least concentrated one in the majorization order (Appendix B, Proposition B.3). In payment language, it funds a new candidate as evenly as possible **without increasing any old winner's payment**, so old (P4) constraints survive.

For the $\ell$-fold version, write $t_\ell(x)=\|\Phi^\ell(x)\|_\infty$. Equivalently,

$$t_\ell(x)=\max_{\varnothing\neq S\subseteq[d]}
 \frac{\sum_{j\in S}x_j}{|S|+\ell},
 \qquad \ell t_\ell(x)=\sum_j(x_j-t_\ell(x))^+\quad(\ell\geq1).$$

The second display is the water-filling equation; the first is useful for proving concavity.

### 3.2 Impose PAV's values and PAV's addition law

Demand that the score agree with PAV on uniform payments,

$$F\bigl((1/d,\ldots,1/d)\bigr)=H_{d-1},$$

and that opening a new payment coordinate by $\Phi$ reproduce the reserve identity,

$$F(\Phi x)=F(x)+\|x\|_\infty.$$

For a reserve-and-payment vector, (P2) says that the reserve is a largest coordinate, so $\|x\|_\infty=r_i$. Thus the second demand is precisely

$$F(\Phi x_i)-F(x_i)=r_i,$$

now for arbitrary non-uniform payments.

These two demands already determine $F$: keep applying $\Phi$ until the distribution becomes uniform and subtract the successive largest coordinates. Passing to the limit gives the series in the paper,

$$F(x)=\sum_{\ell=0}^{\infty}\left(\frac1{\ell+1}-t_\ell(x)\right).$$

So the infinite series is not an assumption pulled from thin air. It is the closed form obtained by unwinding PAV's marginal-gain law under water-filling.

The shift identity $t_\ell(\Phi x)=t_{\ell+1}(x)$ makes the key calculation a telescope:

$$\begin{aligned}
F(\Phi x)
 &=\sum_{\ell\geq0}\left(\frac1{\ell+1}-t_{\ell+1}(x)\right)
  =\sum_{j\geq1}\left(\frac1j-t_j(x)\right),\\
 F(x)
 &=1-t_0(x)+\sum_{j\geq1}\left(\frac1{j+1}-t_j(x)\right).
\end{aligned}$$

Subtracting gives $F(\Phi x)-F(x)=t_0(x)=\|x\|_\infty$, because $\sum_{j\geq1}1/(j(j+1))=1$.

There are two complementary points here. On one hand, the index shift formally gives the boundary gain $t_0$ for any convergent series $G(x)=\sum_{\ell\geq0}(a_\ell-t_\ell(x))$, not just for the harmonic reference. On the other hand, the gain identity itself forces the harmonic numbers: if $G(\Phi x)=G(x)+\|x\|_\infty$, and $c_D$ is its value on the uniform distribution on $D$ coordinates, then $\Phi$ takes uniform$_D$ to uniform$_{D+1}$ and hence $c_{D+1}=c_D+1/D$. Iterating until $x$ becomes uniform therefore proves that $G=F+c$ for a constant $c$, without assuming concavity, symmetry, or continuity. The alternative reference sequences that one could write down differ only by this additive constant when they converge.

So the strongest statement is not merely that PAV normalization happens to pick out a convenient potential: **the exact reserve identity already determines harmonic entropy up to one constant, and PAV's $H_{d-1}$ values on uniform payments are a corollary.** Setting the point-mass value to zero fixes $c=0$.

### 3.3 A concrete example

The paper's example is $x=(1/2,1/3,1/6)$. Exact calculation gives

$$\begin{aligned}
\Phi x&=(5/18,5/18,1/6,5/18),\\
\Phi^2x&=(5/24,5/24,1/6,5/24,5/24),\\
\Phi^3x&=(1/6,\ldots,1/6).
\end{aligned}$$

The water levels are $t_0=1/2$, $t_1=5/18$, $t_2=5/24$, and the uniform endpoint has score $H_5$. Hence

$$F(x)=H_5-\frac12-\frac5{18}-\frac5{24}=\frac{467}{360}\approx1.29722.$$

This is below $H_2=1.5$, the score of the uniform three-coordinate distribution: non-uniformity carries a penalty.

## 4. Why exactly this makes the main proof work

For each committee $W$, optimize over payment systems satisfying (P1), (P2), and (P4):

$$V(W)=\max_{(r,p)\in P_{124}(W)}\sum_iF(r_i,p_i).$$

The whole proof is an addition–deletion comparison.

### Addition: a reserve violation buys at least one quota of potential

Suppose an optimal system for $W$ has a losing candidate $c$ with

$$R:=\sum_{i\in N_c}r_i\geq q.$$

Apply $\Phi$ to every supporter of $c$. Each supporter gains exactly $r_i$ of harmonic entropy, so the total gain is $R$. The new candidate may receive too much, however, so mix the new system with the old one (extended by zero payments to $c$), with weights $\lambda=q/R$ and $1-\lambda$. Concavity gives value at least $V(W)+\lambda R=V(W)+q$, while the new candidate's payments are capped by $\lambda R=q$. Therefore

$$V(W\cup\{c\})\geq V(W)+q \qquad\text{(Theorem 6.2).}$$

This step explains why both the exact reserve identity **and concavity** are indispensable.

### Deletion: some candidate can be sold back cheaply

For any $W'$ with $|W'|\geq k+1$, there is a candidate $d$ for which

$$V(W'\setminus\{d\})\geq V(W')-\frac{n}{|W'|}
 \qquad\text{(Theorem 6.3).}$$

The intuitive bookkeeping is the same as for PAV: total payments are at most $n$, so the candidate receiving least receives at most $n/|W'|$. The technical de-reservation step prepares the payment system so that removing $d$ and relabelling its payment as reserve makes each supporting voter's entropy loss **exactly** her payment to $d$. One can view this as running the Robin Hood addition identity backwards. Summing those exact losses gives the averaging bound.

**The deletion bound is genuinely tight.** Take $n=4$, candidates $\{0,1,2,3\}$, $k=2$, and ballots
$$A_1=\{1,2,3\},\quad A_2=\{2,3\},\quad A_3=\{0,1,3\},\quad A_4=\{1,2\}.$$
On $W=\{1,2,3\}$, utilities are $(3,2,2,2)$ and uniform payments satisfy (P1), (P2), and (P4), so $V(W)=\mathrm{PAV}(W)=H_3+3H_2=19/3$. Deleting any candidate leaves a pair with PAV score $5$, again with feasible uniform payments. Every deletion therefore loses exactly $19/3-5=4/3=n/|W|$. The Hare-quota margin is exactly $n/(k(k+1))=2/3$.

The de-reservation is therefore not an unrelated algorithmic decoration: it is what turns the potential loss back into a monetary loss that can be averaged.

### The swap closes the proof

If a size-$k$ maximizer $W$ of $V$ violated (P3) through $c$, then adding $c$ and deleting a suitable $d$ would give a size-$k$ committee with value at least

$$V(W)+q-\frac{n}{k+1}=V(W)+\frac{n}{k(k+1)}>V(W)$$

at the Hare quota. This is impossible. Every loser must satisfy $\sum_{i\in N_c}r_i<q$. The optimal payment system satisfies all of (P1)–(P4), hence certifies core+, and therefore the ordinary core is non-empty (Theorems 3.2 and 6.5).

The same comparison also works at suitable approximate local optima, which is the basis of the polynomial-time local-search result.

## 5. Why Shannon entropy is not enough

Shannon entropy has the continuous-water-level representation

$$H_{\mathrm{Sh}}(x)=-\sum_jx_j\ln x_j
 =\int_0^\infty\left(\frac1{s+1}-t_s(x)\right)ds,$$

whereas harmonic entropy sums the analogous expression over integral $\ell$. This is the precise sense in which harmonic entropy is a discrete analogue, not merely another entropy-flavoured objective.

Under Robin Hood addition, the two gains are

$$F(\Phi x)-F(x)=t_0(x)$$

and

$$H_{\mathrm{Sh}}(\Phi x)-H_{\mathrm{Sh}}(x)=\int_0^1t_s(x)\,ds\leq t_0(x).$$

The second expression may fall short of the old reserve, so it does not supply the exact gain $R\geq q$ used in the addition lemma.

### An exact interpolation between the harmonic and Shannon cases

For a step size $\delta>0$, define
$$F_\delta(x):=\delta\sum_{\ell\geq0}\left(\frac1{1+\ell\delta}-t_{\ell\delta}(x)\right).$$
Thus $F_1=F$, and $F_\delta$ tends to Shannon entropy as $\delta\to0$ because its definition is a Riemann sum for the integral above. The real-capacity shift $t_s(\Phi x)=t_{s+1}(x)$ gives, exactly,
$$F_\delta(\Phi x)-F_\delta(x)
 =\delta\sum_{\ell\geq0}\bigl(t_{\ell\delta}(x)-t_{\ell\delta+1}(x)\bigr).$$

Now take $\delta=1/m$ and group indices by their residue modulo $m$. Each residue class telescopes, yielding
$$F_{1/m}(\Phi x)-F_{1/m}(x)
 =\frac1m\sum_{a=0}^{m-1}t_{a/m}(x).$$

So one candidate move is credited with the arithmetic mean of the water levels $t_0,t_{1/m},\ldots,t_{(m-1)/m}$. For $m=1$, this is precisely the reserve $t_0=\|x\|_\infty$. For every $s>0$, substituting $t_0$ into the water-level constraint gives $st_0>0=\sum_j(x_j-t_0)_+$, so $t_s<t_0$. Hence every $m\geq2$ averages in positive-capacity levels strictly below $t_0$, and its credit is strictly smaller. As $m\to\infty$, these means converge to Shannon's $\int_0^1t_s(x)\,ds$.

**Moral:** the unit grid credits a whole candidate by the top of its water-level interval, while finer grids and the continuous limit average over the whole interval. Integral candidate changes can spend reserve without an averaging loss; the continuous case cannot.

The simplest example is $x=(1/2,1/2)$. Then $\Phi x$ is uniform on three coordinates:

- harmonic gain: $H_2-H_1=1/2$, exactly the old reserve;
- Shannon gain: $\ln3-\ln2\approx0.405465<1/2$.

Here $t_s(x)=1/(s+2)$, so $\int_0^1t_s(x)ds=\ln3-\ln2$.

**Moral:** “favor balance” motivates the family of candidates; the **discrete harmonic marginal law** is what proves the theorem.

## 6. What earlier papers actually contribute

### 6.1 The closest genuine ancestors

| paper | what it contributes to this proof's lineage | what it does **not** do |
|---|---|---|
| Thiele (1895), [*Om Flerfoldsvalg*](https://dominik-peters.de/archive/thiele1895.pdf) | PAV: harmonic utility increments $1,1/2,1/3,\ldots$ and the original additive structure. | Does not introduce voter reserve/payment systems or this $F$. |
| Peters and Skowron (2020), [*Proportionality and the Limits of Welfarism*](https://arxiv.org/abs/1911.11747) | MES and priceability make payment reasoning central; Theorem 6 proves PAV's factor-2 utility approximation to the core; Theorem 7 proves MES's $O(\log k)$ approximation; Theorem 10 proves that no welfarist rule always returns a core committee. | Does not define harmonic entropy. The non-welfarist obstruction explains why the objective must use more information than the voters' utility levels alone. |
| Moulin (2016), [*Entropy, Desegregation, and Proportional Rationing*](https://eprints.gla.ac.uk/116506/) | A primary example of entropy optimization under capacity constraints. Definition 3 minimizes the strictly convex $\sum z\ln z$ entropy functional for proportional assignment and rationing, including individual deficits; Theorem 1 characterizes the rules using consistency and related axioms. | Uses conventional entropy in a different allocation model, not harmonic entropy or a core-swap potential. |
| Kroer and Peters (2026), [*Computing Lindahl Equilibrium for Public Goods with and without Funding Caps*](https://arxiv.org/abs/2503.16414) | A convex program with a partially normalized entropy term computes Lindahl equilibria for divisible public goods, yielding weak-core outcomes (and core outcomes under the paper's stated assumptions). Its objective includes $-\sum b_{ij}\log(b_{ij}/x_j(b))$, with $x_j(b)=\sum_i b_{ij}$. This is the closest market/entropy precursor cited by Becker–Greger–Peters. | It is not the integral committee theorem and not the harmonic $F$. The phrase “maximizes Shannon entropy” is only a loose summary of the normalized objective. |
| Foley (1970), [*Lindahl's Solution and the Core of an Economy with Public Goods*](https://doi.org/10.2307/1909241); Fain, Goel, and Munagala (2016), [*The Core of the Participatory Budgeting Problem*](https://arxiv.org/abs/1610.03474) | The Lindahl-equilibrium route to core stability in divisible public-goods settings; Fain–Goel–Munagala develop the participatory-budgeting connection and computation. | Fractional equilibrium existence does not by itself produce an integral core committee. |

**The priceability bridge: Gölz–Yaghoubizade (2026).** Their [*Approval-Based Apportionment: Like Portioning, Approximately like Committee Voting*](https://arxiv.org/abs/2608.27605) is especially relevant to the motivation, although it does not use harmonic entropy. In apportionment, Theorem 2.2 proves that Lindahl priceability is equivalent to **bounded PAV improvement**, and Theorem 2.3 proves that locally PAV-optimal committees are priceable. Their proof explicitly writes the uniform payments $p'_{ij}=W(j)/(u_i(W)+1)$ and the remaining reserve $1/(u_i(W)+1)$. In committee elections, their 1-frugal Lindahl priceability is the same condition that Becker–Greger–Peters express as (P1)–(P4), equivalent to core+ by Proposition A.4. Their Theorem 4.2 proves that frugal Lindahl priceability implies bounded PAV improvement, while bounded PAV improvement implies 2-frugal Lindahl priceability.

So a broad claim that PAV had never been analyzed through payments would be wrong. The sharper statement is that harmonic entropy introduces a new potential on the payment/price system, preserving PAV's marginal-gain identity while allowing **non-uniform** payments under the constraints that yield exact core+ feasibility. Bounded PAV improvement is not the same as PAV-optimality, and this potential step is not a corollary of Gölz–Yaghoubizade's theorem.

Becker–Greger–Peters explicitly call their harmonic entropy **new** in Section 5 and a “novel harmonic entropy objective” in the abstract of v2. I did not locate an earlier paper using this specific Robin Hood/water-level functional $F$. That is a bounded literature-search result, not a proof that no related formula has ever appeared elsewhere.

### 6.2 A genuine later application: utility-weighted harmonic entropy

Piotr Skowron's [*Core Up-To-One for Participatory Budgeting with Additive Utilities*](https://arxiv.org/abs/2609.15928) (v1, 14 September 2026) explicitly extends Becker–Greger–Peters from approval utilities and equal candidate costs to additive utilities and unequal costs. This is a real use of the same construction, not merely another occurrence of the phrase.

For masses $x_j$ with positive utility weights $a_j$, Skowron replaces the water level by a maximum payment **density**

$$f_t^a(x)=\max_J\frac{\sum_{j\in J}x_j}{t+\sum_{j\in J}a_j}$$

and defines

$$F^a(x)=\sum_{\ell\geq0}\left(\frac1{\ell+1}-f_\ell^a(x)\right).$$

Setting every $a_j=1$ recovers Becker–Greger–Peters's $t_\ell$ and $F$ exactly. Intuitively, balancing prices per unit of utility replaces balancing payments per coordinate. The objective becomes $E(W)- (n/b)\operatorname{cost}(W)$, with $q_c=n\operatorname{cost}(c)/b$.

The same mechanism identified above reappears explicitly:

- Lemma 3 gives the addition bound $E(W+c)-E(W)\geq\min\{R_c,q_c\}$, where $R_c=\sum_i r_i u_i(c)$, with strict improvement when $R_c>q_c$.
- Lemma 4 exploits an infeasible total cap $\sum_{c\in W}q_c>n$ to find a deletion with entropy loss strictly below $q_d$.
- Theorem 1 then concludes that the Max-Payment-Entropy Rule satisfies **core-up-to-one**.

This later paper is additional evidence that the essential idea is the exact reserve/density accounting in an add–delete swap, not simply an aesthetic preference for harmonic numbers.

### 6.3 Other uses of the words “harmonic entropy” — do not confuse them

Several publications use the same name for different objects:

- Octavio César Mesner, [*The Harmonic Entropy Estimator: Minimax Optimality and Semiparametric Efficiency for Infinite Alphabets*](https://arxiv.org/abs/2505.20153), uses harmonic transforms of counts to estimate **Shannon entropy**. It is statistics, not the potential above.
- Paul Erlich's musical/psychoacoustic harmonic entropy, discussed in William Sethares's [appendix on harmonic entropy](https://sethares.engr.wisc.edu/paperspdf/HarmonicEntropy.pdf), measures uncertainty in assigning musical intervals to harmonic ratios. It is unrelated to voting or payment systems.
- B. Korenblum, [*Some Problems in Potential Theory and the Notion of Harmonic Entropy*](https://doi.org/10.1090/S0273-0979-1983-15120-0), defines a harmonic $k$-entropy for potential theory. It is also unrelated.

Citing any of these as the source of Becker–Greger–Peters's construction would be a mistake.

## 7. The surrounding core-voting literature

The new proof fits into four earlier lines of work, as organized in Section 1 of Becker–Greger–Peters.

### Cohesive-group representation rather than the full core

Aziz, Brill, Conitzer, Elkind, Freeman, and Walsh, [*Justified Representation in Approval-Based Committee Voting*](https://arxiv.org/abs/1407.8269), introduced JR and EJR and studied their relationship to the core. The core is stronger because arbitrary deviating coalitions count, not just cohesive groups satisfying a particular representation condition. Core+ is stronger still because it also excludes fractional deviations.

### Approximate core outcomes

- Peters–Skowron (cited above) prove PAV's factor-2 **utility** approximation and MES's $O(\log k)$ approximation.
- Jiang, Munagala, and Wang, [*Approximately Stable Committee Selection*](https://arxiv.org/abs/1910.14008), give constant-factor approximate stability via iterative rounding; Becker–Greger–Peters report factors 32 for monotone preferences and 16 for approval preferences.
- Munagala, Shen, Wang, and Wang, [*Approximate Core for Committee Selection via Multilinear Extension and Market Clearing*](https://arxiv.org/abs/2110.12499), use a fractional market-clearing solution and a multilinear-extension relaxation. Their approximation notion involves an “additament” and should not be conflated with coalition-size approximation.
- Gao, Sun, and Vondrák, [*Computation of Approximately Stable Committees in Approval-based Elections*](https://arxiv.org/abs/2508.00130), prove a 3.651-approximation by rounding a Lindahl equilibrium with a strongly Rayleigh distribution (Theorem 1.5).
- Lin and Wang, [*Sequential Phragmén Guarantees 2-Approximate Core Stability*](https://arxiv.org/abs/2609.29646), subsequently prove 2-stability for sequential Phragmén and show that the factor 2 is tight for that rule.

These results concern different approximation notions in some entries; the constants should only be compared after checking the definitions.

### Exact existence in restricted instances

- Peters (2025), [*The Core of Approval-Based Committee Elections with Few Seats*](https://arxiv.org/abs/2501.18304), proves that every PAV committee is in the core for $k\leq7$, that some PAV-optimal committee is in the core for $k=8$, and that the core is non-empty for $m\leq15$ using recursive PAV.
- Pierczyński and Skowron (2022), [*Core-Stable Committees under Restricted Domains*](https://arxiv.org/abs/2108.01987), prove existence and polynomial-time computation on domains including voter-interval, candidate-interval, single-peaked, and single-crossing preferences.
- Brill, Gölz, Peters, Schmidt-Kraepelin, and Wilker (2024), [*Approval-Based Apportionment*](https://doi.org/10.1007/s10107-022-01852-1), obtain core-stable outcomes in the party-approval/apportionment setting, where every candidate has at least $k$ copies.
- Becker, Greger, and Peters (2026), [*Core Existence ... with up to Seven Voter Types*](https://arxiv.org/abs/2605.06194), use affine-monoid and Lindahl-rounding methods up to seven voters, hence up to seven distinct approval sets in the weighted formulation.
- Goel, Jiang, and Zhou (2026), [*Nash Core in Multiwinner Election*](https://arxiv.org/abs/2609.00486), study candidate-weighted Nash welfare in the fractional model and prove integral core existence for up to eight equally weighted voters by rounding.

### Divisible models and payments

Foley's Lindahl equilibrium, Fain–Goel–Munagala's participatory-budgeting core, Kroer–Peters's entropy-like convex program, and the strongly Rayleigh rounding work form the market-based branch. Harmonic entropy keeps the continuous payment analysis but replaces “find a fractional equilibrium, then round” with an exact potential comparison between integral committees.

## 8. A paragraph suitable for the paper or a talk

> The potential is a quota-constrained extension of PAV. Under PAV's uniform payment system, a voter with $u$ approved winners splits her budget equally among those winners and her reserve, her score is $H_u$, and adding an approved candidate increases it by exactly her reserve $1/(u+1)$. Uniform payments can overcharge a winner, so we must allow non-uniform payments subject to the quota. Harmonic entropy is the score obtained by requiring the same addition law after every water-filling operation: $F(\Phi x)=F(x)+\|x\|_\infty$, with $F=H_{d-1}$ on uniform $d$-coordinate distributions. This recursion yields $F(x)=\sum_{\ell\geq0}(1/(\ell+1)-t_\ell(x))$. It agrees with PAV whenever uniform payments are feasible, rewards balanced non-uniform payments otherwise, and makes addition gain exactly the reserve. A candidate deletion after de-reservation has the dual monetary effect needed for averaging. A blocked committee therefore admits an improving add–delete swap, while Shannon entropy generally loses part of the reserve on addition and cannot run this exact argument.

## 9. Checks made for this note

- Re-derived PAV's addition identity and the sum of deletion losses.
- Re-derived the series from the recursion and verified the telescoping gain.
- Computed the paper's water levels $(1/2,5/18,5/24,1/6)$ and its value $467/360$ exactly with rational arithmetic.
- Checked the shift $t_\ell(\Phi x)=t_{\ell+1}(x)$ on that example through $\ell=2$, and on 210 exact-rational distributions in dimensions $1,\ldots,6$ for $\ell=0,\ldots,5$ (1,260 identities in total).
- Checked the uniform-two-coordinate Shannon comparison explicitly.
- Read Becker–Greger–Peters v2 Sections 3–6 and Appendices B–D; Peters–Skowron Theorems 6, 7, and 10; Moulin Definition 3 and Theorem 1; Kroer–Peters Programs 6 and 16 and the surrounding core discussion; Skowron's Definition 3 and Lemmas 3–4; Gölz–Yaghoubizade Theorems 2.2, 2.3, and 4.2 and the frugal-priceability definition; and the primary abstracts/results cited for the other entries.

The mathematical explanation above follows the sources but the “design requirements” presentation is my synthesis; the literature-search absence statement is deliberately limited and is not a novelty proof.
