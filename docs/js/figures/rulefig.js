/**
 * Figures for Section 6: the add-then-delete swap argument, and the
 * landscape of all committees under V versus PAV.
 *
 * Both read from docs/data/landscape.json, precomputed by
 * tools/precompute.mjs with exactly the code the page itself ships.
 */

import { h, s, clear, canvas, figure, button, legend, pill, frac, dec, tooltip, hoverable, bar } from '../ui.js';

let DATA = null;

export async function loadData() {
  if (!DATA) {
    const res = await fetch('data/landscape.json');
    DATA = await res.json();
  }
  return DATA;
}

/* =====================================================================
   Figure 8 — the swap argument
   ===================================================================== */

export function mountSwapFigure(host, data) {
  const { instance: I, swap } = data;
  let stage = 0;   // 0: W   1: W + c*   2: W + c* - d

  const body = h('div');
  const tip = tooltip(body);

  const controls = [
    h('div', { class: 'controls' }, [
      h('span', { class: 'ctl-label', text: 'Walk the argument' }),
      button('1 · the committee', () => { stage = 0; render(); }, { cls: 'accent' }),
      button(`2 · add ${swap.cStar.label}`, () => { stage = 1; render(); }),
      button(`3 · delete ${swap.best.label}`, () => { stage = 2; render(); }),
    ]),
  ];

  function render() {
    clear(body);

    const steps = [
      {
        label: `W = {${swap.labelW}}`,
        V: swap.V_W,
        note: `(P3) fails: the losers behind ${swap.cStar.label} hold ${frac(swap.cStar.sum)} ≥ q = ${frac(I.q)} in reserve`,
        bad: true,
      },
      {
        label: `W ∪ {${swap.cStar.label}}`,
        V: swap.V_Wplus,
        note: `Theorem 6.2: adding ${swap.cStar.label} gains ${dec(swap.gain, 4)} ≥ q = ${frac(I.q)}`,
        bad: false,
      },
      {
        label: `W ∪ {${swap.cStar.label}} \\ {${swap.best.label}}`,
        V: swap.best.V,
        note: `Theorem 6.3: deleting ${swap.best.label} costs ${dec(swap.best.drop, 4)} ≤ n/(k+1) = ${dec(I.nOverKPlus1, 4)}`,
        bad: false,
      },
    ];

    /* ---- the ladder of V values ---- */
    const W_ = 620, rowH = 46;
    const svg = canvas(W_, steps.length * rowH + 56);
    const x0 = 18, barW = 360, left = 250;
    const lo = Math.min(...steps.map((t) => t.V)) - 0.5;
    const hi = Math.max(...steps.map((t) => t.V)) + 0.2;
    const sx = (v) => left + ((v - lo) / (hi - lo)) * barW;

    svg.appendChild(s('text', { x: 0, y: 11, class: 'lbl', 'font-weight': 600 },
      'harmonic entropy value V along the swap'));

    steps.forEach((st, j) => {
      const y = 26 + j * rowH;
      const live = j <= stage;
      const g = s('g', { opacity: live ? 1 : 0.28 });
      g.appendChild(s('text', { x: x0, y: y + 13, class: 'lbl-mono', 'font-size': 10.5 }, st.label));
      g.appendChild(s('line', { x1: left, y1: y + 18, x2: left + barW, y2: y + 18, stroke: 'var(--line)' }));
      g.appendChild(bar({
        x: left, y: y + 4, w: sx(st.V) - left, hgt: 14, dir: 'right',
        fill: st.bad ? 'var(--brick)' : 'var(--teal)',
        stroke: st.bad ? 'var(--brick-line)' : 'var(--teal-line)',
      }));
      g.appendChild(s('text', {
        x: sx(st.V) + 8, y: y + 15, class: 'lbl-mono', 'font-weight': 600,
      }, dec(st.V, 4)));
      g.appendChild(s('text', {
        x: x0, y: y + 27, class: 'tick', 'font-size': 9.5,
      }, st.note));
      hoverable(g, tip, `${st.label}\nV = ${dec(st.V, 6)}`);
      svg.appendChild(g);
    });

    // The net arrow, once the walk is complete.
    if (stage === 2) {
      const yA = 26 + 14, yB = 26 + 2 * rowH + 14;
      const xa = sx(swap.V_W), xb = sx(swap.best.V);
      svg.appendChild(s('line', {
        x1: xa, y1: yA, x2: xa, y2: yB + 16,
        stroke: 'var(--amber-line)', 'stroke-width': 1, 'stroke-dasharray': '3 2',
      }));
      svg.appendChild(s('line', {
        x1: xa, y1: yB + 16, x2: xb, y2: yB + 16,
        stroke: 'var(--amber-line)', 'stroke-width': 1.5,
      }));
      svg.appendChild(s('path', {
        d: `M ${xb} ${yB + 16} l -5 -3.2 l 0 6.4 z`,
        fill: 'var(--amber-line)', transform: `rotate(180 ${xb} ${yB + 16})`,
      }));
      svg.appendChild(s('text', {
        x: (xa + xb) / 2, y: yB + 30, class: 'lbl-mono', 'text-anchor': 'middle',
        fill: 'var(--amber-line)', 'font-weight': 600,
      }, `net  +${dec(swap.best.V - swap.V_W, 4)}   >   ε = ${dec(I.eps, 4)}`));
    }
    body.appendChild(svg);

    /* ---- the arithmetic ---- */
    const rows = [
      ['quota', 'q', frac(I.q), ''],
      ['deletion bound', 'n/(k+1)', dec(I.nOverKPlus1, 4), ''],
      ['slack', 'ε = q − n/(k+1)', dec(I.eps, 4), 'must be > 0'],
      ['gain from adding', `V(W ∪ {${swap.cStar.label}}) − V(W)`, dec(swap.gain, 4), `≥ q`],
      ['loss from deleting', `V(W ∪ {${swap.cStar.label}}) − V(…\\{${swap.best.label}})`, dec(swap.best.drop, 4), `≤ n/(k+1)`],
      ['net improvement', 'one single-candidate swap', dec(swap.best.V - swap.V_W, 4), `≥ ε`],
    ];
    body.appendChild(h('div', { class: 'tablewrap', style: 'margin-top:10px' }, [
      h('table', { class: 'data' }, [
        h('tbody', {}, rows.map(([a, b, c, d], j) => h('tr', { class: j === rows.length - 1 ? 'highlight' : '' }, [
          h('td', { text: a }),
          h('td', { class: 'mono', style: 'text-align:left', text: b }),
          h('td', { class: 'mono', text: c }),
          h('td', { class: 'mono', style: 'color:var(--muted)', text: d }),
        ]))),
      ]),
    ]));

    body.appendChild(h('div', { class: 'controls', style: 'margin-top:12px' }, [
      pill(`every deletion from W ∪ {${swap.cStar.label}} was checked — the cheapest is ${swap.best.label}`, 'neutral'),
    ]));

    /* ---- all candidate deletions, to show the averaging bound is real ---- */
    const dw = canvas(620, swap.deletions.length * 13 + 32);
    dw.appendChild(s('text', { x: 0, y: 11, class: 'lbl', 'font-weight': 600 },
      `cost of deleting each member of W ∪ {${swap.cStar.label}}`));
    const dmax = Math.max(...swap.deletions.map((d) => d.drop), I.nOverKPlus1) * 1.15;
    const dx0 = 36, dbw = 430;
    swap.deletions.forEach((d, j) => {
      const y = 20 + j * 13;
      const g = s('g');
      g.appendChild(s('text', { x: 0, y: y + 8, class: 'lbl-mono', 'font-size': 9.5 }, d.label));
      g.appendChild(bar({
        x: dx0, y, w: (d.drop / dmax) * dbw, hgt: 9, dir: 'right',
        fill: j === 0 ? 'var(--amber)' : 'var(--teal-soft)',
        stroke: j === 0 ? 'var(--amber-line)' : 'var(--teal-line)',
      }));
      g.appendChild(s('text', {
        x: dx0 + dbw + 8, y: y + 8, class: 'lbl-mono', 'font-size': 9.5, fill: 'var(--muted)',
      }, dec(d.drop, 4)));
      hoverable(g, tip, `delete ${d.label}\nV drops by ${dec(d.drop, 5)}`);
      dw.appendChild(g);
    });
    const nx = dx0 + (I.nOverKPlus1 / dmax) * dbw;
    dw.appendChild(s('line', {
      x1: nx, y1: 14, x2: nx, y2: 20 + swap.deletions.length * 13,
      stroke: 'var(--fg)', 'stroke-width': 1, 'stroke-dasharray': '3 2',
    }));
    dw.appendChild(s('text', {
      x: nx, y: 11, class: 'lbl-mono', 'text-anchor': 'middle', 'font-size': 9.5,
    }, `n/(k+1) = ${dec(I.nOverKPlus1, 3)}`));
    body.appendChild(dw);

    body.appendChild(legend([
      { label: 'cheapest deletion', fill: 'var(--amber)', line: 'var(--amber-line)' },
      { label: 'other deletions', fill: 'var(--teal-soft)', line: 'var(--teal-line)' },
    ]));
    body.appendChild(h('p', { class: 'hint', text:
      'The averaging argument of Theorem 6.3 guarantees that at least one member is this cheap to remove — '
      + 'the total payments in a de-reserved system are at most n, so the candidate with the smallest total '
      + 'receives at most n/|W|. Here every deletion happens to sit under the bound.' }));
  }

  render();
  host.appendChild(figure({
    id: 'fig-swap', num: 8, controls, body,
    caption: 'The swap argument on the committee that fails the core. If some loser holds a full quota in '
      + 'reserve, adding it gains at least q; some member can then be deleted for at most n/(k+1). Since '
      + 'q > n/(k+1), one single-candidate swap strictly improves V by at least ε — so no committee that is '
      + 'even an approximate local optimum can fail core+.',
  }));
}

