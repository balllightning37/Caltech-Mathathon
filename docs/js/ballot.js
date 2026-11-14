/**
 * Shared renderer for an approval profile, drawn the way the paper draws
 * Figure 2: voters sit along the bottom, and each candidate is a rectangle
 * spanning exactly the voters who approve it.
 */

import { s, canvas, hoverable } from './ui.js';

const COL = 58;      // width of one voter column
const ROW = 26;      // height of one candidate rectangle
const GAP = 3;
const PAD_L = 16;
const VOTER_BAND = 34;

/**
 * Greedy row assignment: place each candidate in the lowest row whose
 * columns are all still free, so rectangles never overlap.
 */
function assignRows(inst, order) {
  const rows = [];           // rows[r] = Set of occupied voter columns
  const rowOf = {};
  for (const c of order) {
    const sup = inst.supporters[c];
    if (sup.length === 0) { rowOf[c] = -1; continue; }
    let r = 0;
    for (;; r++) {
      if (!rows[r]) { rows[r] = new Set(); }
      if (sup.every((i) => !rows[r].has(i))) break;
    }
    sup.forEach((i) => rows[r].add(i));
    rowOf[c] = r;
  }
  return { rowOf, nRows: rows.length };
}

/**
 * Draw the profile.
 *
 * opts.W            committee (Set or array) drawn as winners
 * opts.coalition    voter indices to highlight
 * opts.proposal     candidate indices to outline as a proposal T
 * opts.onCandidate  click handler (candidate index)
 * opts.onVoter      click handler (voter index)
 * opts.annotate     (c) => string|null, extra label at the rectangle's right
 * opts.tint         (c) => {fill, stroke} override
 */
export function drawProfile(inst, opts = {}) {
  const Wset = opts.W instanceof Set ? opts.W : new Set(opts.W || []);
  const coalition = new Set(opts.coalition || []);
  const proposal = new Set(opts.proposal || []);
  const order = opts.order || inst.candidates.map((_, c) => c);
  const { rowOf, nRows } = assignRows(inst, order);

  const width = PAD_L * 2 + inst.n * COL + (opts.rightPad || 0);
  const height = nRows * (ROW + GAP) + VOTER_BAND + 10;
  const svg = canvas(width, height);
  const colX = (i) => PAD_L + i * COL;
  const rowY = (r) => (nRows - 1 - r) * (ROW + GAP) + 4;

  // Voter column guides.
  for (let i = 0; i < inst.n; i++) {
    svg.appendChild(s('rect', {
      x: colX(i) + 1, y: 2, width: COL - 2,
      height: nRows * (ROW + GAP) + 4,
      fill: coalition.has(i) ? 'var(--pink-soft)' : 'transparent',
    }));
  }

  // Candidate rectangles.
  for (const c of order) {
    const sup = inst.supporters[c];
    if (sup.length === 0 || rowOf[c] < 0) continue;
    const lo = Math.min(...sup), hi = Math.max(...sup);
    const x = colX(lo) + 2;
    const w = (hi - lo + 1) * COL - 4;
    const y = rowY(rowOf[c]);
    const isWinner = Wset.has(c);
    const inT = proposal.has(c);

    let fill = isWinner ? 'var(--teal-soft)' : '#fff';
    let stroke = isWinner ? 'var(--teal-line)' : 'var(--line-strong)';
    if (opts.tint) {
      const t = opts.tint(c);
      if (t) { fill = t.fill ?? fill; stroke = t.stroke ?? stroke; }
    }

    const g = s('g', { style: opts.onCandidate ? 'cursor:pointer' : '' });
    g.appendChild(s('rect', {
      x, y, width: w, height: ROW,
      fill, stroke,
      'stroke-width': isWinner ? 1.5 : 1,
      'stroke-dasharray': isWinner ? null : '3 2.5',
    }));
    if (inT) {
      g.appendChild(s('rect', {
        x: x - 3, y: y - 3, width: w + 6, height: ROW + 6,
        fill: 'none', stroke: 'var(--violet)', 'stroke-width': 1.5,
      }));
    }
    g.appendChild(s('text', {
      x: x + w / 2, y: y + ROW / 2 + 4,
      class: 'lbl-mono', 'text-anchor': 'middle',
      fill: isWinner ? 'var(--teal-line)' : 'var(--muted-strong)',
      'font-weight': isWinner ? 600 : 400,
    }, inst.candidates[c]));

    if (opts.annotate) {
      const a = opts.annotate(c);
      if (a) {
        g.appendChild(s('text', {
          x: colX(inst.n - 1) + COL + 6, y: y + ROW / 2 + 4,
          class: 'lbl-mono', fill: 'var(--muted)',
        }, a));
      }
    }

    if (opts.onCandidate) g.addEventListener('click', () => opts.onCandidate(c));
    if (opts.tip) {
      hoverable(g, opts.tip,
        `${inst.candidates[c]}  ${isWinner ? '(winner)' : '(loser)'}\n`
        + `approved by ${sup.map((i) => inst.voters[i]).join(', ')}`);
    }
    svg.appendChild(g);
  }

  // Voter labels.
  const baseY = nRows * (ROW + GAP) + 8;
  svg.appendChild(s('line', {
    x1: PAD_L, y1: baseY, x2: PAD_L + inst.n * COL, y2: baseY,
    stroke: 'var(--fg)', 'stroke-width': 1,
  }));
  for (let i = 0; i < inst.n; i++) {
    const g = s('g', { style: opts.onVoter ? 'cursor:pointer' : '' });
    g.appendChild(s('text', {
      x: colX(i) + COL / 2, y: baseY + 16,
      class: 'lbl-mono', 'text-anchor': 'middle',
      'font-weight': coalition.has(i) ? 600 : 400,
      fill: coalition.has(i) ? 'var(--pink-line)' : 'var(--fg)',
    }, inst.voters[i]));
    if (opts.voterNote) {
      const note = opts.voterNote(i);
      if (note) {
        g.appendChild(s('text', {
          x: colX(i) + COL / 2, y: baseY + 29,
          class: 'tick', 'text-anchor': 'middle',
        }, note));
      }
    }
    if (opts.onVoter) g.addEventListener('click', () => opts.onVoter(i));
    svg.appendChild(g);
  }

  return svg;
}

export const BALLOT_COL = COL;
