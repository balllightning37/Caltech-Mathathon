# Deleting a candidate, without the water-filling process

*Setting as in Becker--Greger--Peters, arXiv:2609.11912v2. This note proves their Theorem 6.3 -- the "deleting a candidate" step -- by a different route. The published proof (Theorem 6.3 with Lemma 6.4) spends most of its length on a **continuous de-reserving process** run in stages, with a termination bound and two invariants tracked through it. That process is replaced here by one extremal principle on an explicit polytope -- maximise the total payment, then minimise the sum of squares -- whose two properties are each a one-line perturbation argument. Nothing else in the paper changes.*

---

## 1. The statement

$N$ is a set of $n$ voters, $C$ a set of candidates, voter $i$ approves $A_i\subseteq C$, $k$ is the committee size and $q=n/k$ the Hare quota; $N_c=\{i:c\in A_i\}$.

A **payment system** for $W\subseteq C$ is a family $(r,p)$ with a *reserve* $r_i\ge0$ and *payments* $p_{ic}\ge0$ for $c\in A_i\cap W$, satisfying

$$\textbf{(P1)}\ \ r_i+\sum_{c\in A_i\cap W}p_{ic}=1,\qquad
\textbf{(P2)}\ \ p_{ic}\le r_i,\qquad
\textbf{(P4)}\ \ \sum_{i\in N_c}p_{ic}\le q\quad(c\in W).$$

$\mathcal P(W)$ denotes the set of such systems; it is non-empty, compact and convex. A candidate $c\in W$ is **unsaturated** if $\sum_{i\in N_c}p_{ic}<q$. Voter $i$'s vector is $x_i=(r_i,(p_{ic})_{c\in A_i\cap W})$, a distribution on $1+|A_i\cap W|$ coordinates.

For a distribution $x$ on a finite set $D$ put

$$t_\ell(x):=\max_{\emptyset\neq S\subseteq D}\frac{\sum_{j\in S}x_j}{|S|+\ell}\quad(\ell\ge0),\qquad
F(x):=\sum_{\ell\ge0}\Bigl(\frac1{\ell+1}-t_\ell(x)\Bigr),$$

the paper's series representation of harmonic entropy, and let $\Phi x\in\Delta_{D\sqcup\{\star\}}$ be the Robin Hood vector $\Phi x_j=\min\{x_j,t_1(x)\}$, $\Phi x_\star=t_1(x)$. Finally

$$V(W):=\max_{(r,p)\in\mathcal P(W)}\ \sum_{i\in N}F(x_i).$$

**Theorem (delete).** *Let $W\subseteq C$ with $|W|>k$. Then there is $d\in W$ with $V(W\setminus\{d\})\ge V(W)-\dfrac{n}{|W|}$.*

Only $|W|>k$ is used, and only through $\frac{n}{|W|}<q$. In the application $|W|=k+1$, and the constant $\frac{n}{|W|}$ is exactly what the swap argument of the paper needs, so it cannot be improved here.

---

## 2. Four facts about $F$

**(F1)** $F(\Phi x)=F(x)+\|x\|_\infty$ for every distribution $x$.

*Proof.* $\Phi$ shifts the water levels by one, $t_\ell(\Phi x)=t_{\ell+1}(x)$ (paper, Lemma 5.1). Hence
$$F(\Phi x)=\sum_{\ell\ge0}\Bigl(\frac1{\ell+1}-t_{\ell+1}(x)\Bigr)=\sum_{j\ge1}\Bigl(\frac1j-t_j(x)\Bigr)=\sum_{j\ge1}\Bigl(\frac1{j+1}-t_j(x)\Bigr)+1=F(x)+t_0(x),$$
using $\sum_{j\ge1}\bigl(\frac1j-\frac1{j+1}\bigr)=1$ and $t_0(x)=\|x\|_\infty$. $\square$

**(F2)** $F$ is unchanged by permuting coordinates and by adjoining or deleting zero coordinates. (Immediate from the formula: permuting coordinates permutes the subsets $S$, and a zero coordinate never helps in $t_\ell$.)

**(F3)** $F$ is **Schur-concave**: if $x$ is majorised by $y$, written $x\prec y$, then $F(x)\ge F(y)$.

