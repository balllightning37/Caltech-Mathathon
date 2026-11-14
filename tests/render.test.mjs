/**
 * Headless render test. Loads index.html in jsdom, mounts every figure, and
 * fails on any thrown error, console error, or empty figure host. Also
 * exercises the interactive controls, since a figure that renders once can
 * still break on the first click.
 */
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => errors.push(`jsdomError: ${e.message}`));
vc.on('error', (...a) => errors.push(`console.error: ${a.join(' ')}`));

const dom = new JSDOM(html, {
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  url: 'http://localhost/',
  virtualConsole: vc,
});
const { window } = dom;
global.window = window;
global.document = window.document;
// Node 24 exposes `navigator` as a getter-only global; skip it.

/* ---- stubs for the bits jsdom does not implement ---- */

// The simplex heat map draws to a 2d canvas.
window.HTMLCanvasElement.prototype.getContext = function () {
  const noop = () => {};
  return {
    scale: noop, clearRect: noop, fillRect: noop, beginPath: noop, moveTo: noop,
    lineTo: noop, closePath: noop, stroke: noop, fill: noop, arc: noop,
    fillText: noop, set fillStyle(v) {}, set strokeStyle(v) {},
    set lineWidth(v) {}, set font(v) {}, set textAlign(v) {},
  };
};
// SVG geometry used by the drag handles / simplex picking.
window.SVGElement.prototype.getScreenCTM = function () {
  return { inverse: () => ({}) };
};
window.SVGSVGElement.prototype.createSVGPoint = function () {
  return { x: 0, y: 0, matrixTransform: () => ({ x: 0, y: 0 }) };
};
Object.defineProperty(window.Element.prototype, 'getBoundingClientRect', {
  value: () => ({ left: 0, top: 0, width: 600, height: 300, right: 600, bottom: 300 }),
  configurable: true,
});
window.Element.prototype.setPointerCapture = function () {};

const landscape = JSON.parse(
  readFileSync(new URL('../data/landscape.json', import.meta.url), 'utf8')
);
global.fetch = async () => ({ json: async () => landscape, ok: true });

/* ---- mount every figure the way main.js does ---- */

const { mountInstanceFigure, mountCoreFigure, mountCorePlusFigure } =
  await import('../js/figures/basics.js');
const { mountPaymentsFigure, mountPavFigure } =
  await import('../js/figures/paymentsfig.js');
const { mountRobinHoodFigure, mountEntropyFigure } =
  await import('../js/figures/entropyfig.js');
const { mountSwapFigure, mountLandscapeFigure } =
  await import('../js/figures/rulefig.js');

const figures = [
  ['fig-1-host', 'instance',   (h) => mountInstanceFigure(h)],
  ['fig-2-host', 'core',       (h) => mountCoreFigure(h)],
  ['fig-3-host', 'core+',      (h) => mountCorePlusFigure(h)],
  ['fig-4-host', 'payments',   (h) => mountPaymentsFigure(h)],
  ['fig-5-host', 'PAV',        (h) => mountPavFigure(h)],
  ['fig-6-host', 'robin hood', (h) => mountRobinHoodFigure(h)],
  ['fig-7-host', 'entropy',    (h) => mountEntropyFigure(h)],
  ['fig-8-host', 'swap',       (h) => mountSwapFigure(h, landscape)],
  ['fig-9-host', 'landscape',  (h) => mountLandscapeFigure(h, landscape)],
];

let fails = 0;
const chk = (name, ok, extra = '') => {
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);
};

for (const [id, name, fn] of figures) {
  const host = document.getElementById(id);
  if (!host) { chk(`${name}: host #${id} present`, false); continue; }
  let err = null;
  try { fn(host); } catch (e) { err = e; }
  if (err) { chk(`${name}: mounts`, false, err.message); continue; }

  const fig = host.querySelector('figure');
  const svgOrCanvas = host.querySelectorAll('svg, canvas').length;
  const caption = host.querySelector('figcaption');
  chk(`${name}: mounts`, true);
  chk(`${name}: has a <figure>`, !!fig);
  chk(`${name}: draws ${svgOrCanvas} svg/canvas`, svgOrCanvas > 0);
  chk(`${name}: has a caption`, !!caption && caption.textContent.length > 30);
}

/* ---- click every button in every figure ---- */

console.log('\n--- exercising controls ---');
for (const [id, name] of figures) {
  const host = document.getElementById(id);
  if (!host) continue;
  const buttons = [...host.querySelectorAll('button')];
  let clickFails = 0;
  for (const b of buttons) {
    try { b.click(); } catch (e) {
      clickFails++;
      if (clickFails === 1) console.log(`      ${name}: "${b.textContent}" -> ${e.message}`);
    }
  }
  chk(`${name}: ${buttons.length} buttons clickable`, clickFails === 0,
    clickFails ? `${clickFails} threw` : '');
}

/* ---- move every slider ---- */

console.log('\n--- exercising sliders ---');
for (const [id, name] of figures) {
  const host = document.getElementById(id);
  if (!host) continue;
  const ranges = [...host.querySelectorAll('input[type=range]')];
  let f = 0;
  for (const r of ranges) {
    for (const v of [r.min, r.max, '0.5']) {
      try {
        r.value = v;
        r.dispatchEvent(new window.Event('input', { bubbles: true }));
      } catch (e) { f++; if (f === 1) console.log(`      ${name}: ${e.message}`); }
    }
  }
  if (ranges.length) chk(`${name}: ${ranges.length} sliders respond`, f === 0);
}

/* ---- clicking candidates / voters in the ballot diagrams ---- */

console.log('\n--- exercising ballot clicks ---');
for (const id of ['fig-1-host', 'fig-2-host']) {
  const host = document.getElementById(id);
  const groups = [...host.querySelectorAll('svg g')].filter((g) => g.getAttribute('style'));
  let f = 0;
  for (const g of groups.slice(0, 14)) {
    try { g.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); }
    catch (e) { f++; if (f === 1) console.log(`      ${id}: ${e.message}`); }
  }
  chk(`${id}: ballot clicks`, f === 0);
}

console.log('');
chk('no console errors or jsdom errors', errors.length === 0,
  errors.slice(0, 4).join(' | '));

/* ---- static page checks ---- */
const bodyText = document.body.textContent;
chk('page has a title', document.title.length > 10);
chk('TOC links all resolve', [...document.querySelectorAll('.toc a')]
  .every((a) => document.querySelector(a.getAttribute('href'))));
chk('every content section heading is numbered',
  [...document.querySelectorAll('main section:not(.footnotes) h2')]
    .every((x) => x.querySelector('.num')));
chk('all 10 sections present',
  document.querySelectorAll('main section:not(.footnotes)').length === 10);
chk('paper is cited', bodyText.includes('2609.11912'));

console.log(fails === 0 ? '\nALL TESTS PASSED' : `\n${fails} FAILURE(S)`);
process.exit(fails === 0 ? 0 : 1);
