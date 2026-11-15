/**
 * Figures for Section 5: the Robin Hood operator and harmonic entropy.
 */

import { h, s, clear, canvas, figure, button, slider, segmented, legend, pill, frac, dec, tooltip, hoverable, bar } from '../ui.js';
import { H, waterLevel, robinHood, harmonicEntropy, harmonicEntropySeries, isUniform } from '../math-core.js';

/* =====================================================================
   Figure 6 — the Robin Hood operator
   ===================================================================== */

export function mountRobinHoodFigure(host, { num = 6 } = {}) {
  const START = [1 / 2, 1 / 3, 1 / 6];
  let x = START.slice();
  let history = [START.slice()];
  let ell = 1;

  const body = h('div');
  const tip = tooltip(body);

  const presets = {
    'paper (1/2, 1/3, 1/6)': [1 / 2, 1 / 3, 1 / 6],
    'very skewed (0.8, 0.1, 0.1)': [0.8, 0.1, 0.1],
    'two blocks (0.45, 0.45, 0.1)': [0.45, 0.45, 0.1],
    'already uniform': [1 / 4, 1 / 4, 1 / 4, 1 / 4],
  };

  const stepBtn = button('Apply ρ', () => {
    const { next } = robinHood(x, ell);
    x = next; history.push(x.slice()); render();
  }, { cls: 'accent' });

  const runBtn = button('Run to uniform', () => {
    let guard = 0;
    while (!isUniform(x) && guard++ < 60) { x = robinHood(x, ell).next; history.push(x.slice()); }
    render();
  });

  const backBtn = button('Undo', () => {
    if (history.length > 1) { history.pop(); x = history[history.length - 1].slice(); render(); }
  });

  const ellCtl = segmented(
    [1, 2, 3].map((v) => ({ value: v, label: `ℓ = ${v}`, title: `add ${v} coordinate(s) per step` })),
    1, (v) => { ell = v; render(); }
  );

  const presetCtl = h('span', { class: 'seg' },
    Object.entries(presets).map(([label, v]) =>
      button(label.split(' ')[0] === 'paper' ? 'paper' : label.split(' ')[0], () => {
        x = v.slice(); history = [v.slice()]; render();
      }, { title: label })
    )
  );

  const controls = [
    h('div', { class: 'controls' }, [
      h('span', { class: 'ctl-label', text: 'Step' }), stepBtn, backBtn, runBtn,
      h('span', { class: 'ctl-label', text: 'Batch' }), ellCtl,
    ]),
    h('div', { class: 'controls' }, [
      h('span', { class: 'ctl-label', text: 'Start from' }), presetCtl,
      button('Randomise', () => {
        const d = 3 + Math.floor(Math.random() * 3);
        let v = Array.from({ length: d }, () => 0.1 + Math.random());
        const sum = v.reduce((a, b) => a + b, 0);
        v = v.map((z) => z / sum).sort((a, b) => b - a);
        x = v; history = [v.slice()]; render();
      }),
    ]),
  ];

  function render() {
    clear(body);
    const uniform = isUniform(x);
    const { t } = uniform ? { t: waterLevel(x, ell).t } : robinHood(x, ell);
    const maxShown = Math.max(...history[0], ...x);

    /* ---- the bar picture ---- */
    const W = 620, hgt = 230;
    const plotH = 150, baseY = 180, x0 = 44;
    const svg = canvas(W, hgt);

    const n = x.length + (uniform ? 0 : ell);
    const slot = Math.min(46, (W - x0 - 20) / Math.max(n, 1));
    const bw = Math.min(30, slot - 8);
    const scale = plotH / (maxShown * 1.12);

    // y axis
    svg.appendChild(s('line', { x1: x0 - 10, y1: baseY - plotH, x2: x0 - 10, y2: baseY, stroke: 'var(--line-strong)' }));
    for (let g = 0; g <= 4; g++) {
      const v = (maxShown * 1.12 * g) / 4;
      const yy = baseY - v * scale;
      svg.appendChild(s('line', { x1: x0 - 10, y1: yy, x2: W - 16, y2: yy, stroke: 'var(--line)', 'stroke-width': 1 }));
      svg.appendChild(s('text', { x: x0 - 14, y: yy + 3, class: 'tick', 'text-anchor': 'end' }, dec(v, 2)));
    }
    svg.appendChild(s('line', { x1: x0 - 10, y1: baseY, x2: W - 16, y2: baseY, stroke: 'var(--fg)' }));

    // existing coordinates
    x.forEach((v, j) => {
      const bx = x0 + j * slot + (slot - bw) / 2;
      const above = Math.max(v - t, 0);
      const keep = Math.min(v, t);
      const g = s('g');
      // the part that stays
      g.appendChild(bar({
        x: bx, y: baseY - keep * scale, w: bw, hgt: keep * scale,
        fill: 'var(--teal-soft)', stroke: 'var(--teal-line)',
      }));
      // the part that will be redistributed, drawn transparent as in Figure 3
      if (above > 1e-9 && !uniform) {
        g.appendChild(s('rect', {
          x: bx, y: baseY - v * scale, width: bw, height: above * scale,
          fill: 'var(--teal)', 'fill-opacity': 0.18,
          stroke: 'var(--teal-line)', 'stroke-width': 1, 'stroke-dasharray': '3 2',
        }));
      }
      // With many coordinates the slots get too narrow for a value label.
      if (slot >= 30) {
        g.appendChild(s('text', {
          x: bx + bw / 2, y: baseY - v * scale - 6, class: 'lbl-mono',
          'text-anchor': 'middle', 'font-size': 9.5, fill: 'var(--muted-strong)',
        }, frac(v)));
      }
      g.appendChild(s('text', {
        x: bx + bw / 2, y: baseY + 13, class: 'tick', 'text-anchor': 'middle',
      }, String(j + 1)));
      hoverable(g, tip, `coordinate ${j + 1}\nvalue ${frac(v)} = ${dec(v, 4)}\n`
        + (above > 1e-9 && !uniform ? `gives up ${dec(above, 4)}` : 'keeps its value'));
      svg.appendChild(g);
    });

    // the incoming coordinates
    if (!uniform) {
      for (let a = 0; a < ell; a++) {
        const j = x.length + a;
        const bx = x0 + j * slot + (slot - bw) / 2;
        const g = s('g');
        g.appendChild(bar({
          x: bx, y: baseY - t * scale, w: bw, hgt: t * scale,
          fill: 'var(--amber-soft)', stroke: 'var(--amber-line)',
        }));
        if (slot >= 30) {
          g.appendChild(s('text', {
            x: bx + bw / 2, y: baseY - t * scale - 6, class: 'lbl-mono',
            'text-anchor': 'middle', 'font-size': 9.5, fill: 'var(--amber-line)',
          }, frac(t)));
        }
        g.appendChild(s('text', {
          x: bx + bw / 2, y: baseY + 13, class: 'tick', 'text-anchor': 'middle',
          fill: 'var(--amber-line)',
        }, 'new'));
        hoverable(g, tip, `new coordinate\nreceives the water level t = ${frac(t)}`);
        svg.appendChild(g);
      }
      // water level
      const ty = baseY - t * scale;
      svg.appendChild(s('line', {
        x1: x0 - 10, y1: ty, x2: W - 16, y2: ty,
        stroke: 'var(--amber-line)', 'stroke-width': 1.5, 'stroke-dasharray': '5 3',
      }));
      svg.appendChild(s('text', {
        x: W - 14, y: ty - 5, class: 'lbl-mono', 'text-anchor': 'end',
        fill: 'var(--amber-line)',
      }, `t = ${frac(t)}`));
    }

    svg.appendChild(s('text', { x: 0, y: 11, class: 'lbl', 'font-weight': 600 },
      uniform ? 'uniform — ρ now just adds another equal coordinate'
              : `ρ lowers everything above t to t, and hands the freed mass to ${ell} new coordinate${ell > 1 ? 's' : ''}`));
    body.appendChild(svg);

    /* ---- running tallies ---- */
    const massAbove = x.reduce((a, v) => a + Math.max(v - t, 0), 0);
    body.appendChild(h('div', { class: 'controls', style: 'margin-top:4px' }, [
      pill(`step ${history.length - 1}`, 'neutral'),
      pill(`d = ${x.length}`, 'neutral'),
      pill(`Σ x = ${dec(x.reduce((a, b) => a + b, 0), 4)}`, 'neutral'),
      uniform ? pill('uniform', 'pass') : pill(`ℓ·t = ${dec(ell * t, 4)} = Σ(x−t)⁺ = ${dec(massAbove, 4)}`, 'pass'),
      pill(`F(x) = ${dec(harmonicEntropy(x).value, 4)}`, 'neutral'),
    ]));

    /* ---- the trail of distributions ---- */
    if (history.length > 1) {
      body.appendChild(h('div', { class: 'tablewrap', style: 'margin-top:12px' }, [
        h('table', { class: 'data' }, [
          h('thead', {}, [h('tr', {}, ['', 'distribution', 'max', 'F'].map((tt) => h('th', { text: tt })))]),
          h('tbody', {}, history.map((hx, j) => h('tr', { class: j === history.length - 1 ? 'highlight' : '' }, [
            h('td', { text: j === 0 ? 'x' : `ρ${j > 1 ? `^${j}` : ''}(x)` }),
            h('td', { class: 'mono', style: 'text-align:left', text: `(${hx.map((v) => frac(v)).join(', ')})` }),
            h('td', { class: 'mono', text: frac(Math.max(...hx)) }),
            h('td', { class: 'mono', text: dec(harmonicEntropy(hx).value, 4) }),
          ]))),
        ]),
      ]));
    }

    body.appendChild(legend([
      { label: 'mass that stays', fill: 'var(--teal-soft)', line: 'var(--teal-line)' },
      { label: 'mass being redistributed', fill: 'rgba(13,148,136,.18)', line: 'var(--teal-line)' },
      { label: 'newly added coordinate', fill: 'var(--amber-soft)', line: 'var(--amber-line)' },
    ]));
    body.appendChild(h('p', { class: 'hint', text:
      'The water level t is the unique height at which the mass taken from the tall coordinates, Σ(x_j − t)⁺, '
      + 'exactly fills the ℓ new ones, ℓ·t. Keep pressing and any strictly positive distribution becomes uniform '
      + 'after finitely many steps — which is what makes the recursive definition of F well-founded.' }));
  }

  render();
  host.appendChild(figure({
    id: 'fig-robinhood', num, controls, body,
    caption: 'The Robin Hood operator, reproducing the paper’s Figure 3. Starting from (1/2, 1/3, 1/6) the '
      + 'water levels are 5/18, 5/24 and 1/6, after which the distribution is uniform on six coordinates. '
      + 'No existing coordinate ever rises, and the total mass never changes.',
  }));
}

