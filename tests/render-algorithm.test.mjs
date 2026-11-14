/**
 * Headless render test for the algorithm tab: mounts all three figures,
 * exercises every control, and checks the cross-tab navigation.
 */
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

const html = readFileSync(new URL('../algorithm.html', import.meta.url), 'utf8');

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => errors.push(`jsdomError: ${e.message}`));
vc.on('error', (...a) => errors.push(`console.error: ${a.join(' ')}`));

const dom = new JSDOM(html, {
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  url: 'http://localhost/algorithm.html',
  virtualConsole: vc,
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

const { mountAlgorithmFigure, mountDereserveFigure, mountCostFigure } =
  await import('../js/figures/algofig.js');

let fails = 0;
const chk = (name, ok, extra = '') => {
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);
};

const figures = [
  ['fig-a1-host', 'repair loop',    mountAlgorithmFigure],
  ['fig-a2-host', 'de-reservation', mountDereserveFigure],
  ['fig-a3-host', 'cost',           mountCostFigure],
];

for (const [id, name, fn] of figures) {
  const host = document.getElementById(id);
  if (!host) { chk(`${name}: host #${id} present`, false); continue; }
  let err = null;
  try { fn(host); } catch (e) { err = e; }
  if (err) { chk(`${name}: mounts`, false, `${err.message}`); continue; }
  chk(`${name}: mounts`, true);
  chk(`${name}: has a <figure>`, !!host.querySelector('figure'));
  const drawn = host.querySelectorAll('svg, canvas').length;
  chk(`${name}: draws ${drawn} svg/canvas`, drawn > 0);
  const cap = host.querySelector('figcaption');
  chk(`${name}: has a caption`, !!cap && cap.textContent.length > 30);
}

console.log('\n--- exercising every control (each click re-renders) ---');
for (const [id, name] of figures) {
  const host = document.getElementById(id);
  if (!host) continue;
  let clicks = 0, bad = 0;
  // Re-query after each click, because rendering replaces the DOM.
  for (let pass = 0; pass < 3; pass++) {
    const buttons = [...host.querySelectorAll('button')];
    for (let j = 0; j < buttons.length; j++) {
      const fresh = [...host.querySelectorAll('button')][j];
      if (!fresh) continue;
      try { fresh.click(); clicks++; } catch (e) {
        bad++;
        if (bad === 1) console.log(`      ${name}: "${fresh.textContent}" -> ${e.message}`);
      }
    }
  }
  chk(`${name}: ${clicks} clicks, ${bad} threw`, bad === 0);
}

console.log('');
chk('no console errors or jsdom errors', errors.length === 0, errors.slice(0, 4).join(' | '));

const text = document.body.textContent;
chk('page has a title', document.title.length > 10);
chk('tab bar links to the other tab',
  !!document.querySelector('.tabs a[href="index.html"]'));
chk('tab bar marks this page current',
  document.querySelector('.tabs a[aria-current="page"]').getAttribute('href') === 'algorithm.html');
chk('all 7 sections present',
  document.querySelectorAll('main section:not(.footnotes)').length === 7);
chk('every content section heading is numbered',
  [...document.querySelectorAll('main section:not(.footnotes) h2')]
    .every((x) => x.querySelector('.num')));
chk('references the reference implementation', text.includes('core_algorithm.py'));
chk('states the browser/reference difference', text.includes('projected-gradient'));

console.log(fails === 0 ? '\nALL TESTS PASSED' : `\n${fails} FAILURE(S)`);
process.exit(fails === 0 ? 0 : 1);
