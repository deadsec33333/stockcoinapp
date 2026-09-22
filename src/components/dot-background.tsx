"use client";

import { useEffect, useRef } from 'react';

// Halftone / dithered dot background with a subtle holo shift (mouse + scroll).
// Performance: every ring is rendered ONCE into its own small sprite. Each frame only
// blits those sprites (cheap GPU copies) and lays one light-streak + one glow gradient on top.
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
const GAP_DESKTOP = 5, GAP_MOBILE = 6;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
const STOPS: [number, number, number][] = [[31, 43, 255], [106, 61, 255], [176, 107, 255], [215, 123, 255], [63, 217, 255], [120, 200, 255], [46, 91, 255], [31, 43, 255]];
function mix(t: number): [number, number, number] {
  t = ((t % 1) + 1) % 1; const f = t * (STOPS.length - 1); const i = Math.floor(f); const k = f - i;
  const a = STOPS[i], b = STOPS[i + 1];
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}
const hash = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };

type Sprite = { canvas: HTMLCanvasElement; w: number; h: number; ox: number; oy: number };

function buildSprite(r: Ring, gap: number, dpr: number, dark: boolean, seed: number): Sprite {
  const pad = r.t * 3;
  const cells = Math.ceil((r.r + pad) / gap);
  const w = cells * 2 * gap, h = Math.ceil((r.r * r.squash + pad) / gap) * 2 * gap;
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * dpr); c.height = Math.ceil(h * dpr);
  const ctx = c.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cx = w / 2, cy = h / 2;
  const cols = w / gap, rows = h / gap;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x = i * gap + gap / 2, y = j * gap + gap / 2;
      const dx = x - cx, dy = (y - cy) / r.squash; const d = Math.hypot(dx, dy);
      const e = (d - r.r) / r.t; if (e > 3 || e < -3) continue;
      const ang = Math.atan2(dy, dx);
      const cc = Math.cos(ang - r.a0);
      const arc = Math.max(0, .62 + .38 * cc) * (cc < -.55 ? Math.max(0, 1 + (cc + .55) * 2.2) : 1);
      const dens = Math.min(1, Math.exp(-e * e * 1.6) * Math.min(1, arc) * (dark ? 1.15 : 1.3));
      if (dens < .04) continue;
      const thr = BAYER[(j & 3) * 4 + (i & 3)] * .85 + hash(i + seed * 31, j) * .3 - .1;
      if (dens < thr) continue;
      const size = dens > .75 ? 3 : dens > .45 ? 2 : 1.4;
      const tone = (cc * -.5 + .5) * .8;
      const [cr, cg, cb] = mix(tone * .6 + (dx + dy * .6) / 900 + seed * .13);
      ctx.fillStyle = `rgba(${cr | 0},${cg | 0},${cb | 0},${dark ? .75 : .95})`;
      ctx.fillRect(x - size / 2, y - size / 2, size, size);
    }
  }
  return { canvas: c, w, h, ox: cx, oy: cy };
}

