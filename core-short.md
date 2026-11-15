# The core of approval-based committee elections: a short proof, and what is forced

*Setting as in Becker–Greger–Peters, arXiv:2609.11912. §2 is the proof, streamlined: the LP-duality step and the "core+" relaxation are gone (they are needed only for the converse implication, which the argument never uses), and the whole weight rests on one invariant and two comparison lemmas. §3 records what cannot be simplified — three statements with proofs saying why the remaining machinery is not decoration.*

---

## 1. The statement

$N$ finite (voters), $n=|N|$; $C$ finite (candidates); $A_i\subseteq C$ for $i\in N$; $u_i(W)=|A_i\cap W|$; $k\le|C|$; $q=n/k$.

> **Theorem.** There is $W\subseteq C$ with $|W|=k$ such that for every non-empty $T\subseteq C$,
> $$\bigl|\{\,i\in N:\ u_i(T)>u_i(W)\,\}\bigr|\;<\;q\,|T| .$$
>
> (Coalition form: for all $S\subseteq N$, $T\subseteq C$, "$u_i(T)>u_i(W)$ for all $i\in S$" implies $k|S|<n|T|$.)

Only $|T|\le k$ matters; the inequality is strict and cannot be relaxed at the next quota down (3 voters approving $a,b,c$ separately, $k=2$).

---

## 2. The proof

Throughout, $W\subseteq C$ and $N_c=\{i:c\in A_i\}$.

### 2.1 A certificate, and what it buys

A **certificate** for $W$ is a family of numbers $x_{ic}\in[0,1]$, one for each $i\in N$ and $c\in A_i\cap W$, with
$$\textstyle r_i:=1-\sum_{c\in A_i\cap W}x_{ic}\ \ (\text{the \emph{reserve}}),$$
satisfying
$$\textbf{(C1)}\ r_i\ge 0,\qquad \textbf{(C2)}\ x_{ic}\le r_i\ (c\in A_i\cap W),\qquad \textbf{(C3)}\ \sum_{i\in N_c}x_{ic}\le q\ (c\in W),\qquad \textbf{(C4)}\ \sum_{i\in N_c}r_i<q\ (c\notin W).$$

**Lemma 1.** If $|W|=k$ has a certificate, it satisfies the theorem.

*Proof.* Let $\emptyset\ne T\subseteq C$ and $S=\{i:u_i(T)>u_i(W)\}$. For $i\in S$ put $B=A_i\cap T\cap W$ and $L=A_i\cap(T\setminus W)$; then $u_i(T)=|B|+|L|>u_i(W)\ge|B|$, so $|L|\ge u_i(W)-|B|+1$. Charge voter $i$ the amount
$$\sum_{c\in B}x_{ic}+|L|\,r_i\ \ge\ \sum_{c\in B}x_{ic}+\sum_{c\in A_i\cap W\setminus B}x_{ic}+r_i\overset{\textbf{(C1)}}{=}1,$$
using $\sum_{c\in A_i\cap W\setminus B}x_{ic}\le(u_i(W)-|B|)r_i$ by **(C2)**. So $T$ collects at least $|S|$. But $T$ collects at most $q|T\cap W|+\sum_{c\in T\setminus W}\sum_{i\in N_c}r_i<q|T|$, by **(C3)**, **(C4)**, the last inequality being strict because $T\setminus W\neq\emptyset$ when $S\neq\emptyset$. Hence $|S|<q|T|$. $\square$

### 2.2 The invariant

For a finite set $D$ and $x\in\Delta_D=\{x\in\mathbb{R}_{\ge0}^D:\sum x_j=1\}$, put
$$t_\ell(x):=\max_{\emptyset\ne S\subseteq D}\frac{\sum_{j\in S}x_j}{|S|+\ell}\quad(\ell\ge0),\qquad F(x):=\sum_{\ell\ge0}\Big(\frac1{\ell+1}-t_\ell(x)\Big),$$
and for $x\in\Delta_D$ let $\Phi x\in\Delta_{D\sqcup\{\star\}}$ be $\Phi x_j=\min\{x_j,t_1(x)\}$, $\Phi x_\star=t_1(x)$.

