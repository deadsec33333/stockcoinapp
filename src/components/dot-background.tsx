"use client";

import { useEffect, useRef } from 'react';

// Halftone / dithered dot background with a subtle holo shift (mouse + scroll).
type Ring = { x: number; y: number; r: number; t: number; squash: number; a0: number; depth: number };
const RINGS: Ring[] = [
  // x: fraction of width, y: fraction of first screen heights (page coords), r/t in px
  { x: .06, y: .25, r: 260, t: 46, squash: .92, a0: 2.4, depth: .5 },
  { x: .08, y: .55, r: 150, t: 34, squash: .95, a0: 2.2, depth: .7 },
  { x: .36, y: .12, r: 95, t: 26, squash: 1, a0: 2.6, depth: .9 },
  { x: .63, y: .05, r: 120, t: 30, squash: .9, a0: .5, depth: .6 },
  { x: .47, y: .95, r: 190, t: 40, squash: .8, a0: 2.0, depth: .8 },
  { x: .47, y: 1.05, r: 90, t: 26, squash: .9, a0: 2.1, depth: 1 },
  { x: .88, y: .75, r: 170, t: 36, squash: .95, a0: .2, depth: .7 },
  { x: .97, y: .55, r: 230, t: 44, squash: .9, a0: -.3, depth: .5 },
  { x: .15, y: 1.7, r: 210, t: 42, squash: .85, a0: 2.8, depth: .6 },
  { x: .8, y: 1.9, r: 240, t: 46, squash: .9, a0: .8, depth: .55 },
  { x: .5, y: 2.6, r: 180, t: 38, squash: .9, a0: 1.6, depth: .7 },
  { x: .05, y: 3.1, r: 200, t: 40, squash: .9, a0: 2.2, depth: .6 },
  { x: .9, y: 3.4, r: 220, t: 44, squash: .9, a0: .4, depth: .6 },
  { x: .38, y: 1.45, r: 130, t: 30, squash: .9, a0: 1.2, depth: .9 },
  { x: .98, y: 1.35, r: 160, t: 34, squash: .9, a0: 3.0, depth: .7 },
  { x: .62, y: 2.2, r: 110, t: 28, squash: .95, a0: 2.4, depth: .9 },
  { x: .02, y: 2.35, r: 170, t: 36, squash: .9, a0: .1, depth: .7 },
  { x: .35, y: 3.7, r: 150, t: 32, squash: .9, a0: 2.9, depth: .8 },
  { x: .7, y: 4.1, r: 200, t: 40, squash: .9, a0: 1.0, depth: .6 },
  { x: .1, y: 4.5, r: 230, t: 44, squash: .9, a0: 2.5, depth: .55 },
  { x: .92, y: 4.9, r: 180, t: 38, squash: .9, a0: .6, depth: .7 },
  { x: .45, y: 5.3, r: 210, t: 42, squash: .9, a0: 1.9, depth: .6 },
];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
// mint -> aqua -> holo blue -> violet (holo palette blended in)
const STOPS: [number, number, number][] = [[31, 43, 255], [106, 61, 255], [176, 107, 255], [215, 123, 255], [63, 217, 255], [120, 200, 255], [46, 91, 255], [31, 43, 255]];
function mix(t: number): [number, number, number] {
  t = ((t % 1) + 1) % 1; const f = t * (STOPS.length - 1); const i = Math.floor(f); const k = f - i;
  const a = STOPS[i], b = STOPS[i + 1];
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}
const hash = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };

