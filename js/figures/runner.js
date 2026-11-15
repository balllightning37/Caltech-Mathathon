/**
 * The interactive algorithm runner.
 *
 * Build an instance by dragging candidates onto voters, read off the dual
 * (payment) program it induces, then run the algorithm step by step and
 * watch a valid payment system being assembled — and with it, a committee
 * in the core.
 */

import {
  h, s, clear, canvas, figure, button, segmented, legend, pill,
  frac, dec, tooltip, hoverable, bar,
  threshold, CHART_TITLE_Y, CHART_TOP,
} from '../ui.js';
import { drawProfile } from '../ballot.js';
import { makeInstance, findCoreViolation, utilities } from '../election.js';
import {
  fastCore, preprocess, neighbourhoodSize, reserveBehind, verify,
} from '../core-algo.js';

const MAX_N = 10;
const MAX_M = 12;

const SPEEDS = [
  { value: 0,    label: 'step'   , title: 'advance only when you press Step' },
  { value: 1400, label: 'slow'   , title: '1.4 s per step' },
  { value: 600,  label: 'normal' , title: '0.6 s per step' },
  { value: 200,  label: 'fast'   , title: '0.2 s per step' },
  { value: -1,   label: 'instant', title: 'jump to the end' },
];

/* ======================================================================
   Step list: flatten a run into granular, displayable steps
   ====================================================================== */

export function buildSteps(inst, run) {
  const steps = [];
  const q = inst.q;

  const pre = preprocess(inst);
  steps.push({
    kind: 'setup',
    title: 'Set up',
    body: `n = ${inst.n} voters, m = ${inst.m} candidates, k = ${inst.k} seats, `
      + `Hare quota q = n/k = ${frac(q)}.`,
    committee: null,
    system: null,
  });

  steps.push({
    kind: 'preprocess',
    title: 'Degree preprocessing',
    body: pre.high.length <= inst.k
      ? `Only ${pre.high.length} candidate(s) are approved by at least q = ${frac(q)} voters, `
        + `and k = ${inst.k}. Every reserve is at most 1, so no other candidate can ever reach a `
        + 'quota of reserve. Electing all of them settles it with no LP at all.'
      : `${pre.high.length} candidates are approved by at least q = ${frac(q)} voters. `
        + 'Those with fewer can never gather a quota of reserve, so they are harmless losers and '
        + 'the search ignores them.',
    highlightCands: pre.high,
    committee: null,
    system: null,
  });

  if (run.shortcut) {
    steps.push({
      kind: 'done',
      title: 'Certificate by inspection',
      body: 'Give every voter a reserve of 1 and no payments. (P1) and (P2) hold trivially, (P4) '
        + 'holds because nobody pays anything, and (P3) holds because every loser is low-degree.',
      committee: run.committee,
      system: run.system,
      final: true,
    });
    return steps;
  }

  const start = run.rounds.length ? run.rounds[0].before : { committee: run.committee, system: run.system };
  steps.push({
    kind: 'start',
    title: 'Start anywhere',
    body: `Take the first k high-degree candidates as a starting committee, and give every voter a `
      + 'reserve of 1 with no payments. That is feasible for (P1), (P2) and (P4) — only (P3) can fail.',
    committee: start.committee,
    system: start.system,
  });

  run.rounds.forEach((R, idx) => {
    const n0 = idx + 1;
    const W = R.before.committee;

    steps.push({
      kind: 'scan',
      title: `Round ${n0} · scan for a (P3) violation`,
      body: `Add up the reserve behind each loser. A loser holding q = ${frac(q)} or more has a `
        + 'justified complaint: its supporters could fund it. Any such loser blocks the certificate.',
      committee: W,
      system: R.before.system,
      scan: true,
      violations: R.before.violations,
    });

    steps.push({
      kind: 'pick',
      title: `Round ${n0} · the violation picks the swap`,
      body: `${inst.candidates[R.added]} holds `
        + `${dec(reserveBehind(inst, R.before.system.r, R.added), 3)} ≥ q in reserve. The addition `
        + 'lemma says electing it is worth at least a whole quota of objective, so there is no need '
        + 'to try the other k(m−k) swaps.',
      committee: W,
      system: R.before.system,
      scan: true,
      violations: R.before.violations,
      picked: R.added,
    });

    steps.push({
      kind: 'add',
      title: `Round ${n0} · add it and re-solve the payments`,
      body: `On X = W ∪ {${inst.candidates[R.added]}} (now k+1 = ${R.X.length} members), solve the `
        + 'dual program: among payment systems meeting the carried objective target, take one of '
        + 'minimum total reserve. Supporters of the new candidate now have somewhere to spend.',
      committee: R.X,
      system: R.optimised.system,
      added: R.added,
    });

    R.dereserved.stages.forEach((st, j) => {
      steps.push({
        kind: 'dereserve',
        title: `Round ${n0} · de-reservation, stage ${j + 1}`,
        body: `Voters still holding reserve who approve an unsaturated winner pour it in at unit `
          + `rate, for θ = ${dec(st.theta, 4)}. This stage ends because ${st.cause}.`,
        committee: R.X,
        system: { r: st.reserves, p: st.payments, shape: R.optimised.system.shape },
        added: R.added,
        unsaturated: st.unsaturated,
      });
    });

    steps.push({
      kind: 'delete',
      title: `Round ${n0} · delete the cheapest member`,
      body: `Total payments are at most n = ${inst.n} across ${R.X.length} candidates, so the `
        + `smallest total is at most n/(k+1) = ${dec(inst.n / (inst.k + 1), 3)} — below the quota. `
        + `Here that is ${inst.candidates[R.d]} at ${dec(R.totals[R.d], 3)}. Each of its supporters `
        + 'renames her payment to it as her new reserve.',
      committee: R.X,
      system: { r: R.dereserved.r, p: R.dereserved.p, shape: R.optimised.system.shape },
      totals: R.totals,
      deleting: R.d,
    });

    steps.push({
      kind: 'after',
      title: `Round ${n0} · back to k seats`,
      body: `W is now {${R.committee.map((c) => inst.candidates[c]).join(', ')}}. The objective rose `
        + `by at least δ = q − n/(k+1) = ${dec(q - inst.n / (inst.k + 1), 4)}, so this cannot loop `
        + 'forever. Scan again.',
      committee: R.committee,
      system: R.system,
    });
  });

  const ok = run.failures.length === 0;
  steps.push({
    kind: 'done',
    title: ok ? 'No loser violates (P3) — certificate complete' : 'Stopped without a certificate',
    body: ok
      ? 'Every loser now holds strictly less than a quota in reserve, so the payment system in hand '
        + 'satisfies (P1)–(P4). By Theorem 3.2 the committee satisfies core+, and core+ implies the '
        + 'core. Nothing about the running time had to be trusted: the certificate is checkable.'
      : `The run ended with: ${run.failures.join('; ')}`,
    committee: run.committee,
    system: run.system,
    final: true,
  });

  return steps;
}

