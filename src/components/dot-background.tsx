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

// ---- performance helpers (same look as before, far less work per frame) ----

// the stockcoin mark (three rising bars, tilted) scattered through the same dot field
type Mark = { x: number; y: number; size: number; rot: number; depth: number };
const MARKS: Mark[] = [
  { x: .22, y: .38, size: 112, rot: .42, depth: .8 },
  { x: .54, y: .72, size: 141, rot: .45, depth: .6 },
  { x: .86, y: 1.48, size: 129, rot: .48, depth: .65 },
  { x: .68, y: 2.35, size: 153, rot: .34, depth: .6 },
  { x: .9, y: 3.1, size: 89, rot: .38, depth: .85 },
  { x: .74, y: 4.3, size: 98, rot: .33, depth: .8 },
];
// bar layout in the mark's own units (width 21, height 25), same proportions as the logo
const BARS: [number, number][] = [[0, 12], [8, 19], [16, 25]]; // [left, height]
const BAR_W = 5, MARK_W = 21, MARK_H = 25;
const PAL_N = 1024;
const PAL = (() => { const a = new Float32Array(PAL_N * 3); for (let i = 0; i < PAL_N; i++) { const [r, g, b] = mix(i / PAL_N); a[i * 3] = r; a[i * 3 + 1] = g; a[i * 3 + 2] = b; } return a; })();
const EXP_N = 512; // exp(-e*e*1.6) for e in [-3, 3]
const EXP = (() => { const a = new Float32Array(EXP_N + 1); for (let i = 0; i <= EXP_N; i++) { const e = -3 + 6 * i / EXP_N; a[i] = Math.exp(-e * e * 1.6); } return a; })();

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
    // reusable buffers
    let cols = 0, rows = 0;
    let best = new Float32Array(0), toneBuf = new Float32Array(0); let markMask = new Uint8Array(0);
    const buckets = new Map<number, number[]>();
    const styleCache = new Map<number, string>();
    let gridPattern: CanvasPattern | null = null; let gridKey = '';
    const HASH = new Float32Array(64 * 64); for (let j = 0; j < 64; j++) for (let i = 0; i < 64; i++) HASH[j * 64 + i] = hash(i, j);

    const resize = () => {
      dpr = Math.min(2, devicePixelRatio || 1); w = innerWidth; h = innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr; canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      cols = Math.ceil(w / GAP); rows = Math.ceil(h / GAP);
      best = new Float32Array(cols * rows); toneBuf = new Float32Array(cols * rows); markMask = new Uint8Array(cols * rows);
      dirty = true;
    };
    const dark = () => document.documentElement.getAttribute('data-theme') === 'dark' || (!document.documentElement.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
    const gridFill = (isDark: boolean) => {
      const key = `${isDark}`;
      if (gridPattern && key === gridKey) return gridPattern;
      const tile = document.createElement('canvas'); tile.width = GAP * 2; tile.height = GAP * 2;
      const t = tile.getContext('2d')!; t.fillStyle = isDark ? 'rgba(106,61,255,.18)' : 'rgba(106,61,255,.26)'; t.fillRect(0, 0, 1, 1);
      gridPattern = ctx.createPattern(tile, 'repeat'); gridKey = key; return gridPattern;
    };

    function draw() {
      const isDark = dark();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      const mx = mouse.x * w, my = mouse.y * h;
      // base grid: one pattern fill instead of thousands of tiny rects
      ctx.imageSmoothingEnabled = false;
      const pat = gridFill(isDark); if (pat) { ctx.fillStyle = pat; ctx.fillRect(0, 0, w, h); }
      best.fill(0); markMask.fill(0);
      let any = false;
      // logo marks: same dots, same dither, just a different shape
      for (const M of MARKS) {
        const sc = M.size / MARK_H;
        const cx = M.x * w + (mouse.x - .5) * 30 * M.depth;
        const bob = Math.sin(idle * .02 + M.x * 9 + M.y * 3) * 7 * M.depth; // soft bounce
        const cy = M.y * h - scroll * M.depth + (mouse.y - .5) * 20 * M.depth + bob;
        const reach = M.size * .9;
        if (cy + reach < 0 || cy - reach > h) continue;
        any = true;
        const rot = M.rot; // the logo never spins
        const cR = Math.cos(-rot), sR = Math.sin(-rot);
        const i0 = Math.max(0, Math.floor((cx - reach) / GAP)), i1 = Math.min(cols - 1, Math.ceil((cx + reach) / GAP));
        const j0 = Math.max(0, Math.floor((cy - reach) / GAP)), j1 = Math.min(rows - 1, Math.ceil((cy + reach) / GAP));
        const feather = Math.max(1.5, .8 * sc), radius = 1.6 * sc, halfW = BAR_W * sc / 2;
        for (let j = j0; j <= j1; j++) {
          const py = j * GAP - cy; const row = j * cols;
          for (let i = i0; i <= i1; i++) {
            const px = i * GAP - cx;
            // into the mark's own (unrotated) space, origin at its centre
            const lx = px * cR - py * sR + MARK_W * sc / 2, ly = px * sR + py * cR + MARK_H * sc / 2;
            if (lx < -feather || lx > MARK_W * sc + feather || ly < -feather || ly > MARK_H * sc + feather) continue;
            let near = 1e9, tone = 0;
            for (let bi = 0; bi < 3; bi++) {
              const [bx, bh] = BARS[bi];
              const ccx = (bx + BAR_W / 2) * sc, ccy = (MARK_H - bh / 2) * sc;
              const qx = Math.max(Math.abs(lx - ccx) - (halfW - radius), 0);
              const qy = Math.max(Math.abs(ly - ccy) - (bh * sc / 2 - radius), 0);
              const d = Math.sqrt(qx * qx + qy * qy) - radius;
              if (d < near) { near = d; tone = .18 + bi * .22; }
            }
            if (near > feather + 3 * GAP) continue;
            if (near > feather) { markMask[row + i] = 1; continue; } // halo around the logo
            const v = near <= 0 ? .95 : .95 * (1 - near / feather);
            const k = row + i;
            best[k] = v; toneBuf[k] = tone;
            markMask[k] = 1; // this cell belongs to the logo: rings keep away
          }
        }
      }
      // each ring only visits the cells inside its own bounding box
      for (const R of RINGS) {
        const cx = R.x * w + (mouse.x - .5) * 30 * R.depth;
        const cy = R.y * h - scroll * R.depth + (mouse.y - .5) * 20 * R.depth;
        if (!(cy + R.r + 80 > 0 && cy - R.r - 80 < h)) continue;
        any = true;
        const rot = R.a0 + idle * .02 * R.depth + scroll * .0004 * R.depth;
        const cR = Math.cos(rot), sR = Math.sin(rot);
        const outer = R.r + 3 * R.t, inner = Math.max(0, R.r - 3 * R.t);
        const o2 = outer * outer, i2 = inner * inner;
        const i0 = Math.max(0, Math.floor((cx - outer) / GAP)), i1 = Math.min(cols - 1, Math.ceil((cx + outer) / GAP));
        const j0 = Math.max(0, Math.floor((cy - outer * R.squash) / GAP)), j1 = Math.min(rows - 1, Math.ceil((cy + outer * R.squash) / GAP));
        const invT = 1 / R.t, invSq = 1 / R.squash;
        for (let j = j0; j <= j1; j++) {
          const dy = (j * GAP - cy) * invSq; const dy2 = dy * dy;
          if (dy2 > o2) continue;
          const row = j * cols;
          for (let i = i0; i <= i1; i++) {
            const dx = i * GAP - cx; const d2 = dx * dx + dy2;
            if (d2 > o2 || d2 < i2) continue;
            const d = Math.sqrt(d2);
            const e = (d - R.r) * invT;
            const c = d > 0 ? (dx * cR + dy * sR) / d : 1;           // cos(angle - rot) without atan2
            const arc = Math.max(0, .62 + .38 * c) * (c < -.55 ? Math.max(0, 1 + (c + .55) * 2.2) : 1);
            const v = EXP[Math.round((e + 3) / 6 * EXP_N)] * Math.min(1, arc);
            const k = row + i;
            if (markMask[k]) continue; // a logo owns this spot, rings never overlap it
            if (v > best[k]) { best[k] = v; toneBuf[k] = (c * -.5 + .5) * .8; }
          }
        }
      }
      if (!any) return;
      for (const arr of buckets.values()) arr.length = 0;
      const invBand = 1 / (w * .55), dens0 = isDark ? 1.15 : 1.3, inv260 = 1 / 260;
      for (let j = 0; j < rows; j++) {
        const y = j * GAP; const row = j * cols;
        for (let i = 0; i < cols; i++) {
          const bv = best[row + i]; if (bv < .04) continue;
          const x = i * GAP;
          const gd = Math.sqrt((x - mx) * (x - mx) + (y - my) * (y - my));
          const glow = gd < 260 ? (1 - gd * inv260) * .35 : 0;
          const dens = Math.min(1, bv * dens0 + glow * bv);
          const thr = BAYER[(j & 3) * 4 + (i & 3)] * .85 + HASH[(j & 63) * 64 + (i & 63)] * .3 - .1;
          if (dens < thr) continue;
          const size = dens > .75 ? 3 : dens > .45 ? 2 : 1.4;
          const band = (x + y * .6) * invBand;
          let t = toneBuf[row + i] * .6 + band + shift * 2.2; t = t - Math.floor(t);
          const pi = Math.min(PAL_N - 1, (t * PAL_N) | 0) * 3;
          let cr = PAL[pi], cg = PAL[pi + 1], cb = PAL[pi + 2];
          let s = band * .9 - shift * 3.2; s = s - Math.floor(s);
          const streak = Math.abs(s - .5);
          const flash = Math.max(0, 1 - streak / .07) * .75 + glow * 1.2;
          if (flash > 0) { const f = Math.min(1, flash); cr += (235 - cr) * f; cg += (248 - cg) * f; cb += (255 - cb) * f * .6; }
          const a = isDark ? Math.min(1, .6 + glow + flash * .3) : .95;
          const qa = Math.round(a * 10);
          const key = ((Math.round(cr / 12) * 32 + Math.round(cg / 12)) * 32 + Math.round(cb / 12)) * 16 + qa;
          let arr = buckets.get(key); if (!arr) buckets.set(key, arr = []);
          arr.push(x - size / 2 + GAP / 2, y - size / 2 + GAP / 2, size);
        }
      }
      for (const [key, arr] of buckets) {
        if (!arr.length) continue;
        let style = styleCache.get(key);
        if (!style) {
          const qa = key % 16, rest = (key - qa) / 16, qb = rest % 32, rest2 = (rest - qb) / 32, qg = rest2 % 32, qr = (rest2 - qg) / 32;
          style = `rgba(${qr * 12},${qg * 12},${qb * 12},${(qa / 10).toFixed(1)})`; styleCache.set(key, style);
        }
        ctx.fillStyle = style;
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
