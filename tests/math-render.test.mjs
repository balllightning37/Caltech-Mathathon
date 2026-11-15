/**
 * Renders every maths expression on every page with the real KaTeX, with
 * throwOnError enabled, so a parse error is a test failure rather than
 * silent red text on the live site.
 *
 * The page uses KaTeX's auto-render, which walks text nodes and, for each,
 * scans left to right for an opening delimiter and then the matching
 * closing one. This mirrors that, so what gets handed to KaTeX here is
 * what gets handed to it in the browser -- including the fact that a
 * sequence like `\\[4pt]` inside an already-open block is content, not a
 * delimiter.
 */
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import katex from 'katex';

const PAGES = ['problem.html', 'index.html', 'algorithm.html'];

// Same delimiter set the pages configure.
const DELIMS = [
  { left: '\\[', right: '\\]', display: true },
  { left: '\\(', right: '\\)', display: false },
];

/** Split one text node's content into literal and maths pieces. */
function splitText(text) {
  const out = [];
  let pos = 0;
  while (pos < text.length) {
    let best = null;
    for (const d of DELIMS) {
      const at = text.indexOf(d.left, pos);
      if (at !== -1 && (best === null || at < best.at)) best = { at, d };
    }
    if (!best) break;
    const close = text.indexOf(best.d.right, best.at + best.d.left.length);
    if (close === -1) {
      out.push({ kind: 'unclosed', delim: best.d.left, at: best.at,
                 sample: text.slice(best.at, best.at + 60) });
      break;
    }
    out.push({
      kind: 'math',
      display: best.d.display,
      tex: text.slice(best.at + best.d.left.length, close),
    });
    pos = close + best.d.right.length;
  }
  return out;
}

function textNodes(root, doc, win) {
  const walker = doc.createTreeWalker(root, win.NodeFilter.SHOW_TEXT);
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) {
    // auto-render skips script and style content.
    const tag = n.parentNode && n.parentNode.nodeName;
    if (tag === 'SCRIPT' || tag === 'STYLE') continue;
    nodes.push(n);
  }
  return nodes;
}

let fails = 0;
const chk = (name, ok, extra = '') => {
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);
};

let grandTotal = 0;

for (const page of PAGES) {
  const html = readFileSync(new URL(`../${page}`, import.meta.url), 'utf8');
  const dom = new JSDOM(html);
  const { window } = dom;
  const doc = window.document;

  const pieces = [];
  for (const node of textNodes(doc.body, doc, window)) {
    for (const piece of splitText(node.textContent)) pieces.push(piece);
  }

  const unclosed = pieces.filter((p) => p.kind === 'unclosed');
  const maths = pieces.filter((p) => p.kind === 'math');
  grandTotal += maths.length;

  const broken = [];
  for (const m of maths) {
    try {
      katex.renderToString(m.tex, { displayMode: m.display, throwOnError: true });
    } catch (e) {
      broken.push({ tex: m.tex, msg: e.message });
    }
  }

  console.log(`--- ${page}: ${maths.length} expressions ---`);
  chk(`${page}: no unclosed delimiters`, unclosed.length === 0,
    unclosed.map((u) => `${u.delim} … "${u.sample.replace(/\s+/g, ' ')}"`).join(' | '));
  chk(`${page}: every expression parses`, broken.length === 0,
    broken.length ? `${broken.length} broken` : '');
  for (const b of broken.slice(0, 8)) {
    console.log(`      TeX: ${b.tex.replace(/\s+/g, ' ').slice(0, 100)}`);
    console.log(`      ${b.msg.split('\n')[0].slice(0, 150)}`);
  }
  chk(`${page}: has maths at all`, maths.length > 0, `${maths.length}`);
}

console.log(`\ntotal expressions checked: ${grandTotal}`);
console.log(fails === 0 ? 'ALL TESTS PASSED' : `${fails} FAILURE(S)`);
process.exit(fails === 0 ? 0 : 1);
