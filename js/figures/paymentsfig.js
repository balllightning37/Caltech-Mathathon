/**
 * Figures for Section 3 (payment systems as certificates) and Section 4
 * (proportional approval voting and where its uniform payments break).
 */

import {
  h, s, clear, canvas, figure, button, segmented, legend, pill,
  frac, dec, tooltip, hoverable, bar,
  threshold, CHART_TITLE_Y, CHART_TOP,
} from '../ui.js';
import { figure2Instance, FIG2_W, FIG2_WP, utilities, pavScore, inCore } from '../election.js';
import {
  uniformPaymentSystem, paymentShape, checkConditions, receives, reserveBehind,
  totalEntropy, harmonicEntropyValue, distribution,
} from '../payments.js';
import { H, harmonicEntropy } from '../math-core.js';

const PLOT_W = 600;

/** Deep copy of a payment system. */
function clonePS(ps) {
  return { r: ps.r.slice(), p: ps.p.map((m) => new Map(m)), shape: ps.shape };
}

/** The explicit certificate the paper gives for W' in Section 4. */
function paperCertificate(inst) {
  const shape = paymentShape(inst, FIG2_WP);
  return {
    r: [3 / 10, 2 / 5, 1 / 6, 1 / 6],
    p: [
      new Map([[0, 1 / 5], [1, 1 / 5], [2, 3 / 10]]),
      new Map([[0, 3 / 10], [1, 3 / 10]]),
      new Map([4, 5, 6, 7, 8].map((c) => [c, 1 / 6])),
      new Map([4, 5, 6, 7, 8].map((c) => [c, 1 / 6])),
    ],
    shape,
  };
}

/* =====================================================================
   Figure 4 — the payment-system playground
   ===================================================================== */