**Lemma 2.** (i) $t_0(x)=\|x\|_\infty$ and $\frac1{|D|+\ell}\le t_\ell(x)\le\frac1{\ell+1}$. (ii) $t_\ell$ is convex and symmetric in $x$ and is unchanged by adjoining a zero coordinate. (iii) The series for $F$ converges uniformly on $\Delta_D$; $F$ is concave, symmetric, continuous, unchanged by zero coordinates, and
$$F(\Phi x)=F(x)+\|x\|_\infty .$$

*Proof.* (i) For $\emptyset\ne S\subseteq D$, $\sum_{j\in S}x_j\le|S|\|x\|_\infty\le(|S|+\ell)\|x\|_\infty$, with equality for $\ell=0$, $S=\{$argmax$\}$; and $\frac{1}{|S|+\ell}\ge\frac{1}{|D|+\ell}$ with $S=D$ giving the lower bound. (ii) A maximum of linear functions; a permutation of $D$ permutes the sets $S$; a zero coordinate never helps.

(iii) By (i), $0\le\frac1{\ell+1}-t_\ell(x)\le\frac1{\ell+1}-\frac1{|D|+\ell}$, so the series converges uniformly, each partial sum is continuous and concave, and the tail is at most $\sum_{\ell\ge L}(\frac1{\ell+1}-\frac1{|D|+\ell})=\sum_{j=1}^{|D|-1}\frac1{L+j}\le\frac{|D|-1}{L}$.

Note also that $\Phi$ lands in a simplex. With $S^\ast=\{j:x_j>t_1(x)\}$ (non-empty unless $x$ is a point mass, where the claim is immediate), the equality case of (ii) gives $\sum_{j\in S^\ast}x_j=(|S^\ast|+1)t_1(x)$, hence $\sum_j(x_j-t_1(x))^+=t_1(x)$ and
$$\sum_j\min\{x_j,t_1(x)\}+t_1(x)=\sum_jx_j-\sum_j(x_j-t_1(x))^++t_1(x)=1 .$$

For the identity, first note $t_\ell(\Phi x)=t_{\ell+1}(x)$ for all $\ell\ge0$. The constraint "$\sum_j(y_j-s)^+\le\ell s$" that defines $t_\ell(y)$ is, for $y=\Phi x$ and $0\le s<t_1(x)$,
$$\sum_{j\in D\sqcup\{\star\}}(\Phi x_j-s)^+=\sum_{j\in D}(x_j-s)^+-\sum_{j\in D}(x_j-t_1(x))^++\bigl(t_1(x)-s\bigr)=\sum_{j\in D}(x_j-s)^+-s$$
(using $(a\wedge t-s)^+=(a-s)^+-(a-t)^+$ for $s\le t$ and $\sum_j(x_j-t_1)^+=t_1$), i.e. it is the constraint $\sum_j(x_j-s)^+\le(\ell+1)s$ for $x$; and for $s\ge t_1(x)$ it holds for $\Phi x$ (all coordinates are $\le t_1\le s$) while $s=t_1$ already satisfies the $(\ell+1)$-constraint for $x$, so the extra range does not move the least feasible point. Hence the two least feasible $s$ agree. Therefore
$$F(\Phi x)=\sum_{\ell\ge0}\Big(\frac1{\ell+1}-t_{\ell+1}(x)\Big)=\sum_{k\ge1}\Big(\frac1k-t_k(x)\Big),$$
and since $F(x)=\sum_{k\ge0}\big(\frac1{k+1}-t_k(x)\big)=1-t_0(x)+\sum_{k\ge1}\big(\frac1{k+1}-t_k(x)\big)$, while $\sum_{k\ge1}(\frac1k-\frac1{k+1})=1$, the displayed sum equals $F(x)+t_0(x)$. $\square$

For $W\subseteq C$ let $\mathcal P(W)$ be the set of families satisfying **(C1)–(C3)** (not **(C4)**), a non-empty compact convex polytope, and
$$V(W):=\max_{x\in\mathcal P(W)}\ \sum_{i\in N}F(x_i),\qquad x_i:=(r_i,(x_{ic})_{c\in A_i\cap W})\in\Delta.$$

