/** Page entry point: render the maths, then mount each figure. */

import { mountInstanceFigure, mountCoreFigure, mountCorePlusFigure } from './figures/basics.js';
import { mountPaymentsFigure, mountPavFigure } from './figures/paymentsfig.js';
import { mountRobinHoodFigure, mountEntropyFigure } from './figures/entropyfig.js';
import { loadData, mountSwapFigure, mountLandscapeFigure } from './figures/rulefig.js';

function renderMath() {
  if (typeof window.renderMathInElement !== 'function') return;
  window.renderMathInElement(document.body, {
    delimiters: [
      { left: '\\[', right: '\\]', display: true },
      { left: '\\(', right: '\\)', display: false },
    ],
    throwOnError: false,
    ignoredClasses: ['mono'],
  });
}

function mount(id, fn) {
  const host = document.getElementById(id);
  if (!host) return;
  try {
    fn(host);
  } catch (err) {
    console.error(`figure ${id} failed`, err);
    host.innerHTML =
      '<div class="frame"><p class="hint">This figure failed to render. '
      + 'Details are in the browser console.</p></div>';
  }
}

async function main() {
  mount('fig-1-host', mountInstanceFigure);
  mount('fig-2-host', mountCoreFigure);
  mount('fig-3-host', mountCorePlusFigure);
  mount('fig-4-host', mountPaymentsFigure);
  mount('fig-5-host', mountPavFigure);
  mount('fig-6-host', mountRobinHoodFigure);
  mount('fig-7-host', mountEntropyFigure);

  // Figures 8 and 9 read precomputed V values.
  try {
    const data = await loadData();
    mount('fig-8-host', (host) => mountSwapFigure(host, data));
    mount('fig-9-host', (host) => mountLandscapeFigure(host, data));
  } catch (err) {
    console.error('could not load landscape data', err);
    for (const id of ['fig-8-host', 'fig-9-host']) {
      const host = document.getElementById(id);
      if (host) {
        host.innerHTML =
          '<div class="frame"><p class="hint">Could not load '
          + '<code>data/landscape.json</code>. If you are viewing this page from the file system, '
          + 'serve the folder over HTTP instead (<code>npm run serve</code>).</p></div>';
      }
    }
  }

  // KaTeX is deferred, so it may not be ready when the module first runs.
  if (document.readyState === 'complete') renderMath();
  else window.addEventListener('load', renderMath);
}

main();
