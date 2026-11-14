/** Small DOM / SVG helpers shared by the figures. */

const SVGNS = 'http://www.w3.org/2000/svg';

/** Create an SVG element with attributes; children may be nodes or strings. */
export function s(tag, attrs = {}, children = []) {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined) continue;
    el.setAttribute(k, String(v));
  }
  for (const c of [].concat(children)) {
    el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return el;
}

/** Create an HTML element. */
export function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, String(v));
  }
  for (const c of [].concat(children)) {
    if (c === null || c === undefined) continue;
    el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return el;
}

export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

/**
 * SVG canvas with a fixed viewBox. It scales down to its container but
 * never below `minW`, so the small mono labels stay legible; the figure
 * body scrolls horizontally instead (see `.figscroll`).
 */
export function canvas(w, hgt, cls = '') {
  const minW = Math.min(w, 520);
  return s('svg', {
    viewBox: `0 0 ${w} ${hgt}`,
    width: w, height: hgt,
    class: cls,
    style: `width:100%;max-width:${w}px;min-width:${minW}px;height:auto;`,
    role: 'img',
  });
}

/* ------------------------------------------------------- number formatting */

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

/**
 * Render a number as a small fraction when it is close to one with a
 * denominator up to `maxDen`, otherwise as a decimal. Keeps the diagrams
 * readable with values like 5/18 and 5/24.
 */
export function frac(x, maxDen = 60, places = 3) {
  if (!isFinite(x)) return '--';
  if (Math.abs(x) < 1e-12) return '0';
  if (Math.abs(x - Math.round(x)) < 1e-12) return String(Math.round(x));
  for (let den = 2; den <= maxDen; den++) {
    const num = x * den;
    if (Math.abs(num - Math.round(num)) < 1e-9) {
      const nn = Math.round(num);
      const g = gcd(Math.abs(nn), den);
      return `${nn / g}/${den / g}`;
    }
  }
  return x.toFixed(places);
}

export const dec = (x, p = 3) => (isFinite(x) ? x.toFixed(p) : '--');

/* ------------------------------------------------------------- components */

export function button(label, onClick, { cls = '', title = '' } = {}) {
  return h('button', { class: cls, title, onclick: onClick, text: label });
}

/** A labelled range slider that reports its value through `onInput`. */
export function slider({ label, min, max, step, value, onInput, format = dec }) {
  const out = h('span', { class: 'readout', text: format(value) });
  const input = h('input', {
    type: 'range', min, max, step, value,
    oninput: (e) => { const v = parseFloat(e.target.value); out.textContent = format(v); onInput(v); },
  });
  const wrap = h('span', { class: 'slider' }, [h('label', { text: label }), input, out]);
  wrap.setValue = (v) => { input.value = v; out.textContent = format(v); };
  return wrap;
}

/** A segmented group of mutually exclusive buttons. */
export function segmented(options, active, onPick) {
  const wrap = h('span', { class: 'seg' });
  const btns = options.map((o) =>
    h('button', {
      class: o.value === active ? 'on' : '',
      text: o.label,
      title: o.title || '',
      onclick: () => {
        btns.forEach((b, j) => b.classList.toggle('on', options[j].value === o.value));
        onPick(o.value);
      },
    })
  );
  btns.forEach((b) => wrap.appendChild(b));
  return wrap;
}

export function pill(text, state = 'neutral') {
  return h('span', { class: `pill ${state}`, text });
}

export function legend(items) {
  return h('div', { class: 'legend' },
    items.map((it) => h('span', {}, [
      h('i', { style: `background:${it.fill};border-color:${it.line || 'rgba(0,0,0,.35)'}` }),
      it.label,
    ]))
  );
}