### 2.3 Adding a candidate

**Lemma 3.** Let $x\in\mathcal P(W)$ attain $V(W)$, let $c\notin W$, and suppose $\sum_{i\in N_c}r_i\ge q$. Then $V(W\cup\{c\})\ge V(W)+q$.

*Proof.* For $i\in N_c$, replace $x_i$ by $\Phi x_i$, reading the new coordinate as the payment to $c$, and the (old) coordinate $\min\{r_i,t_1(x_i)\}=t_1(x_i)$ as the new reserve — legitimate since $t_1(x_i)\le\|x_i\|_\infty=r_i$ by **(C2)** and Lemma 2(i), so the reserve is still the largest coordinate. For $i\notin N_c$ keep $x_i$ and set the payment to $c$ to $0$. This satisfies **(C1)**, **(C2)**, **(C3)** for the old winners (payments only decrease); for the new candidate only $\sum_{i\in N_c}t_1(x_i)\le\sum_{i\in N_c}r_i=:R$ is guaranteed. Let $y$ be the old system extended by zeros. Both are in $\mathcal P(W\cup\{c\})$, so is their convex combination with weights $\lambda=q/R\le1$ and $1-\lambda$; by concavity and Lemma 2(iii),
$$\sum_iF\bigl(\lambda\Phi x_i+(1-\lambda)y_i\bigr)\ \ge\ \lambda\Bigl(\sum_iF(x_i)+R\Bigr)+(1-\lambda)\sum_iF(x_i)=V(W)+\lambda R=V(W)+q ,$$
and the new candidate now receives $\lambda\sum_it_1(x_i)\le\lambda R=q$. $\square$

### 2.4 Deleting a candidate

**Lemma 4.** If $|W|\ge k+1$, some $d\in W$ satisfies $V(W\setminus\{d\})\ge V(W)-\frac{n}{|W|}$.

