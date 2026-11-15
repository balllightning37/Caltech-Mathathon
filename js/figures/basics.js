/**
 * Figures for Sections 2 and 3: the election instance, and the core.
 */

import { h, s, clear, canvas, figure, slider, segmented, button, legend, pill, frac, dec, tooltip, bar } from '../ui.js';
import { drawProfile } from '../ballot.js';
import { figure2Instance, makeInstance, utilities, findCoreViolation, blocks, utility, pavScore } from '../election.js';

/* =====================================================================
   Figure 1 — the instance: ballots, committee, quota, utilities
   ===================================================================== */

export function mountInstanceFigure(host, { num = 1 } = {}) {
  const base = figure2Instance();
  let W = new Set([0, 1, 4, 5, 6, 7, 8, 9]);
  let quotaKind = 'hare';

  const body = h('div');
  const tip = tooltip(body);

  const quotaCtl = segmented(
    [
      { value: 'hare',  label: 'Hare  n/k',      title: 'q = n/k' },
      { value: 'droop', label: 'Droop  n/(k+1)', title: 'q = n/(k+1)' },
    ],
    quotaKind,
    (v) => { quotaKind = v; render(); }
  );

  const resetBtn = button('Reset to Figure 2', () => {
    W = new Set([0, 1, 4, 5, 6, 7, 8, 9]);
    render();
  }, { cls: 'accent' });

  const controls = [
    h('div', { class: 'controls' }, [
      h('span', { class: 'ctl-label', text: 'Quota' }), quotaCtl,
      h('span', { class: 'ctl-label', text: 'Committee' }), resetBtn,
    ]),
  ];

  function render() {
    clear(body);
    const inst = makeInstance({
      voters: base.voters, candidates: base.candidates,
      approvals: base.approvals, k: base.k, quota: quotaKind,
    });
    const u = utilities(inst, [...W]);

    body.appendChild(drawProfile(inst, {
      W,
      tip,
      rightPad: 56,
      onCandidate: (c) => { W.has(c) ? W.delete(c) : W.add(c); render(); },
      voterNote: (i) => `u=${u[i]}`,
    }));

    const kNow = W.size;
    const rows = [
      ['voters  n', String(inst.n)],
      ['candidates  m', String(inst.m)],
      ['committee size  |W|', `${kNow}${kNow === inst.k ? '' : `  (k = ${inst.k})`}`],
      ['quota  q', `${frac(inst.q)}  = ${dec(inst.q, 3)}`],
      ['utilities  u_i(W)', u.join(', ')],
      ['PAV score', dec(pavScore(inst, [...W]), 4)],
    ];
    const tbl = h('table', { class: 'data' }, [
      h('tbody', {}, rows.map(([a, b]) => h('tr', {}, [
        h('td', { text: a }), h('td', { class: 'mono', text: b }),
      ]))),
    ]);
    body.appendChild(h('div', { class: 'tablewrap', style: 'margin-top:14px;max-width:420px' }, [tbl]));

    body.appendChild(legend([
      { label: 'in the committee W', fill: 'var(--teal-soft)', line: 'var(--teal-line)' },
      { label: 'not elected', fill: '#fff', line: 'var(--line-strong)' },
    ]));
    body.appendChild(h('p', { class: 'hint', text:
      'Click any candidate rectangle to add it to, or remove it from, the committee. '
      + 'A voter approves exactly the candidates whose rectangle sits above her column.' }));
  }

  render();
  host.appendChild(figure({
    id: 'fig-instance', num, controls, body,
    caption: 'An approval-based committee election. This is the instance of the paper’s Figure 2: '
      + 'v1 and v2 share c1 and c2 and each have one private candidate, while v3 and v4 jointly approve the block c5–c10. '
      + 'With k = 8 and the Hare quota, q = 4/8 = 1/2.',
  }));
}

/* =====================================================================
   Figure 2 — the core: build a blocking coalition by hand
   ===================================================================== */