/* ======================================================================
   The figure
   ====================================================================== */

export function mountRunnerFigure(host) {
  let n = 4, m = 6, k = 3;
  let approvals = [[0, 1, 2], [0, 1, 3], [2, 3, 4], [1, 4, 5]];
  let armed = null;              // candidate selected by click (touch fallback)
  let speed = 600;
  let steps = null, cursor = 0, timer = null, run = null, inst = null;
  let showDual = true;

  const body = h('div');
  const tip = tooltip(body);

  /* --------------------------------------------------- instance plumbing */

  function normalise() {
    n = Math.max(1, Math.min(MAX_N, n));
    m = Math.max(2, Math.min(MAX_M, m));
    k = Math.max(1, Math.min(m - 1, k));
    while (approvals.length < n) approvals.push([]);
    approvals.length = n;
    approvals = approvals.map((a) => a.filter((c) => c < m));
  }

  function buildInstance() {
    normalise();
    return makeInstance({
      voters: Array.from({ length: n }, (_, i) => `v${i + 1}`),
      candidates: Array.from({ length: m }, (_, c) => `c${c + 1}`),
      approvals: approvals.map((a) => [...a].sort((x, y) => x - y)),
      k, quota: 'hare',
    });
  }

  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  function reset() {
    stop();
    steps = null; cursor = 0; run = null;
    render();
  }

  function compute() {
    stop();
    inst = buildInstance();
    run = fastCore(inst);
    steps = buildSteps(inst, run);
    cursor = 0;
    return steps;
  }

  function play() {
    if (!steps) compute();
    stop();
    if (speed === -1) { cursor = steps.length - 1; render(); return; }
    if (speed === 0) { render(); return; }
    timer = setInterval(() => {
      if (cursor >= steps.length - 1) { stop(); render(); return; }
      cursor++;
      render();
    }, speed);
    render();
  }

  /* ------------------------------------------------------- the controls */

  function sizeRow() {
    const num = (label, value, min, max, onChange) => {
      const out = h('span', { class: 'readout', text: String(value) });
      return h('span', { class: 'slider' }, [
        h('label', { text: label }),
        button('−', () => { onChange(value - 1); }, { title: `fewer ${label}` }),
        out,
        button('+', () => { onChange(value + 1); }, { title: `more ${label}` }),
      ]);
    };
    return h('div', { class: 'controls' }, [
      h('span', { class: 'ctl-label', text: 'Size' }),
      num('voters n', n, 1, MAX_N, (v) => { n = v; reset(); }),
      num('candidates m', m, 2, MAX_M, (v) => { m = v; reset(); }),
      num('seats k', k, 1, m - 1, (v) => { k = v; reset(); }),
    ]);
  }

  function presetRow() {
    const setA = (nn, mm, kk, A) => { n = nn; m = mm; k = kk; approvals = A.map((x) => x.slice()); reset(); };
    return h('div', { class: 'controls' }, [
      h('span', { class: 'ctl-label', text: 'Preset' }),
      button('overlapping', () => setA(4, 6, 3, [[0, 1, 2], [0, 1, 3], [2, 3, 4], [1, 4, 5]]), { cls: 'accent' }),
      button('two blocks', () => setA(4, 4, 2, [[2, 3], [2, 3], [0, 1], [0, 1]])),
      button('three blocks', () => setA(6, 6, 3, [[0, 1], [0, 1], [2, 3], [2, 3], [4, 5], [4, 5]])),
      button("paper's Figure 2", () => setA(4, 10, 8, [[0, 1, 2], [0, 1, 3], [4, 5, 6, 7, 8, 9], [4, 5, 6, 7, 8, 9]])),
      button('random', () => {
        approvals = Array.from({ length: n }, () => {
          const b = [];
          for (let c = 0; c < m; c++) if (Math.random() < 0.5) b.push(c);
          return b;
        });
        reset();
      }),
      button('clear', () => { approvals = Array.from({ length: n }, () => []); reset(); }),
    ]);
  }

  /* ------------------------------------------------- the ballot builder */

  function chip(c, { assigned = false, onClick = null, drag = false } = {}) {
    const el = h('span', {
      class: `chip${assigned ? ' chip-on' : ''}${armed === c ? ' chip-armed' : ''}`,
      // Not inst.candidates[c]: `inst` may be stale while the size changes.
      text: `c${c + 1}`,
      title: assigned ? 'click to remove' : 'drag onto a voter, or click then click a voter',
    });
    if (drag) {
      el.setAttribute('draggable', 'true');
      el.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', String(c));
        e.dataTransfer.effectAllowed = 'copy';
      });
    }
    if (onClick) el.addEventListener('click', onClick);
    return el;
  }

  function builder() {
    const wrap = h('div');
    wrap.appendChild(h('div', { class: 'panel-head', text: 'the approval profile — drag a candidate onto a voter' }));

    // Palette.
    const pal = h('div', { class: 'palette' });
    for (let c = 0; c < m; c++) {
      pal.appendChild(chip(c, {
        drag: true,
        onClick: () => { armed = armed === c ? null : c; render(); },
      }));
    }
    wrap.appendChild(pal);
    wrap.appendChild(h('p', { class: 'hint', style: 'margin:6px 0 10px', text:
      armed !== null
        ? `c${armed + 1} is selected — now click a voter row to add it (or click it again to cancel).`
        : 'Drag a chip onto a voter row. On a touch screen, tap a chip then tap a voter row. '
          + 'Click an assigned chip to remove it.' }));

    // Voter rows.
    const rows = h('div', { class: 'voterrows' });
    for (let i = 0; i < n; i++) {
      const row = h('div', { class: 'voterrow' });
      row.appendChild(h('span', { class: 'voterlabel', text: `v${i + 1}` }));
      const zone = h('div', { class: 'dropzone' });
      const mine = [...approvals[i]].sort((a, b) => a - b);
      if (mine.length === 0) {
        zone.appendChild(h('span', { class: 'empty', text: 'approves nothing — drop a candidate here' }));
      }
      for (const c of mine) {
        zone.appendChild(chip(c, {
          assigned: true,
          onClick: () => { approvals[i] = approvals[i].filter((x) => x !== c); reset(); },
        }));
      }
      zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('over'); });
      zone.addEventListener('dragleave', () => zone.classList.remove('over'));
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('over');
        const c = parseInt(e.dataTransfer.getData('text/plain'), 10);
        if (Number.isInteger(c) && c < m && !approvals[i].includes(c)) {
          approvals[i] = [...approvals[i], c];
          reset();
        }
      });
      zone.addEventListener('click', () => {
        if (armed === null) return;
        if (!approvals[i].includes(armed)) approvals[i] = [...approvals[i], armed];
        armed = null;
        reset();
      });
      row.appendChild(zone);
      rows.appendChild(row);
    }
    wrap.appendChild(rows);
    return wrap;
  }

  /* ------------------------------------------------- the dual programme */

  function dualPanel(committee) {
    const W = committee ? [...committee] : null;
    const panel = h('div', { class: 'panel' });
    panel.appendChild(h('div', { class: 'panel-head',
      text: W ? 'the dual programme for this committee' : 'the dual programme' }));

    panel.appendChild(h('p', { style: 'margin:0 0 10px;font-size:13.5px', html:
      'Core+ asks whether a <em>fractional blocking coalition</em> exists — a primal feasibility '
      + 'question in the participations y and quantities z. Its infeasibility is, by LP duality, '
      + 'the <em>existence</em> of a payment system. That dual is what the algorithm actually '
      + 'solves, and what you can check by hand:' }));

    if (!W) {
      panel.appendChild(h('p', { class: 'hint', text:
        'Press Run to fix a committee; the programme below is written out for it.' }));
      return panel;
    }

    const Wset = new Set(W);
    const nm = (c) => inst.candidates[c];
    const own = (i) => [...inst.sets[i]].filter((c) => Wset.has(c)).sort((a, b) => a - b);

    let nVars = inst.n, nCons = 0;
    for (let i = 0; i < inst.n; i++) nVars += own(i).length;
    nCons += inst.n;                                   // (P1)
    for (let i = 0; i < inst.n; i++) nCons += own(i).length;  // (P2)
    nCons += W.length;                                 // (P4)
    nCons += inst.m - W.length;                        // (P3)

    const lines = [];
    lines.push(['variables',
      `r₁…r_${inst.n} ≥ 0 and p_ic ≥ 0 for each approved winner — ${nVars} in all`]);
    lines.push(['(P1) budget', `r_i + Σ_{c ∈ A_i ∩ W} p_ic = 1   for each of the ${inst.n} voters`]);
    lines.push(['(P2) backing', `p_ic ≤ r_i   for each of the ${nVars - inst.n} payments`]);
    lines.push(['(P4) cap', `Σ_{i ∈ N_c} p_ic ≤ q = ${frac(inst.q)}   for each of the ${W.length} winners`]);
    lines.push(['(P3) no complaint',
      `Σ_{i ∈ N_c} r_i < q = ${frac(inst.q)}   for each of the ${inst.m - W.length} losers`]);

    panel.appendChild(h('div', { class: 'tablewrap' }, [
      h('table', { class: 'data' }, [
        h('tbody', {}, lines.map(([a, b]) => h('tr', {}, [
          h('td', { style: 'white-space:nowrap', text: a }),
          h('td', { class: 'mono', style: 'text-align:left;white-space:normal', text: b }),
        ]))),
      ]),
    ]));

    // Spell the (P3) rows out concretely: those are the ones that can fail.
    const losers = [];
    for (let c = 0; c < inst.m; c++) if (!Wset.has(c)) losers.push(c);
    if (losers.length) {
      panel.appendChild(h('p', { class: 'hint', style: 'margin-top:10px', text:
        'Written out, the (P3) rows are the only ones the algorithm has to fight for:' }));
      const txt = losers.map((c) => {
        const sup = inst.supporters[c];
        return sup.length
          ? `${nm(c)}:  ${sup.map((i) => `r(${inst.voters[i]})`).join(' + ')} < ${frac(inst.q)}`
          : `${nm(c)}:  0 < ${frac(inst.q)}   (nobody approves it)`;
      }).join('\n');
      panel.appendChild(h('pre', { class: 'dual', text: txt }));
    }

    panel.appendChild(h('div', { class: 'kv', style: 'margin-top:10px' }, [
      h('span', {}, [h('b', { text: 'variables: ' }), String(nVars)]),
      h('span', {}, [h('b', { text: 'constraints: ' }), String(nCons)]),
      h('span', {}, [h('b', { text: 'q: ' }), frac(inst.q)]),
      h('span', {}, [h('b', { text: 'δ = q − n/(k+1): ' }), dec(inst.q - inst.n / (inst.k + 1), 4)]),
    ]));
    return panel;
  }

  /* --------------------------------------------- the approval profile */

  /**
   * The profile, with the committee of the moment highlighted: teal for a
   * sitting winner, violet for the candidate just added, brick for the one
   * about to be deleted. On the preprocessing step the high-degree
   * candidates are outlined instead, since no committee exists yet.
   */
  function profileView(step) {
    const wrap = h('div', { style: 'margin-top:10px' });
    const committee = step.committee ? [...step.committee] : [];
    const Wset = new Set(committee);
    const u = utilities(inst, committee);
    const high = step.kind === 'preprocess' ? new Set(step.highlightCands || []) : null;

    wrap.appendChild(h('div', { class: 'panel-head', text:
      step.kind === 'preprocess'
        ? 'the approval profile — candidates with at least q supporters'
        : step.committee
          ? 'the approval profile — candidates currently in the committee'
          : 'the approval profile' }));

    wrap.appendChild(drawProfile(inst, {
      W: Wset,
      tip,
      rightPad: 64,
      tint: (c) => {
        if (step.deleting === c) return { fill: 'var(--brick-soft)', stroke: 'var(--brick-line)' };
        if (step.added === c || step.picked === c) {
          return { fill: 'var(--violet-soft)', stroke: 'var(--violet-line)' };
        }
        if (high && high.has(c)) return { fill: 'var(--amber-soft)', stroke: 'var(--amber-line)' };
        return null;
      },
      voterNote: (i) => (step.committee ? `u=${u[i]}` : null),
      annotate: (c) => {
        if (!step.system || Wset.has(c)) return null;
        return `r=${dec(reserveBehind(inst, step.system.r, c), 2)}`;
      },
    }));

    const key = [];
    if (step.committee) {
      key.push({ label: 'in the committee', fill: 'var(--teal-soft)', line: 'var(--teal-line)' });
    }
    if (step.picked !== undefined && step.picked !== null) {
      key.push({ label: 'violates (P3) — about to be added', fill: 'var(--violet-soft)', line: 'var(--violet-line)' });
    } else if (step.added !== undefined && step.added !== null) {
      key.push({ label: 'just added', fill: 'var(--violet-soft)', line: 'var(--violet-line)' });
    }
    if (step.deleting !== undefined && step.deleting !== null) {
      key.push({ label: 'about to be deleted', fill: 'var(--brick-soft)', line: 'var(--brick-line)' });
    }
    if (high) {
      key.push({ label: 'at least q supporters', fill: 'var(--amber-soft)', line: 'var(--amber-line)' });
    }
    if (key.length) wrap.appendChild(legend(key));
    return wrap;
  }

  /* ----------------------------------------- the payment system picture */

  function paymentView(step) {
    if (!step || !step.system || !step.committee) return null;
    const Wa = [...step.committee];
    const Wset = new Set(Wa);
    const sys = step.system;

    const rowH = 26, left = 40, barW = 300;
    const svg = canvas(560, inst.n * rowH + 34);
    svg.appendChild(s('text', { x: 0, y: 11, class: 'lbl', 'font-weight': 600 },
      'each voter’s unit budget: reserve + payments'));

    for (let i = 0; i < inst.n; i++) {
      const y = 22 + i * rowH;
      svg.appendChild(s('text', { x: 0, y: y + 13, class: 'lbl-mono' }, inst.voters[i]));
      svg.appendChild(s('rect', { x: left, y, width: barW, height: 16, fill: 'var(--surface-raised)' }));

      const segs = [{ c: null, v: sys.r[i] ?? 0 }];
      for (const c of Wa) {
        if (!inst.sets[i].has(c)) continue;
        segs.push({ c, v: (sys.p[i] && sys.p[i].get(c)) || 0 });
      }
      let acc = 0;
      for (const sg of segs) {
        const x = left + acc * barW;
        const w = sg.v * barW;
        acc += sg.v;
        if (w <= 0.4) continue;
        const isNew = sg.c !== null && sg.c === step.added;
        const isDel = sg.c !== null && sg.c === step.deleting;
        const fill = sg.c === null ? 'var(--amber)'
          : isDel ? 'var(--brick)' : isNew ? 'var(--violet)' : 'var(--teal)';
        const line = sg.c === null ? 'var(--amber-line)'
          : isDel ? 'var(--brick-line)' : isNew ? 'var(--violet-line)' : 'var(--teal-line)';
        const g = s('g');
        g.appendChild(s('rect', {
          x: x + 1, y, width: Math.max(w - 2, 0.6), height: 16, fill, stroke: line, 'stroke-width': 1,
        }));
        if (w > 26) {
          g.appendChild(s('text', {
            x: x + w / 2, y: y + 12, class: 'lbl-mono', 'text-anchor': 'middle',
            'font-size': 9.5, fill: '#fff',
          }, sg.c === null ? 'r' : inst.candidates[sg.c]));
        }
        hoverable(g, tip, `${inst.voters[i]} → ${sg.c === null ? 'reserve' : inst.candidates[sg.c]}`
          + `\n${frac(sg.v)} = ${dec(sg.v, 4)}`);
        svg.appendChild(g);
      }
      svg.appendChild(s('text', {
        x: left + barW + 8, y: y + 13, class: 'lbl-mono', 'font-size': 9.5, fill: 'var(--muted)',
      }, `r = ${dec(sys.r[i] ?? 0, 3)}`));
    }
    return svg;
  }

  /** Losers' reserve against the quota: the (P3) scan. */
  function scanView(step) {
    if (!step || !step.committee || !step.system) return null;
    const Wset = new Set(step.committee);
    const losers = [];
    for (let c = 0; c < inst.m; c++) {
      if (!Wset.has(c)) losers.push({ c, held: reserveBehind(inst, step.system.r, c) });
    }
    if (!losers.length) return null;
    const maxH = Math.max(inst.q * 1.5, ...losers.map((x) => x.held), 0.2);
    const svg = canvas(560, CHART_TOP + losers.length * 13 + 4);
    svg.appendChild(s('text', { x: 0, y: CHART_TITLE_Y, class: 'lbl', 'font-weight': 600 },
      '(P3): reserve held behind each loser'));
    const x0 = 40, bw = 400;
    losers.forEach((it, j) => {
      const y = CHART_TOP + 2 + j * 13;
      const bad = it.held >= inst.q - 1e-9;
      const picked = it.c === step.picked;
      const g = s('g');
      g.appendChild(s('text', { x: 0, y: y + 8, class: 'lbl-mono', 'font-size': 9.5 },
        inst.candidates[it.c]));
      g.appendChild(bar({
        x: x0, y, w: Math.max((it.held / maxH) * bw, 0), hgt: 9, dir: 'right',
        fill: picked ? 'var(--violet)' : bad ? 'var(--brick)' : 'var(--teal-soft)',
        stroke: picked ? 'var(--violet-line)' : bad ? 'var(--brick-line)' : 'var(--teal-line)',
      }));
      g.appendChild(s('text', {
        x: x0 + bw + 8, y: y + 8, class: 'lbl-mono', 'font-size': 9.5,
        fill: picked ? 'var(--violet-line)' : bad ? 'var(--bad)' : 'var(--muted)',
      }, dec(it.held, 3) + (picked ? '  ← add this one' : '')));
      svg.appendChild(g);
    });
    svg.appendChild(threshold({
      x: x0 + (inst.q / maxH) * bw,
      bottom: CHART_TOP + losers.length * 13,
      label: `q = ${frac(inst.q)}`,
      width: 560,
    }));
    return svg;
  }

  /* ---------------------------------------------------------- rendering */

  function render() {
    clear(body);
    // Must run before anything reads `approvals`: changing n or m leaves it
    // the wrong length until it is resized.
    normalise();

    body.appendChild(sizeRow());
    body.appendChild(presetRow());
    body.appendChild(builder());

    if (n < 1 || m < 2) {
      body.appendChild(h('p', { class: 'hint', text: 'Need at least one voter and two candidates.' }));
      return;
    }

    // Run controls.
    const runRow = h('div', { class: 'controls', style: 'margin-top:14px' }, [
      h('span', { class: 'ctl-label', text: 'Speed' }),
      segmented(SPEEDS, speed, (v) => { speed = v; if (timer) play(); else render(); }),
      button(timer ? 'Pause' : (steps && cursor > 0 ? 'Resume' : 'Run'), () => {
        if (timer) { stop(); render(); } else play();
      }, { cls: 'accent' }),
      button('Step', () => {
        if (!steps) compute();
        stop();
        if (cursor < steps.length - 1) cursor++;
        render();
      }),
      button('Back', () => { stop(); if (steps && cursor > 0) cursor--; render(); }),
      button('Reset', () => reset()),
      button(showDual ? 'Hide dual' : 'Show dual', () => { showDual = !showDual; render(); }),
    ]);
    body.appendChild(runRow);

    if (!steps) {
      inst = buildInstance();
      body.appendChild(h('p', { class: 'hint', text:
        `Ready: n = ${n}, m = ${m}, k = ${k}, Hare quota q = ${frac(inst.q)}. `
        + 'Press Run (or Step) to start. Changing the profile resets the run.' }));
      if (showDual) body.appendChild(dualPanel(null));
      return;
    }

    const step = steps[Math.max(0, Math.min(cursor, steps.length - 1))];

    // Progress.
    const prog = h('div', { class: 'steps', style: 'margin-top:12px' }, [
      h('span', { class: 'ctl-label', text: `step ${cursor + 1} / ${steps.length}` }),
    ]);
    const track = h('div', { class: 'track' });
    steps.forEach((st, j) => {
      const seg = h('span', {
        class: 'tick-seg' + (j <= cursor ? ' on' : '') + (j === cursor ? ' now' : ''),
        title: st.title,
      });
      seg.addEventListener('click', () => { stop(); cursor = j; render(); });
      track.appendChild(seg);
    });
    prog.appendChild(track);
    body.appendChild(prog);

    // The narration.
    const narr = h('div', { class: 'panel' }, [
      h('div', { class: 'panel-head', text: step.kind }),
      h('p', { style: 'margin:0 0 4px;font-size:15px;font-weight:500', text: step.title }),
      h('p', { style: 'margin:0;font-size:13.5px;line-height:1.6', text: step.body }),
    ]);
    body.appendChild(narr);

    if (step.committee) {
      body.appendChild(h('div', { class: 'kv', style: 'margin-top:10px' }, [
        h('span', {}, [h('b', { text: 'committee: ' }),
          `{${[...step.committee].map((c) => inst.candidates[c]).join(', ')}}`]),
        h('span', {}, [h('b', { text: 'size: ' }), String(step.committee.length)]),
      ]));
    }

    body.appendChild(profileView(step));

    const pv = paymentView(step);
    if (pv) body.appendChild(pv);

    if (step.system && step.committee) {
      const bad = verify(inst, step.committee, step.system);
      const by = (tag) => bad.some((x) => x.startsWith(`(${tag})`));
      // (P3) is meaningless mid-round, when the committee has k+1 members.
      const midRound = step.committee.length !== inst.k;
      body.appendChild(h('div', { class: 'controls', style: 'margin-top:10px' }, [
        pill('(P1)' + (by('P1') ? ' ✗' : ' ✓'), by('P1') ? 'fail' : 'pass'),
        pill('(P2)' + (by('P2') ? ' ✗' : ' ✓'), by('P2') ? 'fail' : 'pass'),
        pill('(P4)' + (by('P4') ? ' ✗' : ' ✓'), by('P4') ? 'fail' : 'pass'),
        midRound
          ? pill('(P3) n/a — k+1 seats', 'neutral')
          : pill('(P3)' + (by('P3') ? ' ✗' : ' ✓'), by('P3') ? 'fail' : 'pass'),
      ]));
    }

    const sv = (step.scan || step.kind === 'after' || step.kind === 'start') ? scanView(step) : null;
    if (sv) body.appendChild(sv);

    // Deletion totals.
    if (step.totals) {
      const Xs = [...step.committee];
      const tmax = Math.max(inst.q * 1.2, ...Xs.map((c) => step.totals[c]));
      const svg = canvas(560, 26 + Xs.length * 13);
      svg.appendChild(s('text', { x: 0, y: 11, class: 'lbl', 'font-weight': 600 },
        'total de-reserved payments per winner'));
      const x0 = 40, bw = 400;
      Xs.forEach((c, j) => {
        const y = 19 + j * 13;
        const chosen = c === step.deleting;
        const g = s('g');
        g.appendChild(s('text', { x: 0, y: y + 8, class: 'lbl-mono', 'font-size': 9.5 },
          inst.candidates[c]));
        g.appendChild(bar({
          x: x0, y, w: Math.max((step.totals[c] / tmax) * bw, 0), hgt: 9, dir: 'right',
          fill: chosen ? 'var(--brick)' : 'var(--teal-soft)',
          stroke: chosen ? 'var(--brick-line)' : 'var(--teal-line)',
        }));
        g.appendChild(s('text', {
          x: x0 + bw + 8, y: y + 8, class: 'lbl-mono', 'font-size': 9.5,
          fill: chosen ? 'var(--bad)' : 'var(--muted)',
        }, dec(step.totals[c], 3) + (chosen ? '  ← delete' : '')));
        svg.appendChild(g);
      });
      body.appendChild(svg);
    }

    // The pay-off: back to the core.
    if (step.final) {
      const ok = run.failures.length === 0;
      const viol = inst.m <= 18 ? findCoreViolation(inst, run.committee) : null;
      const panel = h('div', { class: 'panel' });
      panel.appendChild(h('div', { class: 'panel-head', text: 'from certificate back to the core' }));
      panel.appendChild(h('p', { style: 'margin:0 0 10px;font-size:13.5px;line-height:1.6', text:
        ok
          ? 'The payment system above is a certificate, so by Theorem 3.2 this committee satisfies '
            + 'core+ — and therefore the ordinary core. Independently of the algorithm, here is the '
            + 'brute-force check: every one of the 2^m − 1 possible proposals T, against the '
            + 'coalition of all voters who would strictly gain from it.'
          : 'This run did not produce a certificate, so nothing is claimed.' }));
      panel.appendChild(h('div', { class: 'controls' }, [
        pill(`W = {${run.committee.map((c) => inst.candidates[c]).join(', ')}}`, 'neutral'),
        ok ? pill('certificate verified', 'pass') : pill('no certificate', 'fail'),
        inst.m <= 18
          ? (viol === null ? pill('no blocking coalition exists — in the core', 'pass')
                           : pill(`blocked by {${viol.S.map((i) => inst.voters[i]).join(',')}}`, 'fail'))
          : pill('brute-force check skipped (m too large)', 'neutral'),
      ]));

      // The closest near-miss, to show what the certificate is ruling out.
      if (viol === null && inst.m <= 18) {
        let best = null;
        const lim = 1 << inst.m;
        for (let mask = 1; mask < lim; mask++) {
          const T = [];
          for (let c = 0; c < inst.m; c++) if (mask & (1 << c)) T.push(c);
          const uW = utilities(inst, run.committee);
          const S = [];
          for (let i = 0; i < inst.n; i++) if (utilities(inst, T)[i] >= uW[i] + 1) S.push(i);
          if (!S.length) continue;
          const need = inst.q * T.length;
          const slack = need - S.length;
          if (best === null || slack < best.slack) best = { T, S, need, slack };
        }
        if (best) {
          panel.appendChild(h('p', { class: 'hint', style: 'margin-top:10px', text:
            `Closest attempt: the coalition {${best.S.map((i) => inst.voters[i]).join(', ')}} would all `
            + `strictly gain from T = {${best.T.map((c) => inst.candidates[c]).join(', ')}}, but it needs `
            + `q·|T| = ${dec(best.need, 3)} voters and has only ${best.S.length}. Short by `
            + `${dec(best.slack, 3)}.` }));
        }
      }

      panel.appendChild(h('div', { class: 'kv', style: 'margin-top:10px' }, [
        h('span', {}, [h('b', { text: 'repair rounds: ' }), String(run.rounds.length)]),
        h('span', {}, [h('b', { text: 'dual solves: ' }), String(run.solves)]),
        h('span', {}, [h('b', { text: "paper's scan/round: " }), String(neighbourhoodSize(inst))]),
        h('span', {}, [h('b', { text: 'truncation L: ' }), run.L ? String(run.L) : '—']),
      ]));
      body.appendChild(panel);
    }

    if (showDual) body.appendChild(dualPanel(step.committee));

    body.appendChild(legend([
      { label: 'reserve', fill: 'var(--amber)', line: 'var(--amber-line)' },
      { label: 'payment', fill: 'var(--teal)', line: 'var(--teal-line)' },
      { label: 'just added', fill: 'var(--violet)', line: 'var(--violet-line)' },
      { label: 'being deleted', fill: 'var(--brick)', line: 'var(--brick-line)' },
    ]));
  }

  render();
  host.appendChild(figure({
    id: 'fig-runner', num: 4, controls: [], body,
    caption: 'The algorithm, end to end, on an instance you build. Drag candidates onto voters, read '
      + 'off the dual programme the profile induces, then run the repair loop at whatever pace you '
      + 'like and watch a valid payment system being assembled — which is exactly what certifies the '
      + 'final committee as core-stable.',
  }));
}