*Proof.* Each $t_\ell$ is a maximum of linear functionals, hence convex, and it is symmetric; a symmetric convex function is Schur-convex, i.e. $x\prec y$ implies $t_\ell(x)\le t_\ell(y)$ for every $\ell$. Since $F=\sum_{\ell}\frac{1}{\ell+1}-\sum_{\ell}t_\ell$, this gives $F(x)\ge F(y)$. $\square$

In particular, if $y$ comes from $x$ by moving mass $\varepsilon$ from coordinates sitting at the maximum of $x$ to a coordinate that is strictly smaller, then $y\prec x$, so $F(y)\ge F(x)$. Several donors at the maximum are allowed, and one of them may be the reserve.

**(F4)** If $y\in\Delta_D$ and $x=\Phi y$, then $F(x)=F(y)+\|y\|_\infty$. (This is (F1) read backwards.)

---

## 3. Lemma A: a canonical optimum does not undercharge an unsaturated winner

**Lemma A.** *Among all $(r,p)\in\mathcal P(W)$ attaining $V(W)$ choose one minimising $\sum_ir_i$. Then*

$$(\ast)\qquad c\in W\ \text{unsaturated},\ i\in N_c\quad\Longrightarrow\quad p_{ic}=r_i.$$

*Proof.* Suppose $p_{ic}<r_i$ for an unsaturated $c$ and some $i\in N_c$; put $E=\{c'\in A_i\cap W:\,p_{ic'}=r_i\}$ and $s=|E|$, so $c\notin E$. Choose $\varepsilon>0$ with
$$(s+2)\varepsilon\le r_i-p_{ic},\qquad \varepsilon\le r_i-p_{ic'}\ \ \text{for } c'\in A_i\cap W\setminus(E\cup\{c\}),\qquad (s+1)\varepsilon\le q-\sum_jp_{jc}.$$
Now lower $r_i$ and each of the $s$ coordinates in $E$ by $\varepsilon$, and raise $p_{ic}$ by $(s+1)\varepsilon$. Then **(P1)** is preserved; the largest coordinate is $r_i-\varepsilon$, because the coordinates in $E$ are moved to that value, every other payment is at most $r_i-\varepsilon$ by the choice of $\varepsilon$, and $p_{ic}+(s+1)\varepsilon\le r_i-\varepsilon$; so **(P2)** holds. **(P4)** holds at $c$ by the third condition and at every other candidate because its payments did not increase. The change is a succession of $s+1$ transfers of the kind in (F3), so $\sum_iF$ does not decrease. The system is therefore still optimal, but $\sum_ir_i$ is strictly smaller. $\square$

Two remarks. (i) This is the paper's claim (7): the same transfer, with the "concavity plus symmetry" step made explicit as Schur-concavity. (ii) Read contrapositively, $(\ast)$ says: *if a voter pays strictly less than her reserve to an approved winner, that winner is saturated.*

---

## 4. Lemma B: de-reserving by an extremal principle

Fix $(r,p)\in\mathcal P(W)$ satisfying $(\ast)$. Call
$$M_i:=\{c\in A_i\cap W:\ p_{ic}=r_i\}$$
the **ceiling** of voter $i$ (the winners she pays exactly her reserve) and
$$S_c:=q-\sum_ip_{ic}$$
the **slack** of $c\in W$.

**Lemma B.** *There are numbers $\hat p_{ic}\ge p_{ic}$, for $i\in N$ and $c\in A_i\cap W$, such that with $\hat r_i:=r_i-\sum_{c}(\hat p_{ic}-p_{ic})$ one has*

$$\begin{aligned}
\textbf{(B1)}&\quad \hat p_{ic}=p_{ic}\ \text{ for } c\in A_i\cap W\setminus M_i, &&\text{(nothing is raised below the ceiling)}\\
\textbf{(B2)}&\quad \sum_i\hat p_{ic}\le q\ \text{ for all } c\in W, &&\text{(P4) survives}\\
\textbf{(B3)}&\quad \hat r_i=0\ \text{ whenever voter } i \text{ approves a candidate unsaturated for } \hat p, &&\text{(who can pay, pays)}\\
\textbf{(B4)}&\quad c\in A_i\cap W\ \text{unsaturated for } \hat p \text{ and } c'\in A_i\cap W\ \Rightarrow\ \hat p_{ic}\ge\hat p_{ic'}. &&\text{(an unsaturated winner is a top coordinate)}
\end{aligned}$$

