/**
 * Headless render test for the "Understanding the problem" tab.
 */
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

const html = readFileSync(new URL('../problem.html', import.meta.url), 'utf8');

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => errors.push(`jsdomError: ${e.message}`));
vc.on('error', (...a) => errors.push(`console.error: ${a.join(' ')}`));

const dom = new JSDOM(html, {
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  url: 'http://localhost/problem.html',
  virtualConsole: vc,
});
const { window } = dom;
global.window = window;
global.document = window.document;

window.SVGElement.prototype.getScreenCTM = function () { return { inverse: () => ({}) }; };
window.SVGSVGElement.prototype.createSVGPoint = function () {
  return { x: 0, y: 0, matrixTransform: () => ({ x: 0, y: 0 }) };
};
Object.defineProperty(window.Element.prototype, 'getBoundingClientRect', {
  value: () => ({ left: 0, top: 0, width: 600, height: 300, right: 600, bottom: 300 }),
  configurable: true,
});
window.Element.prototype.setPointerCapture = function () {};

const { mountInstanceFigure, mountCoreFigure } = await import('../js/figures/basics.js');

let fails = 0;
const chk = (name, ok, extra = '') => {
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);
};

const figures = [
  ['fig-1-host', 'instance', (h) => mountInstanceFigure(h, { num: 1 })],
  ['fig-2-host', 'core',     (h) => mountCoreFigure(h, { num: 2 })],
];

for (const [id, name, fn] of figures) {
  const host = document.getElementById(id);
  if (!host) { chk(`${name}: host #${id} present`, false); continue; }
  let err = null;
  try { fn(host); } catch (e) { err = e; }
  if (err) { chk(`${name}: mounts`, false, err.message); continue; }
  chk(`${name}: mounts`, true);
  chk(`${name}: has a <figure>`, !!host.querySelector('figure'));
  chk(`${name}: draws svg`, host.querySelectorAll('svg').length > 0);
  const cap = host.querySelector('figcaption');
  chk(`${name}: has a caption`, !!cap && cap.textContent.length > 30);
}

console.log('\n--- exercising controls ---');
for (const [id, name] of figures) {
  const host = document.getElementById(id);
  if (!host) continue;
  let clicks = 0, bad = 0;
  for (let pass = 0; pass < 3; pass++) {
    const n = host.querySelectorAll('button').length;
    for (let j = 0; j < n; j++) {
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
chk('no console errors or jsdom errors', errors.length === 0, errors.slice(0, 3).join(' | '));

const text = document.body.textContent;
chk('page has a title', document.title.length > 10);
chk('h1 labels the tab', document.querySelector('h1').textContent.trim() === 'Understanding the problem');
chk('tab bar has all three tabs', document.querySelectorAll('.tabs a').length === 3);
chk('this tab is marked current',
  document.querySelector('.tabs a[aria-current="page"]').getAttribute('href') === 'problem.html');
chk('links to the proof tab', !!document.querySelector('.tabs a[href="index.html"]'));
chk('links to the algorithm tab', !!document.querySelector('.tabs a[href="algorithm.html"]'));
chk('TOC links all resolve', [...document.querySelectorAll('.toc a')]
  .every((a) => document.querySelector(a.getAttribute('href'))));
chk('four sections present',
  document.querySelectorAll('main section:not(.footnotes)').length === 4);
chk('every content section heading is numbered',
  [...document.querySelectorAll('main section:not(.footnotes) h2')]
    .every((x) => x.querySelector('.num')));
chk('figures numbered 1 and 2', (() => {
  const nums = [...document.querySelectorAll('figcaption .fignum')]
    .map((x) => parseInt(x.textContent.replace(/[^0-9]/g, ''), 10));
  return nums.join() === '1,2';
})());
chk('covers the three moved sections',
  ['s-question', 's-setup', 's-core'].every((id) => !!document.getElementById(id)));
chk('paper is cited', text.includes('2609.11912'));
chk('defines the quota', text.includes('quota'));
chk('defines the core', /\bcore\b/i.test(text));

console.log(fails === 0 ? '\nALL TESTS PASSED' : `\n${fails} FAILURE(S)`);
process.exit(fails === 0 ? 0 : 1);