export function mountPaymentsFigure(host, { num = 4 } = {}) {
  const inst = figure2Instance();
  let committee = 'W';
  let ps = uniformPaymentSystem(inst, FIG2_W);

  const body = h('div');
  const tip = tooltip(body);

  const Wof = () => (committee === 'W' ? FIG2_W : FIG2_WP);

  function setPreset(kind) {
    const W = Wof();
    if (kind === 'uniform') ps = uniformPaymentSystem(inst, W);
    else if (kind === 'allreserve') {
      const shape = paymentShape(inst, W);
      ps = { r: inst.voters.map(() => 1), p: shape.map((cs) => new Map(cs.map((c) => [c, 0]))), shape };
    } else if (kind === 'paper') {
      committee = 'WP'; cmtCtl.replaceWith(cmtCtl = buildCommittee());
      ps = paperCertificate(inst);
    } else if (kind === 'optimal') {
      ps = clonePS(harmonicEntropyValue(inst, W).system);
    }
    render();
  }

  function buildCommittee() {
    return segmented(
      [
        { value: 'W',  label: 'W = {c1,c2,c5…c10}',  title: 'the PAV winner that fails the core' },
        { value: 'WP', label: "W' = {c1,c2,c3,c5…c9}", title: 'PAV-tied, and in the core' },
      ],
      committee,
      (v) => { committee = v; ps = uniformPaymentSystem(inst, Wof()); render(); }
    );
  }
  let cmtCtl = buildCommittee();

  const controls = [
    h('div', { class: 'controls' }, [h('span', { class: 'ctl-label', text: 'Committee' }), cmtCtl]),
    h('div', { class: 'controls' }, [
      h('span', { class: 'ctl-label', text: 'Payments' }),
      button('Uniform (PAV)', () => setPreset('uniform'), { cls: 'accent' }),
      button('All reserve', () => setPreset('allreserve')),
      button("Paper's certificate for W'", () => setPreset('paper')),
      button('Maximise Σ F', () => setPreset('optimal')),
    ]),
  ];

  function render() {
    clear(body);
    const W = Wof();
    const Wset = new Set(W);
    const cond = checkConditions(inst, W, ps);
    const shape = ps.shape;

    /* ---- the voter budget bars, with draggable boundaries ---- */
    const rowH = 34, left = 40, barW = 380;
    const svg = canvas(PLOT_W, inst.n * rowH + 46);
    svg.appendChild(s('text', { x: 0, y: 11, class: 'lbl', 'font-weight': 600 }, 'each voter’s unit budget'));

    inst.voters.forEach((vname, i) => {
      const y = 24 + i * rowH;
      const cs = shape[i];
      const segs = [{ key: 'r', label: 'reserve', v: ps.r[i], fill: 'var(--amber)', line: 'var(--amber-line)' }]
        .concat(cs.map((c) => ({
          key: c, label: inst.candidates[c], v: ps.p[i].get(c) ?? 0,
          fill: 'var(--teal)', line: 'var(--teal-line)',
        })));

      svg.appendChild(s('text', { x: 0, y: y + 15, class: 'lbl-mono' }, vname));
      svg.appendChild(s('rect', { x: left, y, width: barW, height: 20, fill: 'var(--surface-raised)' }));

      let acc = 0;
      segs.forEach((sg, t) => {
        const x = left + acc * barW;
        const w = sg.v * barW;
        acc += sg.v;
        if (w <= 0.2) return;
        // 2px surface gap between adjacent fills.
        const g = s('g');
        g.appendChild(s('rect', {
          x: x + 1, y, width: Math.max(w - 2, 0.6), height: 20,
          fill: sg.fill, stroke: sg.line, 'stroke-width': 1,
        }));
        if (w > 34) {
          g.appendChild(s('text', {
            x: x + w / 2, y: y + 14, class: 'lbl-mono', 'text-anchor': 'middle',
            fill: '#fff', 'font-size': 10,
          }, sg.key === 'r' ? 'r' : sg.label));
        }
        hoverable(g, tip, `${vname} → ${sg.key === 'r' ? 'reserve' : sg.label}\n${frac(sg.v)}  = ${dec(sg.v, 4)}`);
        svg.appendChild(g);
      });

      // Draggable boundaries between consecutive segments.
      acc = 0;
      for (let t = 0; t < segs.length - 1; t++) {
        acc += segs[t].v;
        const bx = left + acc * barW;
        const handle = s('g', { style: 'cursor:ew-resize' });
        handle.appendChild(s('rect', { x: bx - 4, y: y - 3, width: 8, height: 26, fill: 'transparent' }));
        handle.appendChild(s('line', {
          x1: bx, y1: y - 3, x2: bx, y2: y + 23,
          stroke: 'var(--fg)', 'stroke-width': 1.5,
        }));
        const lo = segs[t], hi = segs[t + 1];
        const startAcc = acc - lo.v;        // cumulative mass before `lo`
        const pool = lo.v + hi.v;
        handle.addEventListener('pointerdown', (ev) => {
          ev.preventDefault();
          handle.setPointerCapture(ev.pointerId);
          const move = (e) => {
            const pt = svg.createSVGPoint();
            pt.x = e.clientX; pt.y = e.clientY;
            const loc = pt.matrixTransform(svg.getScreenCTM().inverse());
            let frac2 = (loc.x - left) / barW - startAcc;
            frac2 = Math.max(0, Math.min(pool, frac2));
            const setSeg = (sg, v) => {
              if (sg.key === 'r') ps.r[i] = v; else ps.p[i].set(sg.key, v);
            };
            setSeg(lo, frac2); setSeg(hi, pool - frac2);
            render();
          };
          const up = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
          };
          window.addEventListener('pointermove', move);
          window.addEventListener('pointerup', up);
        });
        svg.appendChild(handle);
      }

      // F of this voter's distribution.
      const f = harmonicEntropy(distribution(ps, i)).value;
      svg.appendChild(s('text', {
        x: left + barW + 10, y: y + 15, class: 'lbl-mono', fill: 'var(--muted)',
      }, `F = ${dec(f, 3)}`));
    });
    body.appendChild(svg);

    /* ---- candidate totals against the quota ---- */
    const bh = 9, bgap = 2;
    const cw = canvas(PLOT_W, CHART_TOP + inst.m * (bh + bgap) + 6);
    cw.appendChild(s('text', { x: 0, y: CHART_TITLE_Y, class: 'lbl', 'font-weight': 600 },
      'what each candidate collects   (winners: payments · losers: reserve behind them)'));
    const cx0 = 40, cbw = PLOT_W - 110, maxV = Math.max(inst.q * 1.9, 0.9);
    inst.candidates.forEach((cname, c) => {
      const isW = Wset.has(c);
      const v = isW ? receives(inst, ps, c) : reserveBehind(inst, ps, c);
      const y = CHART_TOP + 2 + c * (bh + bgap);
      const bad = isW ? v > inst.q + 1e-7 : v >= inst.q - 1e-7;
      const g = s('g');
      g.appendChild(s('text', { x: 0, y: y + 8, class: 'lbl-mono', 'font-size': 9.5 }, cname));
      g.appendChild(bar({
        x: cx0, y, w: (v / maxV) * cbw, hgt: bh, dir: 'right',
        fill: bad ? 'var(--brick)' : (isW ? 'var(--teal)' : 'var(--amber)'),
        stroke: bad ? 'var(--brick-line)' : (isW ? 'var(--teal-line)' : 'var(--amber-line)'),
      }));
      g.appendChild(s('text', {
        x: cx0 + cbw + 8, y: y + 8, class: 'lbl-mono', 'font-size': 9.5,
        fill: bad ? 'var(--bad)' : 'var(--muted)',
      }, dec(v, 3)));
      hoverable(g, tip, `${cname}  ${isW ? 'winner' : 'loser'}\n${isW ? 'receives' : 'reserve behind it'} ${dec(v, 4)}\nquota q = ${dec(inst.q, 3)}`);
      cw.appendChild(g);
    });
    cw.appendChild(threshold({
      x: cx0 + (inst.q / maxV) * cbw,
      bottom: CHART_TOP + inst.m * (bh + bgap),
      label: `q = ${frac(inst.q)}`,
      width: PLOT_W,
    }));
    body.appendChild(cw);

    /* ---- the four conditions ---- */
    const descr = {
      P1: 'r_i + Σ p_ic = 1 — every voter spends a unit budget',
      P2: 'r_i ≥ p_ic — the reserve backs every single payment',
      P3: 'Σ_{i∈N_c} r_i < q for every loser c — no loser has a quota in reserve',
      P4: 'Σ_{i∈N_c} p_ic ≤ q for every winner c — nobody is overcharged',
    };
    const witness = (k2) => {
      const ws = cond.witnesses[k2];
      if (!ws.length) return '';
      if (k2 === 'P3' || k2 === 'P4') return ws.map((w) => `${inst.candidates[w.c]} = ${dec(w.sum, 3)}`).join(', ');
      if (k2 === 'P2') return ws.map((w) => `${inst.voters[w.i]}→${inst.candidates[w.c]}`).join(', ');
      return ws.map((w) => `${inst.voters[w.i]}`).join(', ');
    };

    const condTbl = h('table', { class: 'data' }, [
      h('tbody', {}, ['P1', 'P2', 'P3', 'P4'].map((k2) => h('tr', {}, [
        h('td', { style: 'font-family:var(--font-mono)', text: `(${k2})` }),
        h('td', { style: 'text-align:left;white-space:normal', text: descr[k2] }),
        h('td', { class: 'mono', style: 'color:var(--bad)', text: cond[k2] ? '' : witness(k2) }),
        h('td', {}, [pill(cond[k2] ? 'holds' : 'violated', cond[k2] ? 'pass' : 'fail')]),
      ]))),
    ]);
    body.appendChild(h('div', { class: 'tablewrap', style: 'margin-top:16px' }, [condTbl]));

    const all4 = cond.P1 && cond.P2 && cond.P3 && cond.P4;
    body.appendChild(h('div', { class: 'controls', style: 'margin-top:14px' }, [
      all4 ? pill('a certificate for core+', 'pass') : pill('not yet a certificate', 'neutral'),
      pill(`Σ F = ${dec(totalEntropy(inst, ps), 4)}`, 'neutral'),
      pill(`PAV(${committee === 'W' ? 'W' : "W'"}) = ${dec(pavScore(inst, W), 4)}`, 'neutral'),
      pill(inCore(inst, W) ? 'this committee is in the core' : 'this committee is NOT in the core',
        inCore(inst, W) ? 'pass' : 'fail'),
    ]));

    body.appendChild(legend([
      { label: 'reserve r_i', fill: 'var(--amber)', line: 'var(--amber-line)' },
      { label: 'payment p_ic', fill: 'var(--teal)', line: 'var(--teal-line)' },
      { label: 'over the quota', fill: 'var(--brick)', line: 'var(--brick-line)' },
    ]));
    body.appendChild(h('p', { class: 'hint', text:
      'Drag the black dividers to move budget between a voter’s reserve and her payments. (P1) therefore '
      + 'holds automatically; the other three fight each other. On W, try to fix the (P4) violation on c1 and '
      + 'c2 — every repair pushes reserve up until c3 or c4 breaks (P3). On W′ it can be done.' }));
  }

  render();
  host.appendChild(figure({
    id: 'fig-payments', num, controls, body,
    caption: 'A payment system is a certificate. Conditions (P1)–(P4) are checkable by inspection, and by '
      + 'Theorem 3.2 a committee satisfies core+ exactly when some payment system satisfies all four. '
      + 'For W no such system exists; for W′ the paper exhibits one.',
  }));
}