*(The proof below is the paper's: a minimal-reserve optimum, then a continuous de-reserving process, then a pigeonhole. A shorter proof of this one lemma, with no process and no stage bookkeeping — de-reserving replaced by an extremal principle on an explicit polytope — is in [results/delete-lemma-simplified.md](results/delete-lemma-simplified.md).)*

*Proof.* **Step 1 (a canonical optimum).** Choose $x\in\mathcal P(W)$ attaining $V(W)$ and, among those, minimising $\sum_ir_i$. Then
$$\tag{$\ast$} d\in W,\ \textstyle\sum_{i\in N_d}x_{id}<q,\ i\in N_d\ \Longrightarrow\ x_{id}=r_i .$$
Otherwise $x_{id}<r_i$; let $S=\{c\in A_i\cap W: x_{ic}=r_i\}$, $s=|S|$, and $0<\varepsilon\le(r_i-x_{id})/(s+2)$ so small that $x_{ic}\le r_i-\varepsilon$ for $c\notin S\cup\{d\}$ and $(s+1)\varepsilon\le q-\sum_jx_{jd}$. Now perform $s+1$ moves, one for each $c\in S$ and one for the reserve $r_i$: in the move attached to a coordinate $u$ at level $r_i$, increase $x_{id}$ by $\varepsilon$ and decrease that coordinate by $\varepsilon$. Each such move is $y\mapsto(1-\lambda)y+\lambda\sigma y$ with $\sigma$ the transposition of the two coordinates touched and $\lambda=\varepsilon/(u-y_{d})\in(0,1]$, so by symmetry and concavity of $F$ it does not decrease $\sum_iF$ (Lemma 2(iii)). The moves preserve **(C1)**, keep the reserve $r_i-\varepsilon$ the largest coordinate, and keep **(C3)** at $d$ by the choice of $\varepsilon$; the final system is again optimal but has $\sum_ir_i$ smaller — contradiction.

**Step 2 (de-reserving).** Starting from $x$, run the following process, keeping a family $\hat x\ge x$ satisfying **(C1)** and **(C3)**. Call $c\in W$ *open* if $\sum_i\hat x_{ic}<q$. While some voter has $\hat r_i>0$ and an open approved winner, let each such voter simultaneously raise $\hat x_{ic}$ at unit rate for every open $c\in A_i\cap W$, lowering $\hat r_i$ to preserve **(C1)**; stop a stage when some $\hat r_i$ hits $0$ or some winner reaches $q$. Each stage exhausts a voter or closes a winner, so the process halts. (Concretely, no continuity is needed: with $I$ the set of voters having $\hat r_i>0$ and an open approved winner, the stage length is $\lambda=\min\bigl\{\hat r_i/|A_i\cap U|,\ (q-\sum_j\hat x_{jc})/|\{i\in I:c\in A_i\}|\bigr\}$ over $i\in I$ and open $c$, and after at most $n+|W|$ stages no voter is active.) Two facts are preserved throughout: (a) if $c$ is open then $\hat x_{ic}\ge\hat x_{ic'}$ for all $i\in N_c$, $c'\in A_i\cap W$ [true at time $0$ by $(\ast)$ and **(C2)**; during a stage $\hat x_{ic}$ grows at rate $1$ and $\hat x_{ic'}$ at rate $1$ or $0$]; (b) if $x_{ic}<r_i$ then $c$ was closed at time $0$ by $(\ast)$, hence $\hat x_{ic}=x_{ic}$ always.

At the end, pick $d\in W$ with $\sum_i\hat x_{id}$ minimal. Since $\sum_{c\in W}\sum_i\hat x_{ic}=\sum_i(1-\hat r_i)\le n$ and $|W|\ge k+1$, we get $\sum_i\hat x_{id}\le\frac{n}{|W|}<q$: $d$ is open. Also $\hat r_i=0$ for every $i\in N_d$ (else voter $i$ would still be active on $d$).

**Step 3 (rebuilding).** For $i\in N_d$ put $x'_i:=(\hat x_{id},(\hat x_{ic})_{c\in A_i\cap W\setminus\{d\}})$, for $i\notin N_d$ put $x'_i:=x_i$. This is in $\mathcal P(W\setminus\{d\})$: **(C1)** for $i\in N_d$ because $\hat r_i=0$; **(C2)** by (a); **(C3)** since no payment increased.

**Step 4 (accounting).** For $i\in N_d$, all coordinates of $x_i$ below $r_i$ were already frozen at time $0$ by (b), so $\min\{\hat x_{ic},r_i\}=x_{ic}$ and $\sum_c(\hat x_{ic}-r_i)^+=\sum_c(\hat x_{ic}-x_{ic})=r_i-\hat r_i=r_i$; thus $t_1(\hat x_i)=r_i$ and $\Phi\hat x_i$ is $x_i$ with an extra coordinate $r_i$, whence $F(x_i)=F(\hat x_i)+p$ with $p:=\|\hat x_i\|_\infty=\hat x_{id}$ by (a). But $x'_i$ is $\hat x_i$ with the largest coordinate renamed "reserve", so $F(x'_i)=F(\hat x_i)=F(x_i)-\hat x_{id}$. Therefore
$$V(W\setminus\{d\})\ \ge\ \sum_iF(x'_i)\ =\ \sum_iF(x_i)-\sum_{i\in N_d}\hat x_{id}\ \ge\ V(W)-\frac{n}{|W|} . \qquad\square$$

### 2.5 The swap

Let $W^\ast\in\binom{C}{k}$ maximise $V$. If its optimal certificate violated **(C4)**, some $c\notin W^\ast$ would have $\sum_{i\in N_c}r_i\ge q$; Lemma 3 gives $V(W^\ast\cup\{c\})\ge V(W^\ast)+q$, and Lemma 4 (applied to the $(k+1)$-set $W^\ast\cup\{c\}$) a $d$ with
$$V(W^\ast\cup\{c\}\setminus\{d\})\ \ge\ V(W^\ast)+q-\frac{n}{k+1}\ =\ V(W^\ast)+\frac{n}{k(k+1)}\ >\ V(W^\ast),$$
contradicting the choice of $W^\ast$ (the left side is a $k$-set: if $d=c$ it is $W^\ast$ itself). So the certificate satisfies **(C1)–(C4)** and Lemma 1 applies. $\blacksquare$

---

## 3. What is forced

Three statements explaining why the proof is not shorter.

**(a) (C2) is exactly the condition that makes the certificate work.** For a voter $i$, write $u=u_i(W)$. Her charge for a proposal $T$ with $A_i\cap T\cap W=B$ and $|A_i\cap(T\setminus W)|=u-|B|+1$ is $\sum_Bx+\,(u-|B|+1)r_i$, and this is $\ge1$ for all such $T$ iff $\sum_{c\in M}x_{ic}\le|M|r_i$ for every realisable $M\subseteq A_i\cap W$; the case $M=\{c\}$ (realisable whenever $i$ approves a candidate outside $W$, which is exactly when $W$ can fail $i$) forces $x_{ic}\le r_i$. Conversely **(C2)** gives all the inequalities at once. So (C2) is not an artefact of the proof: no weaker per-voter condition can drive the counting argument.

**(b) The invariant is unique.** Suppose $F$ assigns a real number to each $x\in\Delta_D$ (all finite $D$), is invariant under permutations and under adjoining zero coordinates, and satisfies $F(\Phi x)=F(x)+\|x\|_\infty$. Then $F(x)=F(\text{point mass})+\sum_{\ell\ge0}\bigl(\frac1{\ell+1}-t_\ell(x)\bigr)$.

*Proof.* Apply the identity to the uniform distribution: $F(\text{uniform}_{d+1})=F(\text{uniform}_d)+\frac1d$, so $F(\text{uniform}_d)=c+H_{d-1}$ with $c=F(\text{point mass})$. Iterating, $F(x)=F(\Phi^Lx)-\sum_{\ell<L}t_\ell(x)$; for $L$ large, $t_L(x)<\min_jx_j$, so $\Phi^Lx$ is uniform on $|D|+L$ coordinates (the water level then makes all coordinates equal). Hence
$$F(x)=c+H_{|D|+L-1}-\sum_{\ell<L}t_\ell(x)\ \longrightarrow\ c+\sum_{\ell\ge0}\Bigl(\frac1{\ell+1}-t_\ell(x)\Bigr),$$
as $H_{|D|+L-1}-H_L\to0$. $\square$

So no "simpler invariant" of this shape exists: any separable potential that (i) is symmetric and (ii) gains exactly the reserve when a candidate is added is harmonic entropy. A different proof must abandon one of these two requirements.

**(c) Deleting genuinely needs the de-reservation.** Merely deleting $d$ and adding $x_{id}$ to the reserve costs $F(x_i)-F(x_i\text{ merged at }d)$, which is not an additive function of the payments: for $x_i=(r,x_{id})=(0.5,0.5)$ the cost is $F(0.5,0.5)-F(1)=1$, twice the payment $0.5$; for $x_i=(0.5,0.3,0.2)$ the costs are $0.70$ and $0.53$ for payments $0.3$ and $0.2$. Summing such costs over $d\in W$ therefore gives no bound in terms of $\sum_d\sum_i x_{id}\le n$, which is what the averaging over $d$ needs. The de-reserving step is precisely what converts entropy into money, making the loss exactly $\hat x_{id}$.

A fourth remark explains why the potential is a *discrete* sum. With Shannon entropy $F_S(x)=-\sum_jx_j\ln x_j=\int_0^\infty\bigl(\frac1{1+s}-t_s(x)\bigr)ds$ in place of $F$, adding a candidate gains $\int_0^1t_s(x_i)ds<t_0(x_i)=r_i$ (strict whenever two coordinates tie at the maximum), so the substitution $\sum_{\ell}$ for $\int$ is exactly what buys the factor $1$ in Lemma 3 — the continuous version reproduces the known constant-factor approximations and nothing better.

---

## 4. Checks

The statement was verified exhaustively over all approval profiles for $(n,m)\in\{(3,5),(4,4),(5,4),(4,5),(4,6),(3,7),(5,5)\}$, all $k$ (about $3\cdot10^8$ (profile,$k$) pairs), and on random profiles up to $n=40$, $m=14$; no counterexample. The identities of Lemma 2 and the numerical claims of §3(c) were checked by evaluating the series for $F$.