*Proof.* Let $P=\{(i,c):\ c\in A_i\cap W\}$ and consider the polytope
$$X=\Bigl\{x\in\mathbb R^P:\ x\ge0,\ \ x_{ic}=0\ \text{if } c\notin M_i,\ \ \sum_{c}x_{ic}\le r_i\ \ \forall i,\ \ \sum_{i}x_{ic}\le S_c\ \ \forall c\in W\Bigr\}.$$
It is non-empty ($0\in X$) and compact. Choose $x\in X$ maximising $\sum_{P}x_{ic}$ and, subject to that, minimising $\sum_{P}x_{ic}^2$; set $\hat p:=p+x$ and $\hat r$ as above. Then (B1) is part of the definition of $X$, (B2) is its last constraint, and $\hat r\ge0$ is its second constraint.

Throughout, "unsaturated" in (B3) and (B4) refers to $\hat p$. Note that $\hat p\ge p$, so a candidate unsaturated for $\hat p$ is unsaturated for $p$ as well; this is what lets $(\ast)$, which speaks about $p$, be applied. Likewise $\sum_i\hat p_{ic}<q$ is the same as $\sum_ix_{ic}<S_c$, so an unsaturated candidate still has slack available in $X$.

The distinction is not cosmetic: read with "unsaturated for $p$" both statements are false, and on some instances no system satisfies (B1)--(B3) under that reading at all, so a proof that does not say which system it means does not close. Take $n=6$, $k=3$, $q=2$, $W=\{a,b,c,e\}$, voter $0$ approving $\{a,b\}$ and paying $1/3$ to each, voters $1,2$ approving $\{a\}$ and paying $1/2$, voter $3$ approving $\{b\}$ and paying $1/2$, voters $4,5$ approving $\{c\}$ and paying $1/2$. Every voter's vector is uniform, so this is an optimal system with $V(W)=H_2+5H_1=13/2$; the loads are $4/3,5/6,1,0$, all below $q$, and $(\ast)$ holds. The least-squares maximum flow is $x_{0b}=1/3$, $x_{1a}=x_{2a}=1/3$, $x_{3b}=x_{4c}=x_{5c}=1/2$ (total flow $5/2$ is forced by $x_{0a}=0$), giving $\hat r_1=\hat r_2=1/6>0$ and $\hat p_{0a}=1/3<\hat p_{0b}=2/3$. With "unsaturated" read as "for $p$" this violates both (B3) and (B4); with the convention above it violates neither, because in $\hat p$ candidate $a$ carries exactly $q=2$ and $b$ carries $5/3$, so (B3) asks nothing of voters $1,2$ (their only winner is saturated) and (B4) holds for voter $0$.

**(B3).** Suppose $\hat r_i>0$ and voter $i$ approves an unsaturated $c$. If $c\in M_i$, then raising $x_{ic}$ by any small $\delta\le\min\{\hat r_i,\,S_c-\sum_jx_{jc}\}$ -- positive, since $c$ is unsaturated -- keeps us in $X$ and raises the total, contradicting maximality. If $c\notin M_i$, then $p_{ic}<r_i$, so $c$ is saturated for $p$ by $(\ast)$, i.e. $S_c=0$; then $\sum_i\hat p_{ic}\ge\sum_ip_{ic}=q$, so $c$ is saturated for $\hat p$ too. Contradiction.

