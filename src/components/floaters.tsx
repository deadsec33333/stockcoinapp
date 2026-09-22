'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { animate, motion, useInView, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { Piece, type PieceKind } from './pieces';

type Definition = { kind: PieceKind; depth: number; x: string; y: string; size: number };
type Preset = 'hero' | 'steps' | 'closing' | 'pairs' | 'coin' | 'not-found';
const fields: Record<Preset, Definition[]> = {
  hero: [
    { kind: 'coin', depth: .45, x: '8%', y: '22%', size: 36 },
    { kind: 'MSFTx', depth: .7, x: '90%', y: '20%', size: 64 },
    { kind: 'dollar', depth: .35, x: '22%', y: '82%', size: 32 },
    { kind: 'hash', depth: .6, x: '81%', y: '83%', size: 34 },
  ],
  steps: [
    { kind: 'dollar', depth: .5, x: '17%', y: '88%', size: 34 },
    { kind: 'hash', depth: .7, x: '50%', y: '86%', size: 32 },
    { kind: 'coin', depth: .4, x: '83%', y: '88%', size: 38 },
  ],
  closing: [
    { kind: 'AAPLx', depth: .4, x: '19%', y: '12%', size: 68 },
    { kind: 'TSLAx', depth: .7, x: '80%', y: '89%', size: 65 },
    { kind: 'NVDAx', depth: .5, x: '73%', y: '12%', size: 63 },
  ],
  pairs: [
    { kind: 'AAPLx', depth: .5, x: '75%', y: '14%', size: 68 },
    { kind: 'NVDAx', depth: .8, x: '87%', y: '49%', size: 70 },
    { kind: 'MSFTx', depth: .35, x: '73%', y: '85%', size: 64 },
  ],
  coin: [
    { kind: 'coin', depth: .45, x: '12%', y: '76%', size: 34 },
    { kind: 'hash', depth: .65, x: '34%', y: '78%', size: 30 },
  ],
  'not-found': [{ kind: 'coin', depth: .7, x: '50%', y: '73%', size: 52 }],
};

type FieldContext = { active: boolean; mobile: boolean; mouseX: MotionValue<number>; mouseY: MotionValue<number> };
const Context = createContext<FieldContext | null>(null);
const clampDepth = (depth: number) => Math.max(.3, Math.min(1, depth));
const pieceScale = (depth: number) => .65 + .35 * clampDepth(depth);

