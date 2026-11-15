/**
 * End-to-end maths check: load each page in jsdom, mount its figures in the
 * same order its entry point does, then run the REAL KaTeX auto-render with
 * the page's own configuration.
 *
 * This catches what a regex sweep cannot:
 *   - expressions that render as red error text (.katex-error)
 *   - maths that is never rendered at all, because renderMathInElement was
 *     called before KaTeX finished loading
 */
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import renderMathInElement from 'katex/dist/contrib/auto-render.js';

let fails = 0;
const chk = (name, ok, extra = '') => {
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);
};

function makeDom(page) {
  const html = readFileSync(new URL(`../${page}`, import.meta.url), 'utf8');
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push(e.message));
  vc.on('error', (...a) => errors.push(a.join(' ')));
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: `http://localhost/${page}`,
    virtualConsole: vc,
  });
  const { window } = dom;
  global.window = window;
  global.document = window.document;
  // auto-render reads the global Node for nodeType comparisons.
  global.Node = window.Node;

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
  return { window, errors };
}

/** The configuration every page passes to renderMathInElement. */
const CONFIG = {
  delimiters: [
    { left: '\\[', right: '\\]', display: true },
    { left: '\\(', right: '\\)', display: false },
  ],
  throwOnError: false,
  ignoredClasses: ['mono'],
};

/**
 * Count unrendered delimiters, ignoring KaTeX's own output: it keeps the
 * original TeX in an <annotation>, and a `cases` row separator like
 * `\\[4pt]` in there would otherwise look like a stray delimiter.
 */
function leftoverDelimiters(doc, win) {
  const walker = doc.createTreeWalker(doc.body, win.NodeFilter.SHOW_TEXT);
  let count = 0;
  let n;
  while ((n = walker.nextNode())) {
    let p = n.parentNode, inside = false;
    while (p && p !== doc.body) {
      const cls = p.className;
      if (typeof cls === 'string' && cls.includes('katex')) { inside = true; break; }
      p = p.parentNode;
    }
    if (inside) continue;
    count += (n.textContent.match(/\\[([]/g) || []).length;
  }
  return count;
}

const landscape = JSON.parse(
  readFileSync(new URL('../data/landscape.json', import.meta.url), 'utf8')
);

async function run(page, mountAll) {
  console.log(`--- ${page} ---`);
  const { window, errors } = makeDom(page);
  const doc = window.document;

  await mountAll(doc);

  // Count the maths the page is asking for, before anything renders.
  const rawBefore = leftoverDelimiters(doc, window);

  // The real auto-render, with the page's own options.
  renderMathInElement(doc.body, CONFIG);

  const rendered = doc.querySelectorAll('.katex').length;
  const afterOne = doc.querySelectorAll('.katex-error').length;

  // Rendering must be idempotent: the entry points may run it twice.
  renderMathInElement(doc.body, CONFIG);
  const broken = [...doc.querySelectorAll('.katex-error')];
  const leftover = leftoverDelimiters(doc, window);

  chk(`${page}: maths rendered`, rendered > 0, `${rendered} .katex nodes`);
  chk(`${page}: nothing renders as red error text`, broken.length === 0,
    broken.length ? broken.slice(0, 5).map((e) => (e.getAttribute('title') || e.textContent || '').slice(0, 90)).join(' | ') : '');
  chk(`${page}: no unrendered delimiters left in the text`, leftover === 0,
    `${rawBefore} before, ${leftover} after`);
  chk(`${page}: a second render pass adds no errors`, broken.length === afterOne,
    `${afterOne} then ${broken.length}`);
  chk(`${page}: no console errors`, errors.length === 0, errors.slice(0, 2).join(' | '));
  return broken.length === 0 && leftover === 0;
}

/* -------------------------------------------------------------------- */

const basics = await import('../js/figures/basics.js');
const payments = await import('../js/figures/paymentsfig.js');
const entropy = await import('../js/figures/entropyfig.js');
const rule = await import('../js/figures/rulefig.js');
const algo = await import('../js/figures/algofig.js');
const runner = await import('../js/figures/runner.js');

const put = (doc, id, fn) => {
  const host = doc.getElementById(id);
  if (host) fn(host);
};

await run('problem.html', async (doc) => {
  put(doc, 'fig-1-host', (h) => basics.mountInstanceFigure(h, { num: 1 }));
  put(doc, 'fig-2-host', (h) => basics.mountCoreFigure(h, { num: 2 }));
});

await run('index.html', async (doc) => {
  put(doc, 'fig-1-host', (h) => basics.mountCorePlusFigure(h, { num: 1 }));
  put(doc, 'fig-2-host', (h) => payments.mountPaymentsFigure(h, { num: 2 }));
  put(doc, 'fig-3-host', (h) => payments.mountPavFigure(h, { num: 3 }));
  put(doc, 'fig-4-host', (h) => entropy.mountRobinHoodFigure(h, { num: 4 }));
  put(doc, 'fig-5-host', (h) => entropy.mountEntropyFigure(h, { num: 5 }));
  put(doc, 'fig-6-host', (h) => rule.mountSwapFigure(h, landscape, { num: 6 }));
  put(doc, 'fig-7-host', (h) => rule.mountLandscapeFigure(h, landscape, { num: 7 }));
});

await run('algorithm.html', async (doc) => {
  put(doc, 'fig-a1-host', (h) => algo.mountAlgorithmFigure(h));
  put(doc, 'fig-a2-host', (h) => algo.mountDereserveFigure(h));
  put(doc, 'fig-a3-host', (h) => algo.mountCostFigure(h));
  put(doc, 'fig-a4-host', (h) => runner.mountRunnerFigure(h));
});

console.log(fails === 0 ? '\nALL TESTS PASSED' : `\n${fails} FAILURE(S)`);
process.exit(fails === 0 ? 0 : 1);
