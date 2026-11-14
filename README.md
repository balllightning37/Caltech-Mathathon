# Caltech Mathathon

An interactive explainer for the paper **"Existence of the Core in Approval-Based Committee Elections"**
by Patrick Becker, Matthias Greger, and Dominik Peters ([arXiv:2609.11912v2](https://arxiv.org/abs/2609.11912), cs.GT).

## The paper in one paragraph

The paper resolves the central open question in the theory of approval-based committee elections by
proving that **the core is always non-empty**: there always exists a committee such that no coalition of
voters can deviate to an alternative committee of proportional size that every member of the coalition
strictly prefers. The proof strengthens the core to **core+** (robustness even to *fractional*
deviations), reformulates it via LP duality as a payment-based certificate in which no losing candidate
gathers too much support, and then selects a committee whose certificate maximizes a novel
**harmonic entropy** objective. Optimal — and even locally optimal — solutions are shown to certify
core+, which also yields a polynomial-time algorithm.

## Repository contents

| Path | Description |
| --- | --- |
| `2609.11912v2.pdf` | The source paper. |
| `README.md` | This file. |

## Status

Early setup. The interactive explainer is being built in steps; this README will grow to document the
structure, how to run it locally, and the concepts it covers.