export function Floater({ depth, x, y, size, children, index = 0, height = size }: {
  depth: number; x: string; y: string; size: number; children: ReactNode; index?: number; height?: number;
}) {
  const field = useContext(Context);
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref);
  const reduced = useReducedMotion();
  const depthValue = clampDepth(depth);
  const bob = useMotionValue(0); const drift = useMotionValue(0); const rotation = useMotionValue(0);
  const fallbackX = useSpring(0, { stiffness: 65, damping: 20 });
  const fallbackY = useSpring(0, { stiffness: 65, damping: 20 });
  const [standaloneMobile, setStandaloneMobile] = useState(false);
  const mobile = field?.mobile ?? standaloneMobile;
  const px = useTransform(field?.mouseX ?? fallbackX, value => reduced || mobile ? 0 : value * depthValue * 20);
  const py = useTransform(field?.mouseY ?? fallbackY, value => reduced || mobile ? 0 : value * depthValue * 20);
  const controls = useRef<ReturnType<typeof animate>[]>([]);
  const active = field ? field.active : visible;
  useEffect(() => {
    if (field) return;
    const query = matchMedia('(max-width: 759px)');
    const sync = () => setStandaloneMobile(query.matches);
    sync(); query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, [field]);
  useEffect(() => {
    if (field || !active || mobile || reduced || !matchMedia('(hover: hover) and (pointer: fine)').matches) {
      fallbackX.set(0); fallbackY.set(0); return;
    }
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      fallbackX.set(Math.max(-1, Math.min(1, event.clientX / innerWidth * 2 - 1)));
      fallbackY.set(Math.max(-1, Math.min(1, event.clientY / innerHeight * 2 - 1)));
    };
    const reset = () => { fallbackX.set(0); fallbackY.set(0); };
    window.addEventListener('pointermove', move, { passive: true }); window.addEventListener('blur', reset);
    document.documentElement.addEventListener('pointerleave', reset);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('blur', reset); document.documentElement.removeEventListener('pointerleave', reset); };
  }, [field, active, mobile, reduced, fallbackX, fallbackY]);

  useEffect(() => {
    if (reduced) { bob.set(0); drift.set(0); rotation.set(0); return; }
    const amplitude = (8 + (depthValue - .3) / .7 * 10) * (mobile ? .35 : 1);
    // Deterministic per-piece timing avoids hydration differences and synced movement.
    const duration = 11.6 - (depthValue - .3) / .7 * 4.8 + (index % 4) * .12;
    const options = { duration, delay: index * .37, ease: 'easeInOut' as const, repeat: Infinity, repeatType: 'mirror' as const };
    controls.current = [
      animate(bob, [0, -amplitude, amplitude * .35], options),
      animate(drift, [0, (index % 2 ? -1 : 1) * amplitude * .35, 0], options),
      animate(rotation, [0, index % 2 ? -6 : 6, index % 2 ? 3 : -3], options),
    ];
    controls.current.forEach(control => control.pause());
    return () => controls.current.forEach(control => control.stop());
  }, [reduced, mobile, depthValue, index, bob, drift, rotation]);
  useEffect(() => { controls.current.forEach(control => active && !reduced ? control.play() : control.pause()); }, [active, reduced, mobile, depthValue, index]);

  return <div ref={ref} className="floater" style={{ left: x, top: y, width: size * pieceScale(depthValue) * (mobile ? .8 : 1), height: height * pieceScale(depthValue) * (mobile ? .8 : 1) }}>
    <motion.div className="floater-enter" initial={reduced ? false : { opacity: 0, y: 30 }} animate={active || reduced ? { opacity: .5 + (depthValue - .3) / .7 * .5, y: 0 } : undefined} transition={{ duration: reduced ? 0 : .7, delay: index * .06, ease: [.22, 1, .36, 1] }}>
      <motion.div className="floater-parallax" style={{ x: px, y: py }}>
        <motion.div className="floater-bob" style={{ x: drift, y: bob, rotate: rotation }}>{children}</motion.div>
      </motion.div>
    </motion.div>
  </div>;
}

type Box = { left: number; top: number; right: number; bottom: number };
type Position = { x: string; y: string } | null;
function intersects(a: Box, b: Box) { return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top; }