export function DotBackground() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!; const ctx = canvas.getContext('2d', { alpha: true })!;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mobile = matchMedia('(max-width: 760px)').matches;
    const GAP = mobile ? GAP_MOBILE : GAP_DESKTOP;
    let w = 0, h = 0, dpr = 1, raf = 0;
    let sprites: Sprite[] = []; let spriteKey = '';
    const mouse = { x: .5, y: .3, tx: .5, ty: .3 };
    let scroll = window.scrollY, drawnScroll = -1, shift = 0, shiftTarget = 0;
    const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark' || (!document.documentElement.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);

    const ensureSprites = () => {
      const dark = isDark();
      const key = `${dpr}|${dark}|${GAP}`;
      if (key === spriteKey) return;
      spriteKey = key;
      sprites = RINGS.map((r, n) => buildSprite(r, GAP, dpr, dark, n));
    };
    const resize = () => {
      dpr = Math.min(1.5, devicePixelRatio || 1); w = innerWidth; h = innerHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ensureSprites(); draw();
    };

    function draw() {
      const dark = isDark();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, w, h);
      const mdx = (mouse.x - .5), mdy = (mouse.y - .5);
      let any = false;
      for (let n = 0; n < RINGS.length; n++) {
        const r = RINGS[n], s = sprites[n];
        const cx = r.x * w + mdx * 30 * r.depth;
        const cy = r.y * h - scroll * r.depth + mdy * 20 * r.depth;
        if (cy + s.h / 2 < 0 || cy - s.h / 2 > h || cx + s.w / 2 < 0 || cx - s.w / 2 > w) continue;
        // snap to the dot grid so every ring stays aligned to the same pixel grid
        const x0 = Math.round((cx - s.ox) / GAP) * GAP, y0 = Math.round((cy - s.oy) / GAP) * GAP;
        ctx.drawImage(s.canvas, x0, y0, s.w, s.h);
        any = true;
      }
      if (!any) return;
      // holo light: a moving streak and a soft glow at the cursor, painted only onto existing dots
      ctx.globalCompositeOperation = 'source-atop';
      const pos = ((shift * 1.6) % 1 + 1) % 1;
      const g = ctx.createLinearGradient(0, 0, w, h * .6);
      const a = Math.max(0, pos - .06), b = pos, c = Math.min(1, pos + .06);
      g.addColorStop(0, 'rgba(235,248,255,0)'); g.addColorStop(a, 'rgba(235,248,255,0)');
      g.addColorStop(b, `rgba(235,248,255,${dark ? .55 : .7})`);
      g.addColorStop(c, 'rgba(235,248,255,0)'); g.addColorStop(1, 'rgba(235,248,255,0)');
      // only paint the band where the streak actually is
      const bandX = pos * w, bandW = w * .35;
      ctx.fillStyle = g; ctx.fillRect(Math.max(0, bandX - bandW), 0, bandW * 2, h);
      const rg = ctx.createRadialGradient(mouse.x * w, mouse.y * h, 0, mouse.x * w, mouse.y * h, 260);
      rg.addColorStop(0, 'rgba(160,230,255,.45)'); rg.addColorStop(1, 'rgba(160,230,255,0)');
      ctx.fillStyle = rg; ctx.fillRect(mouse.x * w - 260, mouse.y * h - 260, 520, 520);
      ctx.globalCompositeOperation = 'source-over';
    }

    function tick() {
      raf = 0;
      if (document.hidden) return;
      mouse.x += (mouse.tx - mouse.x) * .1; mouse.y += (mouse.ty - mouse.y) * .1;
      shift += (shiftTarget - shift) * .08;
      draw(); drawnScroll = scroll;
      const settling = Math.abs(mouse.tx - mouse.x) + Math.abs(mouse.ty - mouse.y) + Math.abs(shiftTarget - shift) > .0008;
      if (settling) raf = requestAnimationFrame(tick);
    }
    const wake = () => { if (!raf) raf = requestAnimationFrame(tick); };
    const target = () => { shiftTarget = (mouse.tx - .5) * .35 + (mouse.ty - .5) * .2 + scroll * .00035; };
    const onMove = (e: PointerEvent) => { mouse.tx = e.clientX / w; mouse.ty = e.clientY / h; target(); wake(); };
    const onScroll = () => { scroll = window.scrollY; target(); if (scroll !== drawnScroll) wake(); };

    resize();
    addEventListener('resize', resize);
    addEventListener('scroll', onScroll, { passive: true });
    if (!reduced) addEventListener('pointermove', onMove, { passive: true });
    const themeObs = new MutationObserver(() => { ensureSprites(); draw(); });
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { if (raf) cancelAnimationFrame(raf); removeEventListener('resize', resize); removeEventListener('scroll', onScroll); removeEventListener('pointermove', onMove); themeObs.disconnect(); };
  }, []);
  return <canvas ref={ref} className="dot-background" aria-hidden="true" />;
}
