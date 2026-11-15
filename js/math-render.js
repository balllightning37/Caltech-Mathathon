/**
 * Typesetting the maths on a page, reliably.
 *
 * KaTeX and its auto-render extension load from a CDN with `defer`, so
 * `window.renderMathInElement` may not exist yet when a page's entry module
 * first runs. The previous code checked once and silently gave up, which
 * left the raw \(...\) source on the page with no error anywhere. This
 * retries until KaTeX appears, and also runs once on `load`.
 *
 * Repeated calls are safe: `.katex` is in `ignoredClasses`, so a subtree
 * that has already been typeset is skipped rather than re-parsed. (KaTeX
 * keeps the original TeX in an <annotation>, which a second pass would
 * otherwise try to interpret.)
 */

const CONFIG = {
  delimiters: [
    { left: '\\[', right: '\\]', display: true },
    { left: '\\(', right: '\\)', display: false },
  ],
  throwOnError: false,
  ignoredClasses: ['mono', 'katex'],
};

/** Typeset `root` now. Returns false if KaTeX is not loaded yet. */
export function renderMath(root = document.body) {
  if (typeof window.renderMathInElement !== 'function') return false;
  try {
    window.renderMathInElement(root, CONFIG);
  } catch (err) {
    console.error('KaTeX rendering failed', err);
  }
  return true;
}

/**
 * Typeset as soon as KaTeX is available, however the load happens to be
 * ordered. Polls briefly, and re-runs on `load` to catch anything a page
 * added after the first pass.
 */
export function renderMathWhenReady(root = document.body) {
  const done = renderMath(root);

  if (!done) {
    let tries = 0;
    const timer = setInterval(() => {
      // ~5 s of patience, then stop: the CDN is genuinely unreachable.
      if (renderMath(root) || ++tries > 100) clearInterval(timer);
    }, 50);
  }

  if (document.readyState !== 'complete') {
    window.addEventListener('load', () => renderMath(root), { once: true });
  }
}