export function FloatField({ pieces }: { pieces: Definition[] | Preset }) {
  const definitions = typeof pieces === 'string' ? fields[pieces] : pieces;
  const ref = useRef<HTMLDivElement>(null);
  const active = useInView(ref, { amount: .05 });
  const reduced = useReducedMotion();
  const [mobile, setMobile] = useState(false);
  const [positions, setPositions] = useState<Position[]>([]);
  const mouseX = useSpring(0, { stiffness: 65, damping: 20 });
  const mouseY = useSpring(0, { stiffness: 65, damping: 20 });
  useEffect(() => {
    const query = matchMedia('(max-width: 759px)');
    const sync = () => setMobile(query.matches);
    sync(); query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);
  useEffect(() => {
    if (!active || mobile || reduced || !matchMedia('(hover: hover) and (pointer: fine)').matches) { mouseX.set(0); mouseY.set(0); return; }
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      mouseX.set(Math.max(-1, Math.min(1, event.clientX / innerWidth * 2 - 1)));
      mouseY.set(Math.max(-1, Math.min(1, event.clientY / innerHeight * 2 - 1)));
    };
    const reset = () => { mouseX.set(0); mouseY.set(0); };
    window.addEventListener('pointermove', move, { passive: true }); window.addEventListener('blur', reset);
    document.documentElement.addEventListener('pointerleave', reset);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('blur', reset); document.documentElement.removeEventListener('pointerleave', reset); };
  }, [active, mobile, reduced, mouseX, mouseY]);

  useEffect(() => {
    const layer = ref.current; const host = layer?.parentElement;
    if (!layer || !host) return;
    let frame = 0;
    function measure() {
      if (!layer || !host) return;
      const bounds = layer.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const obstacles: Box[] = [];
      const remember = (rect: DOMRect) => { if (rect.width && rect.height) obstacles.push({ left: rect.left - bounds.left, right: rect.right - bounds.left, top: rect.top - bounds.top, bottom: rect.bottom - bounds.top }); };
      // Measure printed text and complete interactive/card surfaces, not broad empty containers.
      const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        if (!node.textContent?.trim() || node.parentElement?.closest('.float-field, script, style, .sr-only')) continue;
        const range = document.createRange(); range.selectNodeContents(node);
        for (const rect of range.getClientRects()) remember(rect);
      }
      host.querySelectorAll('a, button, input, select, img, .hero-coin, .floating-label, .post-composer, .step, .coin-image, .coin-info, .pair-visual, .closing, .notice').forEach(element => {
        if (!element.closest('.float-field')) remember(element.getBoundingClientRect());
      });
      const reserved: Box[] = [];
      const next = definitions.map((piece, index): Position => {
        if (mobile && index > 1) return null;
        const depth = clampDepth(piece.depth);
        const scale = pieceScale(depth) * (mobile ? .8 : 1);
        const badge = !['coin', 'dollar', 'hash'].includes(piece.kind);
        const w = piece.size * scale; const h = (badge ? piece.size * .48 : piece.size) * scale;
        // Includes entrance rise, bob, rotation, cursor movement and the 24px content safe zone.
        const travel = reduced ? 0 : mobile ? 10 : 18 + depth * 20;
        const padX = 24 + travel + w * .12;
        const padY = 24 + Math.max(travel, reduced ? 0 : 30) + h * .12;
        const desiredX = parseFloat(piece.x) / 100 * bounds.width;
        const desiredY = parseFloat(piece.y) / 100 * bounds.height;
        const candidates = [{ x: desiredX, y: desiredY }];
        for (let row = 1; row < 20; row++) for (let col = 1; col < 20; col++) candidates.push({ x: bounds.width * col / 20, y: bounds.height * row / 20 });
        candidates.sort((a, b) => Math.hypot(a.x - desiredX, a.y - desiredY) - Math.hypot(b.x - desiredX, b.y - desiredY));
        for (const candidate of candidates) {
          const box = { left: candidate.x - w / 2 - padX, right: candidate.x + w / 2 + padX, top: candidate.y - h / 2 - padY, bottom: candidate.y + h / 2 + padY };
          // Keep the visible motion within the layer; safety padding may extend past its edge.
          if (candidate.x - w / 2 - travel < 0 || candidate.x + w / 2 + travel > bounds.width || candidate.y - h / 2 - travel < 0 || candidate.y + h / 2 + Math.max(travel, 30) > bounds.height) continue;
          if (obstacles.some(obstacle => intersects(box, obstacle)) || reserved.some(obstacle => intersects(box, obstacle))) continue;
          reserved.push(box);
          return { x: `${candidate.x / bounds.width * 100}%`, y: `${candidate.y / bounds.height * 100}%` };
        }
        return null;
      });
      setPositions(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    }
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule); observer.observe(host);
    host.addEventListener('load', schedule, true); window.addEventListener('resize', schedule);
    let mounted = true; void document.fonts.ready.then(() => { if (mounted) schedule(); });
    schedule(); const settled = setTimeout(schedule, 1000);
    return () => { mounted = false; cancelAnimationFrame(frame); clearTimeout(settled); observer.disconnect(); host.removeEventListener('load', schedule, true); window.removeEventListener('resize', schedule); };
  }, [definitions, mobile, reduced, active]);

  return <Context.Provider value={{ active, mobile, mouseX, mouseY }}>
    <div ref={ref} className="float-field" aria-hidden="true">
      {definitions.map((piece, index) => {
        const position = positions[index]; if (!position) return null;
        const badge = !['coin', 'dollar', 'hash'].includes(piece.kind);
        return <Floater key={`${piece.kind}-${index}`} {...piece} {...position} index={index} height={badge ? piece.size * .48 : piece.size}><Piece kind={piece.kind} /></Floater>;
      })}
    </div>
  </Context.Provider>;
}
