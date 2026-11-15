/**
 * Figures for the algorithm tab: a step-through of the carried-target
 * repair loop, the de-reservation detail, and the cost comparison.
 */

import {
  h, s, clear, canvas, figure, button, segmented, legend, pill,
  frac, dec, tooltip, hoverable, bar,
  threshold, CHART_TITLE_Y, CHART_TOP,
} from '../ui.js';
import { drawProfile } from '../ballot.js';
import { makeInstance, figure2Instance, findCoreViolation, utilities } from '../election.js';
import {
  fastCore, verify, preprocess, truncationLevel, neighbourhoodSize,
  reserveBehind, collected,
} from '../core-algo.js';

const PLOT_W = 600;

/* ---------------------------------------------------------- instances */

const PRESETS = {
  'figure2': {
    label: 'Figure 2',
    build: () => figure2Instance(),
    note: 'The paper’s running example: k = 8, Hare quota q = 1/2.',
  },
  'blocks2': {
    label: 'Two blocks',
    build: () => mk([[2, 3], [2, 3], [0, 1], [0, 1]], 4, 2),
    note: 'Two equal blocks of voters with disjoint slates, competing for two seats.',
  },
  'blocks3': {
    label: 'Three blocks',
    build: () => mk([[0, 1], [0, 1], [2, 3], [2, 3], [4, 5], [4, 5]], 6, 3),
    note: 'Three equal blocks, three seats: proportionality demands one each.',
  },
  'overlap': {
    label: 'Overlapping',
    build: () => mk([[0, 1, 2], [0, 1, 3], [2, 3, 4], [1, 4, 5], [0, 5]], 6, 3),
    note: 'Overlapping approval sets, so no obvious block structure.',
  },
  'lowdeg': {
    label: 'Low degree',
    build: () => mk([[0], [1], [2], [3]], 5, 3),
    note: 'Every candidate is approved by one voter, so preprocessing settles it outright.',
  },
};

function mk(approvals, m, k) {
  return makeInstance({
    voters: approvals.map((_, i) => `v${i + 1}`),
    candidates: Array.from({ length: m }, (_, c) => `c${c + 1}`),
    approvals, k, quota: 'hare',
  });
}

const names = (inst, arr) => arr.map((c) => inst.candidates[c]).join(', ');

/* =====================================================================
   Figure A1 — step through the repair loop
   ===================================================================== */

