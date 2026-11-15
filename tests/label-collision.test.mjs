/**
 * Scans every SVG drawn by every figure for overlapping text.
 *
 * Two quota/threshold labels have now shipped sitting on the same baseline
 * as their chart title, so this checks the general property rather than
 * those two cases: no two <text> nodes in the same SVG may share a baseline
 * and overlap horizontally.
 *
 * jsdom has no text metrics, so widths are estimated from the font size and
 * character count. The estimate is deliberately generous and a collision is
 * only reported past a small margin, so a near-miss does not cry wolf.
 */
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

const OVERLAP_MARGIN = 3;        // px of real overlap before we complain

let fails = 0;
const chk = (name, ok, extra = '') => {
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);
};

function setupDom() {
  const vc = new VirtualConsole();
  const dom = new JSDOM('<main class="wrap"><div id="host"></div></main>', {
    pretendToBeVisual: true, url: 'http://localhost/', virtualConsole: vc,
  });
  const { window } = dom;
  global.window = window;
  global.document = window.document;
  window.HTMLCanvasElement.prototype.getContext = function () {
    const noop = () => {};
    return {
      scale: noop, clearRect: noop, fillRect: noop, beginPath: noop, moveTo: noop,
      lineTo: noop, closePath: noop, stroke: noop, fill: noop, arc: noop,
      fillText: noop, set fillStyle(v) {}, set strokeStyle(v) {},
      set lineWidth(v) {}, set font(v) {}, set textAlign(v) {},
    };
  };
  window.SVGElement.prototype.getScreenCTM = function () { return { inverse: () => ({}) }; };
  window.SVGSVGElement.prototype.createSVGPoint = function () {
    return { x: 0, y: 0, matrixTransform: () => ({ x: 0, y: 0 }) };
  };
  Object.defineProperty(window.Element.prototype, 'getBoundingClientRect', {
    value: () => ({ left: 0, top: 0, width: 600, height: 300, right: 600, bottom: 300 }),
    configurable: true,
  });
  window.Element.prototype.setPointerCapture = function () {};
  return window;
}

function fontSizeOf(el) {
  const explicit = parseFloat(el.getAttribute('font-size'));
  if (!Number.isNaN(explicit)) return explicit;
  const cls = el.getAttribute('class') || '';
  if (cls.includes('tick')) return 9.5;
  return 11;                       // lbl and lbl-mono
}

function isMono(el) {
  const cls = el.getAttribute('class') || '';
  return cls.includes('mono');
}

/** Horizontal extent [left, right] of an SVG <text>. */
function extent(el) {
  const size = fontSizeOf(el);
  const text = el.textContent || '';
  const perChar = isMono(el) ? 0.58 : 0.52;
  const w = text.length * size * perChar;
  const x = parseFloat(el.getAttribute('x')) || 0;
  const anchor = el.getAttribute('text-anchor') || 'start';
  if (anchor === 'middle') return [x - w / 2, x + w / 2, size, text];
  if (anchor === 'end') return [x - w, x, size, text];
  return [x, x + w, size, text];
}

/** Report every substantial overlap between texts in one SVG. */
function collisions(svg) {
  const texts = [...svg.querySelectorAll('text')].filter((t) => (t.textContent || '').trim());
  const out = [];
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i], b = texts[j];
      // Rotated labels (axis titles) are out of scope.
      if (a.getAttribute('transform') || b.getAttribute('transform')) continue;
      const ya = parseFloat(a.getAttribute('y')) || 0;
      const yb = parseFloat(b.getAttribute('y')) || 0;
      const [la, ra, sa, ta] = extent(a);
      const [lb, rb, sb, tb] = extent(b);
      // Baselines close enough that the line boxes share rows.
      if (Math.abs(ya - yb) > Math.max(sa, sb) * 0.7) continue;
      const overlap = Math.min(ra, rb) - Math.max(la, lb);
      if (overlap > OVERLAP_MARGIN) {
        out.push(`"${ta.slice(0, 38)}" ∩ "${tb.slice(0, 38)}" at y≈${ya} by ${overlap.toFixed(0)}px`);
      }
    }
  }
  return out;
}

function auditHost(label, host) {
  const svgs = [...host.querySelectorAll('svg')];
  const hits = [];
  svgs.forEach((svg, k) => {
    for (const c of collisions(svg)) hits.push(`svg#${k + 1}: ${c}`);
  });
  chk(`${label}: ${svgs.length} chart(s), no overlapping text`, hits.length === 0,
    hits.slice(0, 4).join(' | '));
  return hits.length;
}

/* ------------------------------------------------------------------ */

const window = setupDom();
const landscape = JSON.parse(
  readFileSync(new URL('../data/landscape.json', import.meta.url), 'utf8')
);

const basics = await import('../js/figures/basics.js');
const payments = await import('../js/figures/paymentsfig.js');
const entropy = await import('../js/figures/entropyfig.js');
const rule = await import('../js/figures/rulefig.js');
const algo = await import('../js/figures/algofig.js');
const runner = await import('../js/figures/runner.js');

/** Mount a figure into a fresh host, click through its controls, audit each state. */
function sweep(label, mountFn, { passes = 4 } = {}) {
  const host = window.document.createElement('div');
  window.document.getElementById('host').appendChild(host);
  mountFn(host);
  let hits = auditHost(`${label} (initial)`, host);

  // Each control press re-renders, which can change the axis scale and so
  // move the threshold line. Audit after every press.
  for (let pass = 0; pass < passes; pass++) {
    const buttons = [...host.querySelectorAll('button')];
    for (let j = 0; j < buttons.length; j++) {
      const fresh = [...host.querySelectorAll('button')][j];
      if (!fresh) continue;
      try { fresh.click(); } catch { continue; }
      hits += collisions(host.querySelector('svg') || window.document.createElement('div')).length;
      const svgs = [...host.querySelectorAll('svg')];
      for (const svg of svgs) {
        const c = collisions(svg);
        if (c.length) {
          fails++;
          console.log(`FAIL  ${label}: after pressing "${fresh.textContent}" — ${c[0]}`);
          return hits;
        }
      }
    }
  }
  return hits;
}

console.log('--- proof tab figures ---');
sweep('fig 1 core+', (h) => basics.mountCorePlusFigure(h, { num: 1 }));
sweep('fig 2 payments', (h) => payments.mountPaymentsFigure(h, { num: 2 }));
sweep('fig 3 PAV', (h) => payments.mountPavFigure(h, { num: 3 }));
sweep('fig 4 robin hood', (h) => entropy.mountRobinHoodFigure(h, { num: 4 }));
sweep('fig 5 entropy', (h) => entropy.mountEntropyFigure(h, { num: 5 }));
sweep('fig 6 swap', (h) => rule.mountSwapFigure(h, landscape, { num: 6 }));
sweep('fig 7 landscape', (h) => rule.mountLandscapeFigure(h, landscape, { num: 7 }));

console.log('--- problem tab figures ---');
sweep('instance', (h) => basics.mountInstanceFigure(h, { num: 1 }));
sweep('core', (h) => basics.mountCoreFigure(h, { num: 2 }));

console.log('--- algorithm tab figures ---');
sweep('repair loop', (h) => algo.mountAlgorithmFigure(h));
sweep('de-reservation', (h) => algo.mountDereserveFigure(h));
sweep('cost', (h) => algo.mountCostFigure(h));
sweep('runner', (h) => runner.mountRunnerFigure(h), { passes: 2 });

console.log(fails === 0 ? '\nALL TESTS PASSED' : `\n${fails} FAILURE(S)`);
process.exit(fails === 0 ? 0 : 1);