**(B4).** Let $c'\in A_i\cap W$ be unsaturated and suppose $\hat p_{ic}>\hat p_{ic'}$ for some $c\in A_i\cap W$. If $c\notin M_i$, then $\hat p_{ic}=p_{ic}<r_i\le\hat p_{ic'}$, because $c'$ is then unsaturated for $p$ too, so $p_{ic'}=r_i$ by $(\ast)$ and $\hat p_{ic'}\ge p_{ic'}$; contradiction. So $c\in M_i$, that is, $x_{ic}$ is a coordinate of $X$, and $x_{ic}>x_{ic'}$. For small $\delta>0$ move $\delta$ from $x_{ic}$ to $x_{ic'}$: voter $i$'s sum is unchanged, the load of $c$ falls, and the load of $c'$ rises by $\delta$, which is allowed since $c'$ unsaturated means $S_{c'}-\sum_jx_{jc'}>0$. The result is a point of $X$ with the same total and strictly smaller $\sum x_{ic}^2$, a contradiction. $\square$

So a de-reserved system has to satisfy four things: *nothing rises below the ceiling* (each voter's vector stays a Robin Hood preimage), *no winner is overloaded*, *everyone who can still pay does pay*, and *every unsaturated winner is a largest coordinate of each of her supporters*. Lemma B delivers all four at once; (B3) and (B4) are maximality and least-squares minimality read off through one perturbation each.

---

## 5. The deletion

*Proof of the Theorem.* Let $(r,p)$ be as in Lemma A and $(\hat p,\hat r)$ as in Lemma B. Choose $d\in W$ minimising
$$T_d:=\sum_{i\in N_d}\hat p_{id}.$$
Then
$$\sum_{d\in W}T_d=\sum_i\sum_{c\in A_i\cap W}\hat p_{ic}=\sum_i\Bigl(\sum_cp_{ic}+\sum_cx_{ic}\Bigr)\le\sum_i\bigl((1-r_i)+r_i\bigr)=n, \tag{1}$$
so $T_d\le\frac{n}{|W|}<q$ and $d$ is unsaturated. By (B3), $\hat r_i=0$ for every $i\in N_d$.

For $i\in N_d$ set
$$x'_i:=\bigl(\hat p_{id},\,(\hat p_{ic})_{c\in A_i\cap W\setminus\{d\}}\bigr),$$
the vector with the payment to $d$ relabelled as the reserve; for $i\notin N_d$ keep $x'_i:=x_i$. This is a payment system for $W\setminus\{d\}$:

* **(P1)** for $i\in N_d$: $\hat p_{id}+\sum_{c\neq d}\hat p_{ic}=\sum_c\hat p_{ic}=\sum_cp_{ic}+\sum_cx_{ic}=1-\hat r_i=1$;
* **(P2)** for $i\in N_d$: $\hat p_{id}=\|\hat p_i\|_\infty\ge\hat p_{ic}$ for every $c$, by (B4);
* **(P4)** for $c\in W\setminus\{d\}$: $\sum_ip'_{ic}=\sum_{i\notin N_d}p_{ic}+\sum_{i\in N_d}\hat p_{ic}\le\sum_{i\notin N_d}\hat p_{ic}+\sum_{i\in N_d}\hat p_{ic}=\sum_i\hat p_{ic}\le q$.

For the value, fix $i\in N_d$ and abbreviate $\hat p_i=(\hat p_{ic})_{c\in A_i\cap W}$. If $r_i>0$, then $\Phi(\hat p_i)=x_i$: indeed
$$\sum_c(\hat p_{ic}-r_i)^+=\sum_{c\in M_i}(\hat p_{ic}-r_i)^+=\sum_{c\in M_i}x_{ic}=\sum_cx_{ic}=r_i-\hat r_i=r_i,$$
the first equality because $\hat p_{ic}=p_{ic}<r_i$ for $c\notin M_i$ and the second because $\hat p_{ic}=r_i+x_{ic}$ for $c\in M_i$; so $r_i$ is the water level of $\hat p_i$, and $\min\{\hat p_{ic},r_i\}=p_{ic}$ for every $c$ (for $c\in M_i$ both sides are $r_i$; otherwise $x_{ic}=0$ and $\hat p_{ic}=p_{ic}<r_i$). Hence by (F4), and since $\|\hat p_i\|_\infty=\hat p_{id}$ by (B4),
$$F(x_i)=F(\hat p_i)+\|\hat p_i\|_\infty=F(\hat p_i)+\hat p_{id}=F(x'_i)+\hat p_{id},$$
the last equality by (F2), as $x'_i$ is a permutation of $\hat p_i$. If $r_i=0$ instead, then $x_{ic}=0$ for all $c$ (by the constraint $\sum_cx_{ic}\le r_i$), so $\hat p_i=p_i$ and $x'_i$ is $x_i=(0,p_i)$ with the zero reserve deleted: $F(x'_i)=F(x_i)\le F(x_i)+\hat p_{id}$, the inequality we need, with room to spare. For $i\notin N_d$ of course $F(x'_i)=F(x_i)$. Therefore
$$V(W\setminus\{d\})\ \ge\ \sum_iF(x'_i)\ \ge\ \sum_iF(x_i)-\sum_{i\in N_d}\hat p_{id}\ =\ V(W)-T_d\ \ge\ V(W)-\frac{n}{|W|}. \qquad\square$$

---

## 6. Where the simplification is

| step | published proof (Theorem 6.3, Lemma 6.4) | here |
|---|---|---|
| canonical optimum | minimal-reserve maximiser, claim (7) | Lemma A: same, with (F3) replacing "concavity + symmetry" |
| de-reserving | continuous process in stages: define open/saturated/active voters, raise payments at unit rate, compute a stage length, bound the number of stages by $n+\lvert W\rvert$, track two invariants (a), (b) through all stages | Lemma B: one polytope, two extremal choices, two perturbations |
| choice of $d$ | least total payment + pigeonhole $\sum_{d}\sum_{i}\hat p_{id}\le n$ | identical |
| rebuilding | relabel; verify (P1), (P2), (P4) | identical |
| accounting | "coordinates below $r_i$ were frozen at time $0$", $\min\{\hat x_{ic},r_i\}=x_{ic}$, $\sum_c(\hat x_{ic}-r_i)^+=r_i$, $t_1(\hat x_i)=r_i$, $\Phi\hat x_i=x_i$ | one line: $\Phi(\hat p_i)=x_i$, then (F4) |

What disappears: the stage decomposition, the rate equations and the stage-length formula, the termination count, the "frozen coordinates" invariant, and the separate verification of the water level $t_1(\hat x_i)=r_i$. What remains is a single pattern -- *choose an extremal object, then perturb it* -- used once in Lemma A and once each for (B3) and (B4); there is no dynamics anywhere.

Two further points about the proof.

* **It does not use optimality beyond Lemma A.** Hypothesis $(\ast)$ is all that Lemma B and the deletion use; the theorem therefore holds with $V(W)$ replaced by $\sum_iF(x_i)$ for any certificate satisfying $(\ast)$. The paper's argument for (B3) needs exactly this too, which is why $(\ast)$ cannot be dropped from this route -- without it, a voter's reserve can be "stuck" at a winner that is already saturated and the ceiling bookkeeping fails.
* **The bound is nearly attained** in the checks of Section 7: a loss of $\tfrac{15}{16}\cdot\frac{n}{|W|}$ occurs, so the pigeonhole (1) is not wasteful in a way one could exploit.

---

## 7. Machine checks

$F$ was implemented in exact rational arithmetic (iterate $\Phi$ until the vector is uniform, then $F=H_{D-1}-\sum_{\ell<L}t_\ell$; the level solved exactly by sorting, since the coordinates exceeding $t$ are exactly the largest ones). It reproduces the paper's worked value $F(\tfrac12,\tfrac13,\tfrac16)=\tfrac{467}{360}$.

| what | how many | result |
|---|---|---|
| (F1), (F2) | 500 random distributions | 0 failures |
| (F3), on random Robin Hood transfers | 400 | 0 failures (no decrease of $F$) |
| Lemma A's transfer: (P1), (P2), (P4) kept, $\sum F$ not decreased, $\sum r_i$ strictly decreased | 369 applicable cases on arbitrary certificates (`selftest.py`) | 0 failures |
| Lemma B + deletion on certificates satisfying $(\ast)$: (P1), (P2), (P4) of the new system, $d$ unsaturated, $\hat r_i=0$ for $i\in N_d$, the identity $F(x_i)-F(x'_i)=\hat p_{id}$ exactly, and the bound $T_d\le n/\lvert W\rvert$ | 414 certificates in the consolidated run below (about 1000 across the exploratory runs), including ones with a winner of load exactly $q$, with strictly partial payments, and with voters paying a saturated and an unsaturated winner at once | 0 failures |
| Lemma B's two perturbation conclusions (B3), (B4) at the least-squares maximum flow | 51 instances, solved numerically | holds to solver accuracy; of the 157 flagged pairs, 150 were re-tested by applying the transfer of the proof at the solver's own point and it was feasible and strictly improving -- so those flags are solver error -- and the remaining 7 have a gap below $2.4\times10^{-9}$ |

The scripts are in `verification/delete_lemma/` (see the README there); `selftest.py`, `delete_test.py`, `poly_test.py`, `endtoend.py` reproduce the four rows.

Nothing in Sections 2--5 depends on these checks; they test the statements, not the inferences.