export function mountAlgorithmFigure(host) {
  let presetKey = 'figure2';
  let inst = PRESETS[presetKey].build();
  let run = fastCore(inst);
  let step = 0;                 // 0 = start, 1..rounds = after that round

  const body = h('div');
  const tip = tooltip(body);

  const presetCtl = segmented(
    Object.entries(PRESETS).map(([k, v]) => ({ value: k, label: v.label, title: v.note })),
    presetKey,
    (v) => {
      presetKey = v;
      inst = PRESETS[v].build();
      run = fastCore(inst);
      step = 0;
      render();
    }
  );

  const controls = [
    h('div', { class: 'controls' }, [
      h('span', { class: 'ctl-label', text: 'Instance' }), presetCtl,
    ]),
  ];

  function render() {
    clear(body);

    const nRounds = run.rounds.length;
    step = Math.max(0, Math.min(step, nRounds));

    /* ---- step navigation ---- */
    const nav = h('div', { class: 'steps' }, [
      h('span', { class: 'ctl-label', text: 'Round' }),
      button('start', () => { step = 0; render(); }, { cls: step === 0 ? 'on' : '' }),
      ...run.rounds.map((_, j) =>
        button(String(j + 1), () => { step = j + 1; render(); },
          { cls: step === j + 1 ? 'on' : '', title: `after repair round ${j + 1}` })),
      button('◀', () => { step = Math.max(0, step - 1); render(); }),
      button('▶', () => { step = Math.min(nRounds, step + 1); render(); }),
    ]);
    body.appendChild(nav);

    body.appendChild(h('p', { class: 'hint', style: 'margin:0 0 10px',
      text: PRESETS[presetKey].note }));

    /* ---- the preprocessing shortcut ---- */
    if (run.shortcut) {
      const pre = preprocess(inst);
      body.appendChild(h('div', { class: 'panel' }, [
        h('div', { class: 'panel-head', text: 'preprocessing settled it' }),
        h('p', { style: 'margin:0 0 8px;font-size:14px', text:
          `Only ${pre.high.length} candidate${pre.high.length === 1 ? '' : 's'} `
          + `(${pre.high.length ? names(inst, pre.high) : 'none'}) `
          + `${pre.high.length === 1 ? 'is' : 'are'} approved by at least q = ${frac(inst.q)} voters, `
          + `and k = ${inst.k}. Every other candidate has fewer than q supporters, so even with `
          + 'every reserve at its maximum of 1 it cannot reach a quota. Electing all of them and '
          + 'filling the rest arbitrarily is certified immediately — no LP, no repair.' }),
      ]));
    }

    /* ---- the committee at this step ---- */
    const state = step === 0
      ? { committee: run.rounds.length ? run.rounds[0].before.committee : run.committee,
          system: run.rounds.length ? run.rounds[0].before.system : run.system }
      : { committee: run.rounds[step - 1].committee, system: run.rounds[step - 1].system };

    const Wset = new Set(state.committee);
    const u = utilities(inst, state.committee);

    body.appendChild(drawProfile(inst, {
      W: Wset, tip, rightPad: 60,
      voterNote: (i) => `u=${u[i]}`,
      annotate: (c) => (Wset.has(c) ? null : `r=${dec(reserveBehind(inst, state.system.r, c), 2)}`),
    }));

    /* ---- the (P3) scan: reserve behind each loser ---- */
    const losers = [];
    for (let c = 0; c < inst.m; c++) {
      if (!Wset.has(c)) losers.push({ c, held: reserveBehind(inst, state.system.r, c) });
    }
    if (losers.length) {
      const maxH = Math.max(inst.q * 1.6, ...losers.map((x) => x.held), 0.3);
      const svg = canvas(PLOT_W, CHART_TOP + losers.length * 14 + 4);
      svg.appendChild(s('text', { x: 0, y: CHART_TITLE_Y, class: 'lbl', 'font-weight': 600 },
        'step 2 — reserve held behind each loser   (a quota or more is a (P3) violation)'));
      const x0 = 40, bw = PLOT_W - 120;
      losers.forEach((it, j) => {
        const y = CHART_TOP + 2 + j * 14;
        const bad = it.held >= inst.q - 1e-9;
        const g = s('g');
        g.appendChild(s('text', { x: 0, y: y + 9, class: 'lbl-mono', 'font-size': 9.5 },
          inst.candidates[it.c]));
        g.appendChild(bar({
          x: x0, y, w: Math.max((it.held / maxH) * bw, 0), hgt: 10, dir: 'right',
          fill: bad ? 'var(--brick)' : 'var(--teal-soft)',
          stroke: bad ? 'var(--brick-line)' : 'var(--teal-line)',
        }));
        g.appendChild(s('text', {
          x: x0 + bw + 8, y: y + 9, class: 'lbl-mono', 'font-size': 9.5,
          fill: bad ? 'var(--bad)' : 'var(--muted)',
        }, dec(it.held, 3)));
        hoverable(g, tip, `${inst.candidates[it.c]}\nsupporters: `
          + `${inst.supporters[it.c].map((i) => inst.voters[i]).join(', ') || 'none'}\n`
          + `reserve behind it: ${dec(it.held, 4)}\nquota q = ${dec(inst.q, 4)}`);
        svg.appendChild(g);
      });
      svg.appendChild(threshold({
        x: x0 + (inst.q / maxH) * bw,
        bottom: CHART_TOP + losers.length * 14,
        label: `q = ${frac(inst.q)}`,
        width: PLOT_W,
      }));
      body.appendChild(svg);
    }

    /* ---- what this round did ---- */
    if (step > 0) {
      const R = run.rounds[step - 1];
      const panel = h('div', { class: 'panel' });
      panel.appendChild(h('div', { class: 'panel-head', text: `repair round ${step}` }));
      panel.appendChild(h('div', { class: 'kv' }, [
        h('span', {}, [h('b', { text: 'violator added: ' }), inst.candidates[R.added]]),
        h('span', {}, [h('b', { text: 'X = W ∪ {c}: ' }), `{${names(inst, R.X)}}`]),
        h('span', {}, [h('b', { text: 'deleted: ' }), inst.candidates[R.d]]),
        h('span', {}, [h('b', { text: 'new W: ' }), `{${names(inst, R.committee)}}`]),
      ]));

      // Candidate totals in the de-reserved system, with the deletion marked.
      const Xs = R.X;
      const tmax = Math.max(inst.q * 1.25, ...Xs.map((c) => R.totals[c]));
      const svg2 = canvas(PLOT_W, CHART_TOP + Xs.length * 14 + 4);
      svg2.appendChild(s('text', { x: 0, y: CHART_TITLE_Y, class: 'lbl', 'font-weight': 600 },
        'step 5 — total de-reserved payments; the smallest is deleted'));
      const x0 = 40, bw = PLOT_W - 130;
      Xs.forEach((c, j) => {
        const y = CHART_TOP + 2 + j * 14;
        const chosen = c === R.d;
        const g = s('g');
        g.appendChild(s('text', { x: 0, y: y + 9, class: 'lbl-mono', 'font-size': 9.5 },
          inst.candidates[c]));
        g.appendChild(bar({
          x: x0, y, w: Math.max((R.totals[c] / tmax) * bw, 0), hgt: 10, dir: 'right',
          fill: chosen ? 'var(--amber)' : 'var(--teal-soft)',
          stroke: chosen ? 'var(--amber-line)' : 'var(--teal-line)',
        }));
        g.appendChild(s('text', {
          x: x0 + bw + 8, y: y + 9, class: 'lbl-mono', 'font-size': 9.5,
          fill: chosen ? 'var(--amber-line)' : 'var(--muted)',
        }, dec(R.totals[c], 3) + (chosen ? '  ← delete' : '')));
        hoverable(g, tip, `${inst.candidates[c]}\ncollects ${dec(R.totals[c], 4)} after de-reservation`);
        svg2.appendChild(g);
      });
      const nx = x0 + (inst.n / (inst.k + 1) / tmax) * bw;
      if (nx < x0 + bw) {
        svg2.appendChild(threshold({
          x: nx,
          bottom: CHART_TOP + Xs.length * 14,
          label: `n/(k+1) = ${dec(inst.n / (inst.k + 1), 2)}`,
          width: PLOT_W,
        }));
      }
      panel.appendChild(svg2);
      panel.appendChild(h('p', { class: 'hint', text:
        'Total payments are at most n and X has k + 1 members, so the cheapest deletion costs at '
        + 'most n/(k+1) — which is below the quota, so that candidate is never saturated.' }));
      body.appendChild(panel);
    }

    /* ---- the verdict ---- */
    if (step === run.rounds.length) {
      const viol = inst.m <= 20 ? findCoreViolation(inst, run.committee) : null;
      const ok = run.failures.length === 0;
      const vpanel = h('div', { class: 'panel' });
      vpanel.appendChild(h('div', { class: 'panel-head', text: 'result' }));
      vpanel.appendChild(h('div', { class: 'controls', style: 'margin-bottom:8px' }, [
        pill(`W = {${names(inst, run.committee)}}`, 'neutral'),
        ok ? pill('certificate satisfies (P1)–(P4)', 'pass')
           : pill(`certificate FAILS: ${run.failures[0]}`, 'fail'),
        inst.m <= 20
          ? (viol === null
              ? pill('verified in the core by exhaustive search', 'pass')
              : pill(`blocked by {${viol.S.map((i) => inst.voters[i]).join(',')}}`, 'fail'))
          : pill('core check skipped (m too large)', 'neutral'),
      ]));
      vpanel.appendChild(h('div', { class: 'kv' }, [
        h('span', {}, [h('b', { text: 'repair rounds: ' }), String(run.rounds.length)]),
        h('span', {}, [h('b', { text: 'payment solves: ' }), String(run.solves)]),
        h('span', {}, [h('b', { text: 'paper scans/round: ' }), String(neighbourhoodSize(inst))]),
        h('span', {}, [h('b', { text: 'truncation L: ' }), run.L ? String(run.L) : '—']),
      ]));
      body.appendChild(vpanel);
    }

    body.appendChild(legend([
      { label: 'in the committee', fill: 'var(--teal-soft)', line: 'var(--teal-line)' },
      { label: '(P3) violation', fill: 'var(--brick)', line: 'var(--brick-line)' },
      { label: 'chosen for deletion', fill: 'var(--amber)', line: 'var(--amber-line)' },
    ]));
  }

  render();
  host.appendChild(figure({
    id: 'fig-algo', num: 1, controls, body,
    caption: 'The repair loop, running live. At each round the algorithm scans the losers for one '
      + 'holding a full quota in reserve, adds it, re-optimises the payments, de-reserves, and '
      + 'deletes the committee member collecting the least. It stops as soon as no loser violates '
      + '(P3) — at which point the payment system in hand is a certificate.',
  }));
}

