# Caltech Mathathon

An interactive explainer for **"Existence of the Core in Approval-Based Committee Elections"**
by Patrick Becker, Matthias Greger and Dominik Peters
([arXiv:2609.11912v2](https://arxiv.org/abs/2609.11912), cs.GT).

**Live site:** https://balllightning37.github.io/Caltech-Mathathon/

Three tabs:

| Tab | Page | Covers |
| --- | --- | --- |
| Understanding the problem | [`problem.html`](problem.html) | Sections 2-3: the setup, the quota, and how a sensible committee fails the core |
| Why the core exists | [`index.html`](index.html) | Sections 3-6: the existence proof |
| Computing one | [`algorithm.html`](algorithm.html) | The algorithm, a faster variant, and a runner you can drive |

The second tab ends with a **fully interactive runner**: set the number of voters, candidates and
seats, drag candidates onto voters to build the approval profile, read off the dual (payment)
programme that profile induces, then step the algorithm at your chosen speed and watch a valid
payment system being assembled — which is what certifies the final committee as core-stable.

## What this covers

Sections 2–6 of the paper: the proof that **core+ is always satisfiable**, and hence that the core
of an approval-based committee election is never empty. Each step has a live diagram.

*Understanding the problem* ([`problem.html`](problem.html)):

| § | Topic | Paper |
| --- | --- | --- |
| 1 | The question that was open | §1 |
| 2 | Elections, committees, quotas | §2 |
| 3 | The core, and how it fails | §3 |
| 4 | Where this goes next | — |

*Why the core exists* ([`index.html`](index.html)):

| § | Topic | Paper |
| --- | --- | --- |
| 1 | Core+: deviating by fractions | §3, Def. 3.1 |
| 2 | Payment systems as certificates | §3, (P1)–(P4), Thm 3.2 |
| 3 | What PAV gets right, and wrong | §4, Thm 4.1 |
| 4 | The Robin Hood operator | §5.1, Lem. 5.1 |
| 5 | Harmonic entropy | §5.2, Prop. 5.2 |
| 6 | The harmonic entropy rule | §6, Thms 6.2, 6.3, 6.5 |
| 7 | Why this proves existence | — |

Sections 7–9 (polynomial-time computation, the Droop extension, discussion) and the appendices are
only summarised in passing.

## The idea in one paragraph

The core is a statement about what cannot happen, quantified over exponentially many coalitions, and
verifying it for a single committee is coNP-complete. The paper makes it tractable by *strengthening*
it: core+ additionally forbids **fractional** deviations, which turns blocking into a linear
feasibility question. LP duality then converts "no blocking coalition exists" into "a certificate
exists" — a **payment system** giving each voter a unit budget split between payments to approved
winners and an unspent reserve, subject to four conditions. The remaining difficulty is that two of
those conditions pull against each other. The fix is a new objective, **harmonic entropy**, built
from a water-filling **Robin Hood operator** so that adding a coordinate raises the objective by
exactly the voter's reserve. That identity makes a single-candidate swap argument work, and any
committee that is even an approximate *local* maximum of the objective must admit a full certificate.
Since a maximum over finitely many committees always exists, so does a core committee.

## Running it locally

The published site needs **no build step and no npm** — it is plain static HTML, CSS and ES modules,
served straight from the repository root by GitHub Pages. To preview it locally, any static server
will do:

```bash
npm run serve        # or: python -m http.server 8080
```

`npm` is only needed to run the test suite:

```bash
npm install          # jsdom, for the headless render tests
npm test             # verifies the maths against the paper and renders every figure
npm run test:slow    # enumerates all 45 committees to confirm Theorem 6.5
npm run precompute   # regenerates data/landscape.json
```

The exact reference implementation of the algorithm is in Python and needs `z3`:

```bash
pip install z3-solver
npm run test:py        # independent validation sweep
npm run test:py:full   # adds exhaustive small-profile sweeps
npm run stress:py      # adversarial instances
npm run bench:py       # measures the speedup
```

## Layout

GitHub Pages serves the repository root, so the site lives there directly.

```
problem.html                the setup and the core (tab 1)
index.html                  the existence proof (tab 2)
algorithm.html              the algorithm (tab 3)
.nojekyll                   serve files verbatim, without Jekyll
css/style.css               design tokens and layout
data/landscape.json         precomputed V(W) for all 45 committees
js/
  math-core.js              harmonic numbers, water levels, Robin Hood, F and its gradient
  election.js               instances, utilities, PAV, exhaustive core check
  payments.js               payment systems, (P1)-(P4), and the V(W) optimiser
  core-algo.js              the carried-target algorithm, for the browser
  figures/runner.js         the interactive end-to-end runner
  ballot.js                 shared approval-profile renderer
  ui.js                     SVG/DOM helpers, controls, figure scaffold
  figures/                  one module per group of figures
  problem-main.js, main.js, algo-main.js   entry point per tab
core_algorithm.py           exact rational reference implementation (z3)
core-algorithm-explained.md its prose companion
tests/                      math, election, algorithm and render tests
tools/precompute.mjs        regenerates data/landscape.json
tools/serve.mjs             local static server
```

## Correctness

Nothing on the page is hard-coded; every number is computed from the definitions. The implementation
is checked against the paper's own worked examples:

- the Figure 3 water levels `5/18, 5/24, 1/6, 1/7`
- `F(1/2, 1/3, 1/6) = 467/360`, by both the recursion and the series form (6)
- `F(uniform on d) = H_{d-1}`, and `F(1/3,1/3,1/3) = 3/2` from Figure 4
- the marginal-gain identity `F(ρx) = F(x) + max(x)`
- Theorem 4.1(a): `PAV(W + c) − PAV(W) = Σ_{i∈N_c} r_i`
- the Figure 2 facts — `W` maximises PAV, is blocked by `{v1,v2}` with `{c1,c2,c3,c4}`, has uniform
  payments of `2/3 > q` on `c1` and `c2`, and ties PAV with `W'`
- the explicit certificate the paper gives for `W'` satisfies (P1)–(P4)

`npm run test:slow` enumerates all 45 committees of size 8 in that instance and confirms
Theorem 6.5 empirically: every `V`-maximising committee is in the core, while one PAV-maximising
committee is not.

`V(W)` is a concave maximisation over a polytope, solved by projected gradient ascent with Dykstra's
alternating-projection algorithm for the constraints. The values are numerical, not exact, and the
accuracy depends on one option:

- **With `polish: true`** (what `tools/precompute.mjs` uses for the values the figures publish) it
  agrees with the exact rational LP in `core_algorithm.py` to about `2e-8`, and gives equal values to
  committees related by a symmetry of the instance. Costs seconds per committee.
- **Without it** (the browser and the test sweeps) the gradient can stall at a kink of the
  piecewise-linear objective and stop up to about `3e-3` short. That is immaterial where it is used:
  the interactive runner only needs *feasible* payment systems, and it verifies (P1)-(P4) on whatever
  it produces.

`tests/optimiser.test.mjs` pins both regimes against exact-LP reference values.

### The algorithm

`core_algorithm.py` is the exact reference: it solves the payment LP in rational arithmetic with `z3`,
so there are no floating-point tolerances. The approach is **self-certifying** -- it returns a payment
system, and (P1)-(P4) are checkable by direct arithmetic, so by Theorem 3.2 a verified certificate
proves core+ membership. A mistake in the complexity analysis would therefore surface as an infeasible
LP or an exceeded round bound, never as a wrong committee.

It was validated on 2,728 instances (including every profile on 3 candidates x 3 voters and on
4 candidates x 2 voters, at every committee size) plus 200 instances built to defeat the degree
preprocessing, with every certificate re-checked exactly and every committee independently confirmed
in the ordinary core by exhaustive enumeration. See `tests/verify_core_algorithm.py` and
`tests/stress_core_algorithm.py`.

## Credits

- Paper: Patrick Becker, Matthias Greger, Dominik Peters — [arXiv:2609.11912v2](https://arxiv.org/abs/2609.11912).
- Layout and typography follow the editorial style of [sophielwang.com/cues](https://www.sophielwang.com/cues).
- Math typesetting by [KaTeX](https://katex.org/).
