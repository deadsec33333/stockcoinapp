"use client";

import { useEffect } from 'react';

/**
 * "Jelly scroll": while you scroll, each block on the page trails behind on its own spring,
 * then catches up with a soft overshoot. When scrolling stops everything settles back in place.
 * Pure transform/position offsets driven by one requestAnimationFrame loop.
 */
const SELECTORS = [
  '.hero-eyebrow', '.hero-title .headline-line', '.hero-subtitle', '.hero-actions',
  '.hero-coin', '.label-left', '.label-right', '.post-composer',
  '.stat', '.section-heading h2', '.section-heading .eyebrow', '.section-heading .text-link', '.feed-meta',
  '.launch-card', '.empty-state',
  '.center-heading .eyebrow', '.center-heading h2', '.center-heading p', '.step', '.center-link',
  '.closing .eyebrow', '.closing h2', '.closing p', '.closing .button', '.pair-visual > span',
];
// elements that already use `translate` for their float animation get a `top`/`margin-top` offset instead
const USE_TOP = new Set(['hero-coin']);
const USE_MARGIN = new Set(['label-left', 'label-right']);

type Item = { el: HTMLElement; y: number; v: number; k: number; c: number; lag: number; mode: 'translate' | 'top' | 'margin'; visible: boolean };
const rand = (n: number) => { const s = Math.sin(n * 91.345 + 7.13) * 43758.5453; return s - Math.floor(s); };

export function JellyScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const mobile = window.matchMedia('(max-width: 760px)').matches;
    const root = document.getElementById('main') ?? document.body;
    let items: Item[] = [];
    let raf = 0; let last = window.scrollY; let lastT = performance.now();

    const io = new IntersectionObserver(entries => {
      for (const e of entries) { const it = items.find(i => i.el === e.target); if (it) it.visible = e.isIntersecting; }
    }, { rootMargin: '200px 0px' });

    const collect = () => {
      const found = new Set<HTMLElement>();
      SELECTORS.forEach(sel => root.querySelectorAll<HTMLElement>(sel).forEach(el => found.add(el)));
      // drop removed, keep existing state
      items = items.filter(i => { if (found.has(i.el) && i.el.isConnected) return true; io.unobserve(i.el); reset(i); return false; });
      let n = items.length;
      found.forEach(el => {
        if (items.some(i => i.el === el)) return;
        const r1 = rand(n), r2 = rand(n + 17), r3 = rand(n + 41); n++;
        const cls = el.classList;
        const mode = [...cls].some(c => USE_TOP.has(c)) ? 'top' : [...cls].some(c => USE_MARGIN.has(c)) ? 'margin' : 'translate';
        if (mode === 'top') el.style.position = 'relative';
        items.push({
          el, y: 0, v: 0,
          k: 150 + r1 * 130,            // spring stiffness: each block settles at its own pace
          c: 11 + r2 * 7,              // damping: low enough for a small overshoot
          lag: (mobile ? .35 : .55) + r3 * .45, // how much it trails behind the scroll
          mode, visible: true,
        });
        io.observe(el);
      });
    };
    const apply = (i: Item) => {
      const y = Math.abs(i.y) < .05 ? 0 : i.y;
      const px = `${y.toFixed(2)}px`;
      if (i.mode === 'translate') i.el.style.translate = y ? `0 ${px}` : '';
      else if (i.mode === 'top') i.el.style.top = y ? px : '';
      else i.el.style.marginTop = y ? px : '';
    };
    const reset = (i: Item) => { i.y = 0; i.v = 0; apply(i); };

    const tick = (t: number) => {
      raf = 0;
      const dt = Math.min(1 / 30, (t - lastT) / 1000); lastT = t;
      const sy = window.scrollY; const dy = sy - last; last = sy;
      const max = mobile ? 18 : 34;
      let moving = false;
      for (const i of items) {
        if (!i.visible) { if (i.y) reset(i); continue; }
        i.y += dy * i.lag * .45;                       // page moved: this block trails behind
        i.y = Math.max(-max, Math.min(max, i.y));
        const a = -i.k * i.y - i.c * i.v;              // spring pulls it back into place
        i.v += a * dt; i.y += i.v * dt;
        if (Math.abs(i.y) > .05 || Math.abs(i.v) > .5) moving = true; else { i.y = 0; i.v = 0; }
        apply(i);
      }
      if (moving || dy !== 0) raf = requestAnimationFrame(tick);
    };
    const wake = () => { if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(tick); } };

    collect();
    const mo = new MutationObserver(() => collect());
    mo.observe(root, { childList: true, subtree: true });
    window.addEventListener('scroll', wake, { passive: true });
    return () => {
      window.removeEventListener('scroll', wake); mo.disconnect(); io.disconnect();
      if (raf) cancelAnimationFrame(raf);
      items.forEach(reset);
    };
  }, []);
  return null;
}