/* =====================================================================
   Figure A2 — de-reservation, stage by stage
   ===================================================================== */

export function mountDereserveFigure(host) {
  let presetKey = 'blocks3';
  let inst = PRESETS[presetKey].build();
  let run = fastCore(inst);
  let roundIdx = 0;

  const body = h('div');
  const tip = tooltip(body);

  const presetCtl = segmented(
    ['blocks2', 'blocks3', 'overlap', 'figure2'].map((k) => ({
      value: k, label: PRESETS[k].label, title: PRESETS[k].note,
    })),
    presetKey,
    (v) => {
      presetKey = v; inst = PRESETS[v].build(); run = fastCore(inst); roundIdx = 0; render();
    }
  );

  const controls = [h('div', { class: 'controls' }, [
    h('span', { class: 'ctl-label', text: 'Instance' }), presetCtl,
  ])];

  function render() {
    clear(body);

    if (!run.rounds.length) {
      body.appendChild(h('p', { class: 'hint', text:
        'This instance never needs a repair round, so there is nothing to de-reserve. '
        + 'Pick another instance.' }));
      return;
    }

    roundIdx = Math.min(roundIdx, run.rounds.length - 1);
    const R = run.rounds[roundIdx];

    if (run.rounds.length > 1) {
      body.appendChild(h('div', { class: 'steps' }, [
        h('span', { class: 'ctl-label', text: 'Round' }),
        ...run.rounds.map((_, j) => button(String(j + 1),
          () => { roundIdx = j; render(); }, { cls: roundIdx === j ? 'on' : '' })),
      ]));
    }

    const stages = R.dereserved.stages;
    const Xs = R.X;

    body.appendChild(h('div', { class: 'kv', style: 'margin-bottom:10px' }, [
      h('span', {}, [h('b', { text: 'X: ' }), `{${names(inst, Xs)}}`]),
      h('span', {}, [h('b', { text: 'stages: ' }), String(stages.length)]),
    ]));

    // Reserve over the stages: one line per voter with reserve to spend.
    const W_ = PLOT_W, H_ = 190;
    const svg = canvas(W_, H_);
    const L = 44, T = 22, B = 34, Rr = 90;
    const pw = W_ - L - Rr, ph = H_ - T - B;
    const cols = stages.length + 1;

    svg.appendChild(s('text', { x: 0, y: 11, class: 'lbl', 'font-weight': 600 },
      'step 4 — each voter’s reserve draining into unsaturated winners'));

    const series = [];
    for (let i = 0; i < inst.n; i++) {
      const vals = [R.optimised.system.r[i], ...stages.map((st) => st.reserves[i])];
      if (vals.some((v) => v > 1e-9)) series.push({ i, vals });
    }
    const vmax = Math.max(1e-9, ...series.flatMap((x) => x.vals));
    const sx = (j) => L + (cols === 1 ? 0 : (pw * j) / (cols - 1));
    const sy = (v) => T + ph - (v / vmax) * ph;

    for (let g = 0; g <= 3; g++) {
      const v = (vmax * g) / 3;
      svg.appendChild(s('line', { x1: L, y1: sy(v), x2: L + pw, y2: sy(v), stroke: 'var(--line)' }));
      svg.appendChild(s('text', { x: L - 7, y: sy(v) + 3, class: 'tick', 'text-anchor': 'end' },
        dec(v, 2)));
    }
    svg.appendChild(s('line', { x1: L, y1: T + ph, x2: L + pw, y2: T + ph, stroke: 'var(--fg)' }));
    for (let j = 0; j < cols; j++) {
      svg.appendChild(s('text', {
        x: sx(j), y: T + ph + 14, class: 'tick', 'text-anchor': 'middle',
      }, j === 0 ? 'start' : String(j)));
    }
    svg.appendChild(s('text', {
      x: L + pw / 2, y: H_ - 6, class: 'lbl', 'text-anchor': 'middle', 'font-size': 10,
    }, 'stage'));

    const HUES = ['var(--teal)', 'var(--amber)', 'var(--violet)', 'var(--pink)', 'var(--brick)'];
    const usedLabelY = [];
    series.forEach((ser, t) => {
      const colour = HUES[t % HUES.length];
      const pts = ser.vals.map((v, j) => `${sx(j)},${sy(v)}`).join(' ');
      svg.appendChild(s('polyline', {
        points: pts, fill: 'none', stroke: colour, 'stroke-width': 2,
      }));
      ser.vals.forEach((v, j) => {
        const dot = s('circle', { cx: sx(j), cy: sy(v), r: 3.2, fill: colour, stroke: '#fff', 'stroke-width': 1.5 });
        hoverable(dot, tip, `${inst.voters[ser.i]}\nstage ${j}: reserve ${dec(v, 4)}`);
        svg.appendChild(dot);
      });
      // Several voters often end on the same reserve, so nudge labels that
      // would land on the same baseline.
      const endY = sy(ser.vals[ser.vals.length - 1]);
      let labelY = endY + 3;
      while (usedLabelY.some((u) => Math.abs(u - labelY) < 10)) labelY += 10;
      usedLabelY.push(labelY);
      svg.appendChild(s('text', {
        x: L + pw + 8, y: labelY,
        class: 'lbl-mono', 'font-size': 9.5, fill: colour,
      }, inst.voters[ser.i]));
    });
    body.appendChild(svg);

    // What ended each stage.
    if (stages.length) {
      body.appendChild(h('div', { class: 'tablewrap', style: 'margin-top:10px' }, [
        h('table', { class: 'data' }, [
          h('thead', {}, [h('tr', {}, ['stage', 'duration θ', 'ended because', 'still unsaturated']
            .map((x) => h('th', { text: x })))]),
          h('tbody', {}, stages.map((st, j) => h('tr', {}, [
            h('td', { text: String(j + 1) }),
            h('td', { class: 'mono', text: dec(st.theta, 4) }),
            h('td', { style: 'text-align:left;white-space:normal', text: st.cause || '—' }),
            h('td', { class: 'mono', style: 'text-align:left',
              text: st.unsaturated.length ? names(inst, st.unsaturated) : 'none' }),
          ]))),
        ]),
      ]));
    }

    body.appendChild(h('p', { class: 'hint', text:
      'Afterwards, any voter still holding reserve approves only saturated winners. That is what '
      + 'makes the deletion bound work: the payments have been pushed as high as the cap q allows, '
      + 'so the cheapest candidate really is cheap. For a supporter of the deleted candidate, her '
      + 'payment to it becomes her new reserve — legal because de-reservation keeps that payment '
      + 'her largest.' }));
  }

  render();
  host.appendChild(figure({
    id: 'fig-dereserve', num: 2, controls, body,
    caption: 'De-reservation. Voters with unspent reserve who approve a winner that has not yet hit '
      + 'the cap q pour the reserve in at unit rate. Each stage ends when a reserve empties or a '
      + 'winner saturates, so there are at most n + |X| stages.',
  }));
}

