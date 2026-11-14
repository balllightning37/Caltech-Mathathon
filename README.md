# Caltech Mathathon

An interactive explainer for **"Existence of the Core in Approval-Based Committee Elections"**
by Patrick Becker, Matthias Greger and Dominik Peters
([arXiv:2609.11912v2](https://arxiv.org/abs/2609.11912), cs.GT).

**Live site:** https://balllightning37.github.io/Caltech-Mathathon/

## What this covers

Sections 2–6 of the paper: the proof that **core+ is always satisfiable**, and hence that the core
of an approval-based committee election is never empty. The page follows the argument in ten steps,
each with a live diagram:

| § | Topic | Paper |
| --- | --- | --- |
| 1 | The question that was open | §1 |
| 2 | Elections, committees, quotas | §2 |
| 3 | The core, and how it fails | §3 |
| 4 | Core+: deviating by fractions | §3, Def. 3.1 |
| 5 | Payment systems as certificates | §3, (P1)–(P4), Thm 3.2 |
| 6 | What PAV gets right, and wrong | §4, Thm 4.1 |
| 7 | The Robin Hood operator | §5.1, Lem. 5.1 |
| 8 | Harmonic entropy | §5.2, Prop. 5.2 |
| 9 | The harmonic entropy rule | §6, Thms 6.2, 6.3, 6.5 |
| 10 | Why this proves existence | — |

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

```bash
npm install          # jsdom, for the render tests only
npm run serve        # serves docs/ at http://localhost:8080
npm test             # verifies the maths and renders every figure headlessly
```

The site is plain static HTML, CSS and ES modules — there is no build step. `npm install` is needed
only for the tests.

## Layout

```
docs/                       the published site (GitHub Pages root)
  index.html                the explainer
  css/style.css             design tokens and layout
  data/landscape.json       precomputed V(W) for all 45 committees
  js/
    math-core.js            harmonic numbers, water levels, Robin Hood, F and its gradient
    election.js             instances, utilities, PAV, exhaustive core check
    payments.js             payment systems, (P1)-(P4), and the V(W) optimiser
    ballot.js               shared approval-profile renderer
    ui.js                   SVG/DOM helpers, controls, figure scaffold
    figures/                one module per group of figures
    main.js                 entry point
tests/                      math, election and headless render tests
tools/precompute.mjs        regenerates docs/data/landscape.json
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

`npm run test:slow` additionally enumerates all 45 committees of size 8 in that instance and confirms
Theorem 6.5 empirically: every `V`-maximising committee is in the core, while one PAV-maximising
committee is not.

`V(W)` is a concave maximisation over a polytope, solved by projected gradient ascent with Dykstra's
alternating-projection algorithm for the constraints. Those values are numerical rather than exact.

## Credits

- Paper: Patrick Becker, Matthias Greger, Dominik Peters — [arXiv:2609.11912v2](https://arxiv.org/abs/2609.11912).
- Layout and typography follow the editorial style of [sophielwang.com/cues](https://www.sophielwang.com/cues).
- Math typesetting by [KaTeX](https://katex.org/).