/** Figure scaffold: hairline frame + numbered caption. */
export function figure({ id, num, caption, body, controls = [] }) {
  const frame = h('div', { class: 'frame' });
  controls.forEach((c) => frame.appendChild(c));
  body.classList.add('figscroll');
  frame.appendChild(body);
  return h('figure', { id }, [
    frame,
    h('figcaption', {}, [
      h('span', { class: 'fignum', text: `Figure ${num}.` }),
      typeof caption === 'string' ? caption : caption,
    ]),
  ]);
}

/* ------------------------------------------------------------- SVG pieces */

/** Horizontal tick axis from 0 to max along y = y0, spanning [x0, x1]. */
export function xAxis(x0, x1, y0, max, ticks = 5, fmt = (v) => dec(v, 2)) {
  const g = s('g', { class: 'axis' });
  g.appendChild(s('line', { x1: x0, y1: y0, x2: x1, y2: y0 }));
  for (let t = 0; t <= ticks; t++) {
    const v = (max * t) / ticks;
    const x = x0 + ((x1 - x0) * t) / ticks;
    g.appendChild(s('line', { x1: x, y1: y0, x2: x, y2: y0 + 4 }));
    g.appendChild(s('text', { x, y: y0 + 15, class: 'tick', 'text-anchor': 'middle' }, fmt(v)));
  }
  return g;
}

/**
 * A data bar with 4px rounded ends at the far end only, anchored to the
 * baseline, per the mark spec. `dir` is 'up' or 'right'.
 */
export function bar({ x, y, w, hgt, fill, stroke, dir = 'up', r = 4 }) {
  const rr = Math.min(r, dir === 'up' ? w / 2 : hgt / 2, dir === 'up' ? hgt : w);
  if (rr <= 0.5 || (dir === 'up' ? hgt : w) <= 0.5) {
    return s('rect', { x, y, width: Math.max(w, 0), height: Math.max(hgt, 0), fill, stroke, 'stroke-width': stroke ? 1 : 0 });
  }
  let d;
  if (dir === 'up') {
    d = `M ${x} ${y + hgt} L ${x} ${y + rr} Q ${x} ${y} ${x + rr} ${y}`
      + ` L ${x + w - rr} ${y} Q ${x + w} ${y} ${x + w} ${y + rr}`
      + ` L ${x + w} ${y + hgt} Z`;
  } else {
    d = `M ${x} ${y} L ${x + w - rr} ${y} Q ${x + w} ${y} ${x + w} ${y + rr}`
      + ` L ${x + w} ${y + hgt - rr} Q ${x + w} ${y + hgt} ${x + w - rr} ${y + hgt}`
      + ` L ${x} ${y + hgt} Z`;
  }
  return s('path', { d, fill, stroke, 'stroke-width': stroke ? 1 : 0 });
}

/** Attach a lightweight hover tooltip to an SVG figure. */
export function tooltip(host) {
  const tip = h('div', {
    style: 'position:absolute;pointer-events:none;opacity:0;transition:opacity .12s;'
      + 'background:#000;color:#fff;font:400 11px/1.45 ui-monospace,Menlo,Consolas,monospace;'
      + 'padding:5px 8px;white-space:pre;z-index:20;max-width:260px;',
  });
  host.style.position = 'relative';
  host.appendChild(tip);
  return {
    show(text, ev) {
      tip.textContent = text;
      const r = host.getBoundingClientRect();
      const x = ev.clientX - r.left, y = ev.clientY - r.top;
      tip.style.opacity = '1';
      tip.style.left = `${Math.min(Math.max(x + 12, 4), r.width - tip.offsetWidth - 4)}px`;
      tip.style.top = `${Math.max(y - tip.offsetHeight - 8, 4)}px`;
    },
    hide() { tip.style.opacity = '0'; },
  };
}

/** Make an SVG node hoverable with a tooltip string. */
export function hoverable(node, tip, text) {
  node.style.cursor = 'default';
  node.addEventListener('mousemove', (e) => tip.show(text, e));
  node.addEventListener('mouseleave', () => tip.hide());
  return node;
}