/* =====================================================================
   Figure 5 — PAV: harmonic marginal gains, and the swap argument
   ===================================================================== */

export function mountPavFigure(host, { num = 5 } = {}) {
  const inst = figure2Instance();
  let W = new Set(FIG2_W);
  let added = null;

  const body = h('div');
  const tip = tooltip(body);

  const controls = [
    h('div', { class: 'controls' }, [
      h('span', { class: 'ctl-label', text: 'Add a loser' }),
      ...[2, 3, 9].map((c) => button(inst.candidates[c], () => {
        added = added === c ? null : c; render();
      })),
      button('Reset', () => { W = new Set(FIG2_W); added = null; render(); }),
    ]),
  ];

  function render() {
    clear(body);
    const Wa = [...W].sort((a, b) => a - b);
    const ps = uniformPaymentSystem(inst, Wa);
    const u = utilities(inst, Wa);

    /* ---- harmonic staircase: each voter's utility as stacked 1/j blocks ---- */
    const rowH = 30, left = 40, unit = 46;
    const svg = canvas(PLOT_W, inst.n * rowH + 56);
    svg.appendChild(s('text', { x: 0, y: 11, class: 'lbl', 'font-weight': 600 },
      'PAV score  =  Σ_i H_{u_i(W)}      each approved winner adds 1/j, the next one less'));

    inst.voters.forEach((vname, i) => {
      const y = 24 + i * rowH;
      svg.appendChild(s('text', { x: 0, y: y + 14, class: 'lbl-mono' }, vname));
      let x = left;
      for (let j = 1; j <= u[i]; j++) {
        const w = unit / j;
        const g = s('g');
        g.appendChild(s('rect', {
          x: x + 1, y, width: Math.max(w - 2, 0.8), height: 18,
          fill: 'var(--teal-soft)', stroke: 'var(--teal-line)', 'stroke-width': 1,
        }));
        if (w > 20) {
          g.appendChild(s('text', {
            x: x + w / 2, y: y + 13, class: 'lbl-mono', 'text-anchor': 'middle',
            'font-size': 9.5, fill: 'var(--teal-line)',
          }, `1/${j}`));
        }
        hoverable(g, tip, `${vname}: ${j}th approved winner\nadds 1/${j} = ${dec(1 / j, 4)}`);
        svg.appendChild(g);
        x += w;
      }
      // The reserve = the next marginal gain = 1/(u+1).
      const wR = unit / (u[i] + 1);
      const gR = s('g');
      gR.appendChild(s('rect', {
        x: x + 1, y, width: Math.max(wR - 2, 0.8), height: 18,
        fill: 'var(--amber-soft)', stroke: 'var(--amber-line)', 'stroke-width': 1,
        'stroke-dasharray': '3 2',
      }));
      hoverable(gR, tip,
        `${vname}: reserve r = 1/(u+1) = ${frac(ps.r[i])}\n`
        + 'this is exactly what one more approved winner would add');
      svg.appendChild(gR);
      svg.appendChild(s('text', {
        x: x + wR + 10, y: y + 14, class: 'lbl-mono', fill: 'var(--muted)',
      }, `H_${u[i]} = ${dec(H(u[i]), 3)}   r = ${frac(ps.r[i])}`));
    });
    body.appendChild(svg);

    /* ---- Theorem 4.1(a) in action ---- */
    const rows = [];
    for (const c of [2, 3, 9]) {
      const gain = pavScore(inst, [...Wa, c]) - pavScore(inst, Wa);
      const res = reserveBehind(inst, ps, c);
      rows.push(h('tr', { class: added === c ? 'highlight' : '' }, [
        h('td', { text: inst.candidates[c] }),
        h('td', { class: 'mono', text: inst.supporters[c].map((i) => inst.voters[i]).join(',') }),
        h('td', { class: 'mono', text: dec(res, 4) }),
        h('td', { class: 'mono', text: dec(gain, 4) }),
        h('td', {}, [pill(res < inst.q ? `< q` : `≥ q`, res < inst.q ? 'pass' : 'fail')]),
      ]));
    }
    body.appendChild(h('div', { class: 'tablewrap', style: 'margin-top:16px;max-width:560px' }, [
      h('table', { class: 'data' }, [
        h('thead', {}, [h('tr', {}, ['loser c', 'supporters N_c', 'Σ r_i', 'PAV(W+c) − PAV(W)', '(P3)']
          .map((t) => h('th', { text: t })))]),
        h('tbody', {}, rows),
      ]),
    ]));
    body.appendChild(h('p', { class: 'hint', text:
      'The two middle columns always agree: that is Theorem 4.1(a). Because a PAV-optimal committee '
      + 'cannot be improved by any swap, and deleting the cheapest of k+1 candidates costs at most n/(k+1) < q, '
      + 'no loser can reach a full quota of reserve — so (P3) holds automatically.' }));

    /* ---- the (P4) failure ---- */
    const cond = checkConditions(inst, Wa, ps);
    body.appendChild(h('div', { class: 'controls', style: 'margin-top:14px' }, [
      pill('(P1) holds', 'pass'), pill('(P2) holds', 'pass'),
      pill(cond.P3 ? '(P3) holds' : '(P3) violated', cond.P3 ? 'pass' : 'fail'),
      pill(cond.P4 ? '(P4) holds' : `(P4) violated: ${cond.witnesses.P4.map((w) => `${inst.candidates[w.c]}=${frac(w.sum)}`).join(', ')}`,
        cond.P4 ? 'pass' : 'fail'),
    ]));
    body.appendChild(legend([
      { label: 'utility already held (1/j blocks)', fill: 'var(--teal-soft)', line: 'var(--teal-line)' },
      { label: 'reserve r_i = 1/(u_i+1)', fill: 'var(--amber-soft)', line: 'var(--amber-line)' },
    ]));
  }

  render();
  host.appendChild(figure({
    id: 'fig-pav', num, controls, body,
    caption: 'PAV reads as a payment rule. A voter with u approved winners splits her budget into u + 1 equal '
      + 'parts, so her reserve is 1/(u+1) — exactly the PAV gain from one more approved winner. That identity '
      + 'drives the swap argument that gives (P3) for free. But on W the shared candidates c1 and c2 each collect '
      + '2/3 > q = 1/2, so (P4) fails: PAV overcharges v1 and v2.',
  }));
}