export function mountCoreFigure(host, { num = 2 } = {}) {
  const inst = figure2Instance();
  const W = new Set([0, 1, 4, 5, 6, 7, 8, 9]);
  let S = new Set();
  let T = new Set();

  const body = h('div');
  const tip = tooltip(body);

  const controls = [
    h('div', { class: 'controls' }, [
      h('span', { class: 'ctl-label', text: 'Deviation' }),
      button('Show the paper’s witness', () => {
        S = new Set([0, 1]); T = new Set([0, 1, 2, 3]); render();
      }, { cls: 'accent' }),
      button('Search for one', () => {
        const v = findCoreViolation(inst, [...W]);
        if (v) { S = new Set(v.S); T = new Set(v.T); }
        render();
      }),
      button('Clear', () => { S = new Set(); T = new Set(); render(); }),
    ]),
  ];

  function render() {
    clear(body);
    const Sa = [...S].sort((a, b) => a - b);
    const Ta = [...T].sort((a, b) => a - b);
    const uW = utilities(inst, [...W]);
    const uT = utilities(inst, Ta);

    body.appendChild(drawProfile(inst, {
      W, coalition: Sa, proposal: Ta, tip, rightPad: 64,
      onCandidate: (c) => { T.has(c) ? T.delete(c) : T.add(c); render(); },
      onVoter: (i) => { S.has(i) ? S.delete(i) : S.add(i); render(); },
      voterNote: (i) => (S.has(i) ? `${uW[i]}→${uT[i]}` : null),
    }));

    // Verdict panel.
    const need = inst.q * Ta.length;
    const affordable = Sa.length >= need - 1e-9;
    const improvers = Sa.filter((i) => uT[i] >= uW[i] + 1);
    const allImprove = Sa.length > 0 && improvers.length === Sa.length;
    const isBlocking = Sa.length > 0 && Ta.length > 0 && affordable && allImprove;

    const line = (label, text, ok) => h('tr', {}, [
      h('td', { text: label }),
      h('td', { class: 'mono', text }),
      h('td', {}, [pill(ok ? 'yes' : 'no', ok ? 'pass' : 'fail')]),
    ]);

    const tbl = h('table', { class: 'data' }, [
      h('tbody', {}, [
        h('tr', {}, [h('td', { text: 'coalition  S' }),
          h('td', { class: 'mono', text: Sa.length ? `{${Sa.map((i) => inst.voters[i]).join(', ')}}` : '—' }),
          h('td', {})]),
        h('tr', {}, [h('td', { text: 'proposal  T' }),
          h('td', { class: 'mono', text: Ta.length ? `{${Ta.map((c) => inst.candidates[c]).join(', ')}}` : '—' }),
          h('td', {})]),
        line('affordable:  |S| ≥ q·|T|', `${Sa.length} ≥ ${dec(need, 2)}`, affordable),
        line('every member strictly gains', Sa.length ? `${improvers.length} of ${Sa.length}` : '—', allImprove),
      ]),
    ]);
    body.appendChild(h('div', { class: 'tablewrap', style: 'margin-top:14px;max-width:470px' }, [tbl]));

    body.appendChild(h('div', { style: 'margin-top:12px' }, [
      isBlocking
        ? pill('S blocks W — this committee is not in the core', 'fail')
        : pill(Sa.length === 0 || Ta.length === 0 ? 'pick a coalition and a proposal' : 'not a blocking coalition', 'neutral'),
    ]));

    body.appendChild(legend([
      { label: 'committee W', fill: 'var(--teal-soft)', line: 'var(--teal-line)' },
      { label: 'proposal T', fill: '#fff', line: 'var(--violet)' },
      { label: 'coalition S', fill: 'var(--pink-soft)', line: 'var(--pink-line)' },
    ]));
    body.appendChild(h('p', { class: 'hint', text:
      'Click voter names to put them in the coalition S; click candidates to put them in the proposal T. '
      + 'Numbers under a coalition member show her utility now → under T.' }));
  }

  render();
  host.appendChild(figure({
    id: 'fig-core', num, controls, body,
    caption: 'The core, by hand. The committee W = {c1, c2, c5…c10} maximises PAV, yet the two-voter '
      + 'coalition {v1, v2} can afford the four-candidate proposal {c1, c2, c3, c4} — since |S| = 2 = q·|T| — '
      + 'and both members go from utility 2 to utility 3. So W is not in the core.',
  }));
}