/* =====================================================================
   Figure 7 — harmonic entropy: the recursion, and its level sets
   ===================================================================== */

const RAMP = ['#e6f5f3', '#c3e9e4', '#9bdbd3', '#6fcac0', '#45b3a7', '#2b968b', '#1b776e', '#0f5751'];

export function mountEntropyFigure(host, { num = 7 } = {}) {
  // A point on the 2-simplex, draggable in the triangle.
  let pt = [1 / 2, 1 / 3, 1 / 6];

  const body = h('div');
  const tip = tooltip(body);

  const controls = [
    h('div', { class: 'controls' }, [
      h('span', { class: 'ctl-label', text: 'Point' }),
      button('(1/2, 1/3, 1/6)', () => { pt = [1 / 2, 1 / 3, 1 / 6]; render(); }, { cls: 'accent' }),
      button('centre (1/3,1/3,1/3)', () => { pt = [1 / 3, 1 / 3, 1 / 3]; render(); }),
      button('edge (1/2,1/2,0)', () => { pt = [1 / 2, 1 / 2, 1e-9]; render(); }),
      button('corner (1,0,0)', () => { pt = [1 - 2e-9, 1e-9, 1e-9]; render(); }),
    ]),
  ];

  function render() {
    clear(body);

    const row = h('div', { style: 'display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start' });

    /* ---- left: the level-set triangle (the paper's Figure 4) ---- */
    const TS = 280, pad = 26;
    const triWrap = h('div', { style: `width:${TS + 60}px;max-width:100%` });
    const cvs = h('canvas', { width: TS * 2, height: Math.round(TS * 0.9) * 2, style: `width:${TS}px;height:${Math.round(TS * 0.9)}px;display:block` });

    // Triangle vertices in canvas space: (1,0,0) bottom-left, (0,1,0) bottom-right, (0,0,1) top.
    const Hh = Math.round(TS * 0.9);
    const A = [pad, Hh - pad], B = [TS - pad, Hh - pad], C = [TS / 2, pad];
    const toXY = (x) => [
      x[0] * A[0] + x[1] * B[0] + x[2] * C[0],
      x[0] * A[1] + x[1] * B[1] + x[2] * C[1],
    ];
    // Inverse: barycentric coordinates of a canvas point.
    const toBary = (px, py) => {
      const d = (B[1] - C[1]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[1] - C[1]);
      const l1 = ((B[1] - C[1]) * (px - C[0]) + (C[0] - B[0]) * (py - C[1])) / d;
      const l2 = ((C[1] - A[1]) * (px - C[0]) + (A[0] - C[0]) * (py - C[1])) / d;
      return [l1, l2, 1 - l1 - l2];
    };

    const ctx = cvs.getContext('2d');
    ctx.scale(2, 2);
    ctx.clearRect(0, 0, TS, Hh);
    const FMAX = 1.5;
    for (let py = 0; py < Hh; py++) {
      for (let px = 0; px < TS; px++) {
        const b = toBary(px + 0.5, py + 0.5);
        if (b[0] < 0 || b[1] < 0 || b[2] < 0) continue;
        const f = harmonicEntropy(b.map((v) => Math.max(v, 0))).value;
        const band = Math.min(RAMP.length - 1, Math.max(0, Math.floor((f / FMAX) * RAMP.length)));
        ctx.fillStyle = RAMP[band];
        ctx.fillRect(px, py, 1, 1);
      }
    }
    // Triangle outline + the marked point.
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(C[0], C[1]); ctx.closePath(); ctx.stroke();
    const P = toXY(pt);
    ctx.beginPath(); ctx.arc(P[0], P[1], 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#cf8f3a'; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = '#a16207'; ctx.lineWidth = 1; ctx.stroke();
    ctx.font = '9px ui-monospace, Menlo, monospace';
    ctx.fillStyle = '#525252';
    ctx.textAlign = 'center';
    ctx.fillText('(1,0,0)', A[0] + 6, A[1] + 12);
    ctx.fillText('(0,1,0)', B[0] - 6, B[1] + 12);
    ctx.fillText('(0,0,1)', C[0], C[1] - 7);

    const pick = (ev) => {
      const r = cvs.getBoundingClientRect();
      const b = toBary(((ev.clientX - r.left) / r.width) * TS, ((ev.clientY - r.top) / r.height) * Hh);
      if (b.some((v) => v < -0.02)) return;
      const cl = b.map((v) => Math.max(v, 1e-9));
      const sum = cl.reduce((a, c) => a + c, 0);
      pt = cl.map((v) => v / sum);
      render();
    };
    cvs.style.cursor = 'crosshair';
    cvs.addEventListener('pointerdown', (ev) => {
      pick(ev);
      const mv = (e) => pick(e);
      const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); };
      window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
    });

    triWrap.appendChild(h('div', { class: 'lbl', style: 'font-size:11px;color:var(--muted);margin-bottom:6px', text: 'level sets of F on the 2-simplex — click or drag' }));
    triWrap.appendChild(cvs);
    const sw = h('div', { style: 'display:flex;align-items:center;gap:0;margin-top:8px' });
    RAMP.forEach((c, j) => sw.appendChild(h('span', {
      style: `background:${c};width:${Math.floor(TS / RAMP.length)}px;height:9px;display:inline-block`,
      title: `F ≈ ${dec((j / RAMP.length) * FMAX, 2)}–${dec(((j + 1) / RAMP.length) * FMAX, 2)}`,
    })));
    triWrap.appendChild(sw);
    triWrap.appendChild(h('div', { style: 'display:flex;justify-content:space-between;font:9.5px var(--font-mono);color:var(--muted);width:' + Math.floor(TS / RAMP.length) * RAMP.length + 'px' }, [
      h('span', { text: 'F = 0' }), h('span', { text: '1.5' }),
    ]));
    row.appendChild(triWrap);

    /* ---- right: the recursion unrolled ---- */
    const res = harmonicEntropy(pt);
    const right = h('div', { style: 'flex:1;min-width:260px' });
    right.appendChild(h('div', { class: 'lbl', style: 'font-size:11px;color:var(--muted);margin-bottom:6px', text: 'the recursion, unrolled' }));

    const trows = res.steps.map((st, j) => h('tr', {}, [
      h('td', { class: 'mono', style: 'text-align:left', text: `(${st.from.map((v) => frac(v)).join(', ')})` }),
      h('td', { class: 'mono', text: `− ${frac(st.max)}` }),
      h('td', { class: 'mono', text: frac(st.t) }),
    ]));
    trows.push(h('tr', { class: 'highlight' }, [
      h('td', { class: 'mono', style: 'text-align:left', text: `uniform on ${res.uniformAt}` }),
      h('td', { class: 'mono', text: `+ H_${res.uniformAt - 1} = ${dec(res.base, 4)}` }),
      h('td', { text: '' }),
    ]));
    right.appendChild(h('div', { class: 'tablewrap' }, [
      h('table', { class: 'data' }, [
        h('thead', {}, [h('tr', {}, ['distribution', 'contributes', 'water level'].map((t) => h('th', { text: t })))]),
        h('tbody', {}, trows),
      ]),
    ]));

    right.appendChild(h('div', { class: 'controls', style: 'margin-top:12px' }, [
      pill(`F = ${dec(res.value, 5)}`, 'pass'),
      pill(`series form ≈ ${dec(harmonicEntropySeries(pt, 3000), 4)}`, 'neutral'),
    ]));
    right.appendChild(h('p', { class: 'hint', style: 'margin-top:10px', text:
      'Each step peels off the largest coordinate — the voter’s reserve — and recurses on the balanced '
      + 'distribution that ρ produces. The recursion bottoms out at a uniform distribution, where F is just '
      + 'a harmonic number. That is the sense in which harmonic entropy extends the PAV score.' }));
    row.appendChild(right);

    body.appendChild(row);
    body.appendChild(h('p', { class: 'hint', text:
      'F is continuous, concave, symmetric and unchanged by adding zero coordinates, so it is largest at the '
      + 'centre of the triangle — F(1/3,1/3,1/3) = H_2 = 3/2 — and falls to 0 at the corners, where all the mass '
      + 'sits on one coordinate.' }));
  }

  render();
  host.appendChild(figure({
    id: 'fig-entropy', num, controls, body,
    caption: 'Harmonic entropy. Left: level sets of F on the three-coordinate simplex, the paper’s Figure 4; '
      + 'the maximum 3/2 = H_2 sits at the barycentre and F vanishes at the corners. Right: the defining '
      + 'recursion unrolled at the chosen point, ending in the harmonic number of a uniform distribution.',
  }));
}
