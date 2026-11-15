/** Entry point for the algorithm tab. */

import {
  mountAlgorithmFigure, mountDereserveFigure, mountCostFigure,
} from './figures/algofig.js';
import { mountRunnerFigure } from './figures/runner.js';
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

mount('fig-a1-host', mountAlgorithmFigure);
mount('fig-a2-host', mountDereserveFigure);
mount('fig-a3-host', mountCostFigure);
mount('fig-a4-host', mountRunnerFigure);

renderMathWhenReady();
