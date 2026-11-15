/** Entry point for the "Understanding the problem" tab. */

import { mountInstanceFigure, mountCoreFigure } from './figures/basics.js';
import { renderMathWhenReady } from './math-render.js';

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

mount('fig-1-host', (host) => mountInstanceFigure(host, { num: 1 }));
mount('fig-2-host', (host) => mountCoreFigure(host, { num: 2 }));

renderMathWhenReady();