/* =====================================================================
   Figure 9 — the landscape: V against PAV over all committees
   ===================================================================== */

export function mountLandscapeFigure(host, data) {
  const { instance: I, landscape, maxV, maxPav } = data;

  // Group committees that share a (V, PAV, core) triple.
  const groups = new Map();
  for (const r of landscape) {
    const key = `${r.V.toFixed(6)}|${r.pav.toFixed(6)}|${r.core}`;
    if (!groups.has(key)) groups.set(key, { V: r.V, pav: r.pav, core: r.core, P3: r.P3, members: [] });
    groups.get(key).members.push(r);
  }
  const pts = [...groups.values()].sort((a, b) => b.V - a.V);

  const body = h('div');
  const tip = tooltip(body);
  let showCore = true;

  function render() {
    clear(body);

    const W_ = 620, Hh = 330;
    const svg = canvas(W_, Hh);
    const L = 58, R = 24, T = 26, B = 52;
    const pw = W_ - L - R, ph = Hh - T - B;

    const vs = pts.map((p) => p.V), ps2 = pts.map((p) => p.pav);
    const vLo = Math.min(...vs) - 0.12, vHi = Math.max(...vs) + 0.12;
    const pLo = Math.min(...ps2) - 0.12, pHi = Math.max(...ps2) + 0.12;
    const sx = (v) => L + ((v - pLo) / (pHi - pLo)) * pw;
    const sy = (v) => T + ph - ((v - vLo) / (vHi - vLo)) * ph;

    // grid + axes
    for (let g = 0; g <= 4; g++) {
      const yv = vLo + ((vHi - vLo) * g) / 4;
      const xv = pLo + ((pHi - pLo) * g) / 4;
      svg.appendChild(s('line', { x1: L, y1: sy(yv), x2: L + pw, y2: sy(yv), stroke: 'var(--line)' }));
      svg.appendChild(s('text', { x: L - 8, y: sy(yv) + 3, class: 'tick', 'text-anchor': 'end' }, dec(yv, 2)));
      svg.appendChild(s('line', { x1: sx(xv), y1: T, x2: sx(xv), y2: T + ph, stroke: 'var(--line)' }));
      svg.appendChild(s('text', { x: sx(xv), y: T + ph + 15, class: 'tick', 'text-anchor': 'middle' }, dec(xv, 2)));
    }
    svg.appendChild(s('line', { x1: L, y1: T + ph, x2: L + pw, y2: T + ph, stroke: 'var(--fg)' }));
    svg.appendChild(s('line', { x1: L, y1: T, x2: L, y2: T + ph, stroke: 'var(--fg)' }));
    svg.appendChild(s('text', { x: L + pw / 2, y: Hh - 16, class: 'lbl', 'text-anchor': 'middle' }, 'PAV score'));
    svg.appendChild(s('text', {
      x: 12, y: T + ph / 2, class: 'lbl', 'text-anchor': 'middle',
      transform: `rotate(-90 12 ${T + ph / 2})`,
    }, 'harmonic entropy value  V(W)'));

    // the two optima
    svg.appendChild(s('line', {
      x1: L, y1: sy(maxV), x2: L + pw, y2: sy(maxV),
      stroke: 'var(--teal-line)', 'stroke-width': 1, 'stroke-dasharray': '4 3',
    }));
    svg.appendChild(s('text', {
      x: L + pw, y: sy(maxV) - 5, class: 'lbl-mono', 'text-anchor': 'end',
      fill: 'var(--teal-line)', 'font-size': 9.5,
    }, 'max V — the harmonic entropy rule'));
    svg.appendChild(s('line', {
      x1: sx(maxPav), y1: T, x2: sx(maxPav), y2: T + ph,
      stroke: 'var(--brick-line)', 'stroke-width': 1, 'stroke-dasharray': '4 3',
    }));
    svg.appendChild(s('text', {
      x: sx(maxPav) - 6, y: T + 11, class: 'lbl-mono', 'text-anchor': 'end',
      fill: 'var(--brick-line)', 'font-size': 9.5,
    }, 'max PAV'));

    // marks: circle = in core, square = not (so identity is not colour alone)
    pts.forEach((p) => {
      const rad = 5 + Math.sqrt(p.members.length) * 2.6;
      const g = s('g');
      const fill = p.core ? 'var(--teal)' : 'var(--brick)';
      const line = p.core ? 'var(--teal-line)' : 'var(--brick-line)';
      if (p.core) {
        g.appendChild(s('circle', {
          cx: sx(p.pav), cy: sy(p.V), r: rad,
          fill, 'fill-opacity': 0.55, stroke: line, 'stroke-width': 2,
        }));
      } else {
        g.appendChild(s('rect', {
          x: sx(p.pav) - rad, y: sy(p.V) - rad, width: rad * 2, height: rad * 2,
          fill, 'fill-opacity': 0.55, stroke: line, 'stroke-width': 2,
        }));
      }
      g.appendChild(s('text', {
        x: sx(p.pav), y: sy(p.V) + 3.5, class: 'lbl-mono',
        'text-anchor': 'middle', 'font-size': 9.5, 'font-weight': 600,
        fill: '#fff',
      }, String(p.members.length)));
      hoverable(g, tip,
        `${p.members.length} committee${p.members.length > 1 ? 's' : ''}\n`
        + `V = ${dec(p.V, 5)}\nPAV = ${dec(p.pav, 5)}\n`
        + `${p.core ? 'in the core' : 'NOT in the core'}\n`
        + `(P3) ${p.P3 ? 'holds' : 'fails'}\n`
        + `e.g. ${p.members[0].label}`);
      svg.appendChild(g);
    });

    body.appendChild(svg);

    body.appendChild(legend([
      { label: 'in the core (circle)', fill: 'rgba(13,148,136,.55)', line: 'var(--teal-line)' },
      { label: 'not in the core (square)', fill: 'rgba(205,60,72,.55)', line: 'var(--brick-line)' },
    ]));

    // The table view, so the figure is readable without colour.
    const tbl = h('table', { class: 'data' }, [
      h('thead', {}, [h('tr', {}, ['V(W)', 'PAV(W)', 'committees', 'in core', '(P3) holds', 'example']
        .map((t) => h('th', { text: t })))]),
      h('tbody', {}, pts.map((p) => h('tr', { class: p.V > maxV - 1e-6 ? 'highlight' : '' }, [
        h('td', { class: 'mono', text: dec(p.V, 4) }),
        h('td', { class: 'mono', text: dec(p.pav, 4) }),
        h('td', { class: 'mono', text: String(p.members.length) }),
        h('td', {}, [pill(p.core ? 'yes' : 'no', p.core ? 'pass' : 'fail')]),
        h('td', {}, [pill(p.P3 ? 'yes' : 'no', p.P3 ? 'pass' : 'fail')]),
        h('td', { class: 'mono', style: 'text-align:left', text: p.members[0].label }),
      ]))),
    ]);
    body.appendChild(h('div', { class: 'tablewrap', style: 'margin-top:14px' }, [tbl]));

    const heWinners = landscape.filter((r) => r.V > maxV - 1e-6);
    const pavWinners = landscape.filter((r) => r.pav > maxPav - 1e-9);
    body.appendChild(h('div', { class: 'controls', style: 'margin-top:12px' }, [
      pill(`all ${heWinners.length} V-maximising committees are in the core`, 'pass'),
      pill(`${pavWinners.filter((r) => !r.core).length} of ${pavWinners.length} PAV-maximising committees are not`, 'fail'),
    ]));
    body.appendChild(h('p', { class: 'hint', text:
      'Every one of the 45 committees of size 8 is plotted, with the marker labelled by how many share that '
      + 'exact pair of scores. The two rules disagree: the V-optimum sits below the PAV-optimum on the '
      + 'horizontal axis, and the single PAV-optimal committee that fails the core has the lowest V of all the '
      + 'PAV winners.' }));
  }

  render();
  host.appendChild(figure({
    id: 'fig-landscape', num: 9, controls: [], body,
    caption: 'All 45 committees of size k = 8 in this instance, scored by PAV and by harmonic entropy. '
      + 'Maximising V always lands in the core; maximising PAV need not. This is the computational shadow of '
      + 'Theorem 6.5 — and a reminder that the harmonic entropy rule is genuinely a different rule, not a '
      + 'reformulation of PAV.',
  }));
}