/* =====================================================================
   Figure 3 — core+: fractional deviations
   ===================================================================== */

export function mountCorePlusFigure(host, { num = 3 } = {}) {
  const inst = figure2Instance();
  const W = new Set([0, 1, 4, 5, 6, 7, 8, 9]);
  // The interesting sub-instance: v1, v2 and candidates c1..c4.
  const vs = [0, 1];
  const cs = [0, 1, 2, 3];

  let y = [1, 1];                 // participation of v1, v2
  let z = [1, 1, 1, 1];           // quantities of c1..c4

  const body = h('div');

  const yS = vs.map((i, t) => slider({
    label: `y(${inst.voters[i]})`, min: 0, max: 1, step: 0.05, value: y[t],
    onInput: (v) => { y[t] = v; render(); }, format: (v) => dec(v, 2),
  }));
  const zS = cs.map((c, t) => slider({
    label: `z(${inst.candidates[c]})`, min: 0, max: 1, step: 0.05, value: z[t],
    onInput: (v) => { z[t] = v; render(); }, format: (v) => dec(v, 2),
  }));

  const controls = [
    h('div', { class: 'controls' }, [h('span', { class: 'ctl-label', text: 'Voters' }), ...yS]),
    h('div', { class: 'controls' }, [h('span', { class: 'ctl-label', text: 'Candidates' }), ...zS]),
    h('div', { class: 'controls' }, [
      button('Integral deviation', () => { y = [1, 1]; z = [1, 1, 1, 1]; sync(); render(); }, { cls: 'accent' }),
      button('Halve everything', () => { y = [0.5, 0.5]; z = [0.5, 0.5, 0.5, 0.5]; sync(); render(); }),
      button('Only v1 deviates', () => { y = [1, 0]; z = [0.5, 0.5, 1, 0]; sync(); render(); }),
    ]),
  ];

  function sync() {
    yS.forEach((sl, t) => sl.setValue(y[t]));
    zS.forEach((sl, t) => sl.setValue(z[t]));
  }

  function render() {
    clear(body);

    // Constraint (2) for each voter:
    //   sum_{c in A_i \ W} z_c + sum_{c in A_i ∩ W} min(y_i, z_c)  >=  (u_i(W)+1) y_i
    const detail = vs.map((i, t) => {
      let lhs = 0;
      const parts = [];
      for (let s2 = 0; s2 < cs.length; s2++) {
        const c = cs[s2];
        if (!inst.sets[i].has(c)) continue;
        if (W.has(c)) { const v = Math.min(y[t], z[s2]); lhs += v; parts.push(`min(y,${dec(z[s2], 2)})=${dec(v, 2)}`); }
        else { lhs += z[s2]; parts.push(`z=${dec(z[s2], 2)}`); }
      }
      const uw = utility(inst, i, [...W]);
      const rhs = (uw + 1) * y[t];
      return { i, lhs, rhs, uw, ok: lhs >= rhs - 1e-9, parts };
    });

    const spend = y.reduce((a, b) => a + b, 0);
    const cost = inst.q * z.reduce((a, b) => a + b, 0);
    const affordable = spend >= cost - 1e-9;
    const allOk = detail.every((d) => d.ok);
    const nonzero = y.some((v) => v > 1e-9);
    const blocking = affordable && allOk && nonzero;

    // Bars: participation and quantities.
    const W_ = 560, rowH = 24;
    const svg = canvas(W_, (vs.length + cs.length) * rowH + 54);
    const x0 = 112, barW = 300;
    let yy = 10;

    svg.appendChild(s('text', { x: 0, y: yy + 10, class: 'lbl', 'font-weight': 600 }, 'participation  y'));
    yy += 20;
    vs.forEach((i, t) => {
      svg.appendChild(s('text', { x: 0, y: yy + 14, class: 'lbl-mono' }, inst.voters[i]));
      svg.appendChild(s('rect', { x: x0, y: yy + 4, width: barW, height: 12, fill: 'var(--surface-raised)' }));
      svg.appendChild(bar({ x: x0, y: yy + 4, w: barW * y[t], hgt: 12, fill: 'var(--pink)', stroke: 'var(--pink-line)', dir: 'right' }));
      svg.appendChild(s('text', { x: x0 + barW + 8, y: yy + 14, class: 'lbl-mono', fill: 'var(--muted)' }, dec(y[t], 2)));
      yy += rowH;
    });

    yy += 8;
    svg.appendChild(s('text', { x: 0, y: yy + 10, class: 'lbl', 'font-weight': 600 }, 'quantities  z'));
    yy += 20;
    cs.forEach((c, t) => {
      const isW = W.has(c);
      svg.appendChild(s('text', { x: 0, y: yy + 14, class: 'lbl-mono' },
        `${inst.candidates[c]}${isW ? '  (in W)' : ''}`));
      svg.appendChild(s('rect', { x: x0, y: yy + 4, width: barW, height: 12, fill: 'var(--surface-raised)' }));
      svg.appendChild(bar({ x: x0, y: yy + 4, w: barW * z[t], hgt: 12, fill: 'var(--violet)', stroke: 'var(--violet-line)', dir: 'right' }));
      svg.appendChild(s('text', { x: x0 + barW + 8, y: yy + 14, class: 'lbl-mono', fill: 'var(--muted)' }, dec(z[t], 2)));
      yy += rowH;
    });
    body.appendChild(svg);

    const tbl = h('table', { class: 'data' }, [
      h('thead', {}, [h('tr', {}, ['', 'left-hand side', 'needs ≥', ''].map((t2) => h('th', { text: t2 })))]),
      h('tbody', {}, [
        ...detail.map((d) => h('tr', {}, [
          h('td', { text: `${inst.voters[d.i]}  (u=${d.uw})` }),
          h('td', { class: 'mono', text: dec(d.lhs, 3) }),
          h('td', { class: 'mono', text: `${dec(d.rhs, 3)}` }),
          h('td', {}, [pill(d.ok ? 'ok' : 'fails', d.ok ? 'pass' : 'fail')]),
        ])),
        h('tr', {}, [
          h('td', { text: 'affordable:  Σy ≥ q·Σz' }),
          h('td', { class: 'mono', text: dec(spend, 3) }),
          h('td', { class: 'mono', text: dec(cost, 3) }),
          h('td', {}, [pill(affordable ? 'ok' : 'fails', affordable ? 'pass' : 'fail')]),
        ]),
      ]),
    ]);
    body.appendChild(h('div', { class: 'tablewrap', style: 'margin-top:14px;max-width:520px' }, [tbl]));

    body.appendChild(h('div', { style: 'margin-top:12px' }, [
      blocking
        ? pill('a fractional blocking coalition — W fails core+', 'fail')
        : pill('not a fractional blocking coalition', 'neutral'),
    ]));
    body.appendChild(h('p', { class: 'hint', text:
      'With all sliders at 1 this is the ordinary blocking coalition of Figure 2. Scaling everything '
      + 'down by the same factor keeps it blocking — the constraints are homogeneous — so core+ '
      + 'coalitions can always be taken inside the unit cube.' }));
  }

  render();
  host.appendChild(figure({
    id: 'fig-coreplus', num, controls, body,
    caption: 'Core+ allows fractional deviations. Voter i joins with weight y_i and the coalition buys '
      + 'quantity z_c of candidate c. A voter who joins only partly still draws utility from the winners '
      + 'she keeps, which is why the winners she approves contribute min(y_i, z_c) rather than z_c.',
  }));
}