export function DotBackground() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!; const ctx = canvas.getContext('2d')!;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mobile = matchMedia('(max-width: 760px)').matches;
    const GAP = mobile ? 6 : 5;
    let w = 0, h = 0, dpr = 1, raf = 0, dirty = true;
    const mouse = { x: .5, y: .3, tx: .5, ty: .3 };
    let scroll = window.scrollY, shift = 0, shiftTarget = 0, idle = 0;
    const resize = () => { dpr = Math.min(2, devicePixelRatio || 1); w = innerWidth; h = innerHeight; canvas.width = w * dpr; canvas.height = h * dpr; canvas.style.width = w + 'px'; canvas.style.height = h + 'px'; dirty = true; };
    const dark = () => document.documentElement.getAttribute('data-theme') === 'dark' || (!document.documentElement.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);

    function draw() {
      const isDark = dark();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      const cols = Math.ceil(w / GAP), rows = Math.ceil(h / GAP);
      const vh = h; const mx = mouse.x * w, my = mouse.y * h;
      // base grid
      ctx.fillStyle = isDark ? 'rgba(106,61,255,.18)' : 'rgba(106,61,255,.26)';
      for (let j = 0; j < rows; j += 2) for (let i = 0; i < cols; i += 2) ctx.fillRect(i * GAP, j * GAP, 1, 1);
      const buckets = new Map<string, number[]>();
      const rings = RINGS.map(r => ({ ...r, cx: r.x * w + (mouse.x - .5) * 30 * r.depth, cy: r.y * vh - scroll * r.depth + (mouse.y - .5) * 20 * r.depth, rot: r.a0 + idle * .02 * r.depth + scroll * .0004 * r.depth }))
        .filter(r => r.cy + r.r + 80 > 0 && r.cy - r.r - 80 < h);
      if (!rings.length) return;
      for (let j = 0; j < rows; j++) {
        const y = j * GAP;
        for (let i = 0; i < cols; i++) {
          const x = i * GAP;
          let best = 0, tone = 0;
          for (const r of rings) {
            const dx = x - r.cx, dy = (y - r.cy) / r.squash; const d = Math.hypot(dx, dy);
            const e = (d - r.r) / r.t; if (e > 3 || e < -3) continue;
            const ang = Math.atan2(dy, dx);
            const c = Math.cos(ang - r.rot);
            const arc = Math.max(0, .62 + .38 * c) * (c < -.55 ? Math.max(0, 1 + (c + .55) * 2.2) : 1); // crescent: dense top, thinning tail, open gap
            const v = Math.exp(-e * e * 1.6) * Math.min(1, arc);
            if (v > best) { best = v; tone = (c * -.5 + .5) * .8; }
          }
          if (best < .04) continue;
          const glow = Math.max(0, 1 - Math.hypot(x - mx, y - my) / 260) * .35;
          const dens = Math.min(1, best * (isDark ? 1.15 : 1.3) + glow * best);
          const thr = BAYER[(j & 3) * 4 + (i & 3)] * .85 + hash(i, j) * .3 - .1;
          if (dens < thr) continue;
          const size = dens > .75 ? 3 : dens > .45 ? 2 : 1.4;
          // iridescence: colour depends on angle on the ring, a diagonal band across the screen, and the light (mouse/scroll)
          const band = (x + y * .6) / (w * .55);
          let [cr, cg, cb] = mix(tone * .6 + band + shift * 2.2);
          // moving light streak: dots inside it flash toward white/cyan like foil catching light
          const streak = Math.abs(((band * .9 - shift * 3.2) % 1 + 1) % 1 - .5);
          const flash = Math.max(0, 1 - streak / .07) * .75 + glow * 1.2;
          if (flash > 0) { cr += (235 - cr) * Math.min(1, flash); cg += (248 - cg) * Math.min(1, flash); cb += (255 - cb) * Math.min(1, flash) * .6; }
          const a = isDark ? Math.min(1, .6 + glow + flash * .3) : .95;
          const key = `${Math.round(cr / 12) * 12},${Math.round(cg / 12) * 12},${Math.round(cb / 12) * 12},${a.toFixed(1)}`;
          let arr = buckets.get(key); if (!arr) buckets.set(key, arr = []);
          arr.push(x - size / 2 + GAP / 2, y - size / 2 + GAP / 2, size);
        }
      }
      for (const [key, arr] of buckets) {
        const [r, g, b, a] = key.split(',');
        ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
        for (let k = 0; k < arr.length; k += 3) ctx.fillRect(arr[k], arr[k + 1], arr[k + 2], arr[k + 2]);
      }
    }
    function tick() {
      raf = requestAnimationFrame(tick);
      if (document.hidden) return;
      const ease = .08;
      const moved = Math.abs(mouse.tx - mouse.x) + Math.abs(mouse.ty - mouse.y) + Math.abs(shiftTarget - shift) > .0005;
      mouse.x += (mouse.tx - mouse.x) * ease; mouse.y += (mouse.ty - mouse.y) * ease;
      shift += (shiftTarget - shift) * .06;
      if (!reduced) idle += mobile ? .5 : 1;
      if (moved || dirty || (!reduced && Math.round(idle) % (mobile ? 4 : 2) === 0)) { draw(); dirty = false; }
    }
    const onMove = (e: PointerEvent) => { mouse.tx = e.clientX / w; mouse.ty = e.clientY / h; shiftTarget = (mouse.tx - .5) * .35 + (mouse.ty - .5) * .2 + scroll * .00035; };
    const onScroll = () => { scroll = window.scrollY; shiftTarget = (mouse.tx - .5) * .35 + (mouse.ty - .5) * .2 + scroll * .00035; dirty = true; };
    resize(); draw();
    addEventListener('resize', resize); addEventListener('scroll', onScroll, { passive: true });
    if (!reduced) { addEventListener('pointermove', onMove, { passive: true }); raf = requestAnimationFrame(tick); }
    const themeObs = new MutationObserver(() => { dirty = true; if (reduced) draw(); });
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', resize); removeEventListener('scroll', onScroll); removeEventListener('pointermove', onMove); themeObs.disconnect(); };
  }, []);
  return <canvas ref={ref} className="dot-background" aria-hidden="true" />;
}