/* =====================================================================
   Figure A3 — what the speedup is
   ===================================================================== */

export function mountCostFigure(host) {
  const body = h('div');
  const tip = tooltip(body);

  // Measured with tests/bench_core_algorithm.py on the exact implementation.
  const LROWS = [
    { k: 2,  fast: 5,  paper: 24 },
    { k: 3,  fast: 9,  paper: 72 },
    { k: 4,  fast: 13, paper: 160 },
    { k: 6,  fast: 23, paper: 504 },
    { k: 8,  fast: 34, paper: 1152 },
    { k: 12, fast: 62, paper: 3744 },
  ];

  function render() {
    clear(body);

    const W_ = PLOT_W, H_ = 250;
    const svg = canvas(W_, H_);
    const L = 52, T = 26, B = 46, Rr = 20;
    const pw = W_ - L - Rr, ph = H_ - T - B;
    const vmax = Math.max(...LROWS.map((r) => r.paper)) * 1.08;

    svg.appendChild(s('text', { x: 0, y: 11, class: 'lbl', 'font-weight': 600 },
      'truncation level L needed, at the Hare quota (n = 12, m = 2k)'));

    const groupW = pw / LROWS.length;
    const bw = Math.min(26, groupW / 3);
    const sy = (v) => T + ph - (v / vmax) * ph;

    for (let g = 0; g <= 4; g++) {
      const v = (vmax * g) / 4;
      svg.appendChild(s('line', { x1: L, y1: sy(v), x2: L + pw, y2: sy(v), stroke: 'var(--line)' }));
      svg.appendChild(s('text', { x: L - 7, y: sy(v) + 3, class: 'tick', 'text-anchor': 'end' },
        String(Math.round(v))));
    }
    svg.appendChild(s('line', { x1: L, y1: T + ph, x2: L + pw, y2: T + ph, stroke: 'var(--fg)' }));

    LROWS.forEach((row, j) => {
      const cx = L + groupW * (j + 0.5);
      [['paper', row.paper, 'var(--brick)', 'var(--brick-line)', -bw * 0.55],
       ['fast', row.fast, 'var(--teal)', 'var(--teal-line)', bw * 0.55]].forEach(
        ([name, v, fill, stroke, off]) => {
          const hh = (v / vmax) * ph;
          const g = s('g');
          g.appendChild(bar({
            x: cx + off - bw / 2 + 1, y: sy(v), w: bw - 2, hgt: hh, fill, stroke,
          }));
          hoverable(g, tip, `k = ${row.k}\n${name === 'fast' ? 'carried-target' : 'paper'}: L = ${v}`);
          svg.appendChild(g);
        });
      svg.appendChild(s('text', {
        x: cx, y: T + ph + 14, class: 'tick', 'text-anchor': 'middle',
      }, `k=${row.k}`));
    });
    svg.appendChild(s('text', {
      x: L + pw / 2, y: H_ - 8, class: 'lbl', 'text-anchor': 'middle', 'font-size': 10,
    }, 'committee size k'));
    body.appendChild(svg);

    body.appendChild(legend([
      { label: 'paper:  L = Θ(k³)', fill: 'var(--brick)', line: 'var(--brick-line)' },
      { label: 'carried target:  L = Θ(k^{3/2})', fill: 'var(--teal)', line: 'var(--teal-line)' },
    ]));

    body.appendChild(h('div', { class: 'tablewrap', style: 'margin-top:14px' }, [
      h('table', { class: 'data' }, [
        h('thead', {}, [h('tr', {}, ['', 'LPs per repair round', 'truncation L', 'LP size']
          .map((x) => h('th', { text: x })))]),
        h('tbody', {}, [
          h('tr', {}, [
            h('td', { text: 'paper (Algorithm 1)' }),
            h('td', { class: 'mono', text: 'k(m−k) + 1' }),
            h('td', { class: 'mono', text: 'Θ(k³)' }),
            h('td', { class: 'mono', text: 'O(nk⁴)' }),
          ]),
          h('tr', {}, [
            h('td', { text: 'earlier fast version' }),
            h('td', { class: 'mono', text: '1' }),
            h('td', { class: 'mono', text: 'Θ(k²)' }),
            h('td', { class: 'mono', text: 'O(nk³)' }),
          ]),
          h('tr', { class: 'highlight' }, [
            h('td', { text: 'carried target (this one)' }),
            h('td', { class: 'mono', text: '1' }),
            h('td', { class: 'mono', text: 'Θ(k^{3/2})' }),
            h('td', { class: 'mono', text: 'O(nk^{5/2})' }),
          ]),
        ]),
      ]),
    ]));

    body.appendChild(h('p', { class: 'hint', text:
      'Two independent savings. Letting the (P3) violation pick the swap removes the factor '
      + 'k(m−k) of neighbours. Correcting the truncation error by a constant that depends only on '
      + 'the committee shrinks the number of water levels each LP has to carry.' }));
  }

  render();
  host.appendChild(figure({
    id: 'fig-cost', num: 3, controls: [], body,
    caption: 'Where the time goes. Levels measured with the exact implementation; the LP-size column '
      + 'is the asymptotic count of variables each solve carries.',
  }));
}
