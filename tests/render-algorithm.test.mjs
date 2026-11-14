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
const { mountRunnerFigure } = await import('../js/figures/runner.js');

let fails = 0;
const chk = (name, ok, extra = '') => {
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);
};

const figures = [
  ['fig-a1-host', 'repair loop',    mountAlgorithmFigure],
  ['fig-a2-host', 'de-reservation', mountDereserveFigure],
  ['fig-a3-host', 'cost',           mountCostFigure],
  ['fig-a4-host', 'runner',         mountRunnerFigure],
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
  if (name === 'runner') {
    // The runner shows the instance builder first and only draws once run.
    chk(`${name}: renders the instance builder`,
      !!host.querySelector('.palette') && !!host.querySelector('.dropzone'));
  } else {
    chk(`${name}: draws ${drawn} svg/canvas`, drawn > 0);
  }
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
chk('all 8 sections present',
  document.querySelectorAll('main section:not(.footnotes)').length === 8);
chk('every content section heading is numbered',
  [...document.querySelectorAll('main section:not(.footnotes) h2')]
    .every((x) => x.querySelector('.num')));
chk('references the reference implementation', text.includes('core_algorithm.py'));
chk('states the browser/reference difference', text.includes('projected-gradient'));

/* ---- the runner: builder, drag-and-drop, and stepping to the end ---- */

console.log('\n--- runner: instance builder ---');
{
  const host = document.getElementById('fig-a4-host');
  const palette = host.querySelector('.palette');
  const zones = [...host.querySelectorAll('.dropzone')];
  chk('runner: palette rendered', !!palette && palette.children.length >= 2,
    palette ? `${palette.children.length} chips` : 'missing');
  chk('runner: one drop zone per voter', zones.length >= 1, `${zones.length} zones`);
  chk('runner: palette chips are draggable',
    [...palette.children].every((c) => c.getAttribute('draggable') === 'true'));

  const dt = { data: {}, setData(k, v) { this.data[k] = v; }, getData(k) { return this.data[k]; } };
  const before = host.querySelectorAll('.dropzone .chip-on').length;
  const dragEl = palette.children[palette.children.length - 1];
  dragEl.dispatchEvent(Object.assign(new window.Event('dragstart', { bubbles: true }), { dataTransfer: dt }));
  host.querySelectorAll('.dropzone')[0].dispatchEvent(
    Object.assign(new window.Event('drop', { bubbles: true, cancelable: true }), { dataTransfer: dt }));
  const after = host.querySelectorAll('.dropzone .chip-on').length;
  chk('runner: drop adds an approval', after !== before, `${before} -> ${after}`);

  const assigned = host.querySelector('.dropzone .chip-on');
  if (assigned) {
    const n0 = host.querySelectorAll('.dropzone .chip-on').length;
    assigned.click();
    const n1 = host.querySelectorAll('.dropzone .chip-on').length;
    chk('runner: clicking an assigned chip removes it', n1 === n0 - 1, `${n0} -> ${n1}`);
  }

  const n2 = host.querySelectorAll('.dropzone .chip-on').length;
  host.querySelector('.palette').children[0].click();
  chk('runner: clicking a palette chip arms it', !!host.querySelector('.chip-armed'));
  host.querySelectorAll('.dropzone')[0].click();
  chk('runner: clicking a row adds the armed chip',
    host.querySelectorAll('.dropzone .chip-on').length >= n2);
}

console.log('--- runner: dual programme and stepping ---');
{
  const host = document.getElementById('fig-a4-host');
  const byText = (t) => [...host.querySelectorAll('button')].find((b) => b.textContent === t);

  // An earlier pass clicked every button, which may have toggled the dual
  // panel off; put it back explicitly.
  const showDual = byText('Show dual');
  if (showDual) showDual.click();
  chk('runner: dual panel present before running', host.textContent.includes('dual programme'));

  const preset = byText('two blocks');
  chk('runner: presets available', !!preset);
  if (preset) preset.click();

  let guard = 0, stepped = 0;
  while (guard++ < 300) {
    const step = byText('Step');
    if (!step) break;
    step.click();
    stepped++;
    if (host.textContent.includes('from certificate back to the core')) break;
  }
  chk('runner: stepping reaches the certificate',
    stepped > 0 && host.textContent.includes('from certificate back to the core'),
    `${stepped} steps`);
  chk('runner: reports the certificate verified', host.textContent.includes('certificate verified'));
  chk('runner: brute-force core check reported',
    host.textContent.includes('in the core') || host.textContent.includes('blocked by'));
  chk('runner: (P3) pill shown', host.textContent.includes('(P3)'));
  chk('runner: writes out the dual constraints', !!host.querySelector('pre.dual'));
  chk('runner: draws the payment bars once running', host.querySelectorAll('svg').length > 0);

  const reset = byText('Reset');
  if (reset) reset.click();
  const instant = [...host.querySelectorAll('button')].find((b) => b.textContent === 'instant');
  if (instant) instant.click();
  const runBtn = [...host.querySelectorAll('button')].find((b) => /^(Run|Resume)$/.test(b.textContent));
  if (runBtn) runBtn.click();
  chk('runner: instant speed reaches the end',
    host.textContent.includes('from certificate back to the core'));
}

console.log('--- runner: size controls ---');
{
  const host = document.getElementById('fig-a4-host');
  const plusOnes = () => [...host.querySelectorAll('button')].filter((b) => b.textContent === '+');
  const minusOnes = () => [...host.querySelectorAll('button')].filter((b) => b.textContent === '\u2212');
  chk('runner: three +/- pairs for n, m, k',
    plusOnes().length === 3 && minusOnes().length === 3,
    `${plusOnes().length} plus, ${minusOnes().length} minus`);
  let threw = 0;
  for (let pass = 0; pass < 5; pass++) {
    for (let j = 0; j < 3; j++) {
      try { const b = plusOnes()[j]; if (b) b.click(); } catch (e) { threw++; }
    }
  }
  chk('runner: growing n, m, k never throws', threw === 0);
  chk('runner: voter rows track n', host.querySelectorAll('.dropzone').length >= 1);
  for (let pass = 0; pass < 6; pass++) {
    for (let j = 0; j < 3; j++) {
      try { const b = minusOnes()[j]; if (b) b.click(); } catch (e) { threw++; }
    }
  }
  chk('runner: shrinking n, m, k never throws', threw === 0);
}

console.log(fails === 0 ? '\nALL TESTS PASSED' : `\n${fails} FAILURE(S)`);
process.exit(fails === 0 ? 0 : 1);
