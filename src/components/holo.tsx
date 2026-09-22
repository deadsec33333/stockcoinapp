"use client";

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { motion, useMotionTemplate, useReducedMotion, useSpring, type MotionStyle } from 'framer-motion';

/** Pointer-driven material only; content, links and layout remain unchanged. */
export function HoloSurface({ children, className = '', variant = 'foil', as = 'div' }: {
  children: React.ReactNode;
  className?: string;
  variant?: 'foil' | 'border';
  as?: 'div' | 'span';
}) {
  const reduced = useReducedMotion();
  const [finePointer, setFinePointer] = useState(false);
  const bounds = useRef<DOMRect | null>(null);
  const spring = { stiffness: 160, damping: 24, mass: 0.6 };
  const tiltX = useSpring(0, spring);
  const tiltY = useSpring(0, spring);
  const sheenX = useSpring(50, spring);
  const sheenY = useSpring(50, spring);
  const x = useMotionTemplate`${tiltX}deg`;
  const y = useMotionTemplate`${tiltY}deg`;
  const sx = useMotionTemplate`${sheenX}%`;
  const sy = useMotionTemplate`${sheenY}%`;
  // How strongly the rainbow shows: 0 at rest (silver), up to 1 while the sticker is being "tilted".
  const power = useSpring(0, { stiffness: 120, damping: 22 });
  const pw = useMotionTemplate`${power}`;
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const query = window.matchMedia('(hover: hover) and (pointer: fine)');
    const sync = () => setFinePointer(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (reduced || !finePointer) {
      tiltX.jump(0); tiltY.jump(0); sheenX.jump(50); sheenY.jump(50);
      bounds.current = null;
    }
  }, [reduced, finePointer, tiltX, tiltY, sheenX, sheenY]);

  // Scrolling tilts every sticker a little, like moving it in your hand.
  useEffect(() => {
    if (reduced) return;
    let last = window.scrollY;
    const onScroll = () => {
      const now = window.scrollY;
      const dy = now - last; last = now;
      if (bounds.current) return; // pointer is on it, pointer wins
      sheenX.set(50 + 42 * Math.sin(now / 170));
      sheenY.set(50 + 42 * Math.cos(now / 240));
      tiltX.set(Math.max(-8, Math.min(8, -dy * 0.35)));
      power.set(Math.min(1, 0.45 + Math.abs(dy) / 25));
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
      scrollTimer.current = setTimeout(() => { if (!bounds.current) { power.set(0); tiltX.set(0); } }, 220);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); if (scrollTimer.current) clearTimeout(scrollTimer.current); };
  }, [reduced, sheenX, sheenY, tiltX, power]);

  const enabled = finePointer && !reduced;
  function reset() {
    bounds.current = null;
    tiltX.set(0); tiltY.set(0); sheenX.set(50); sheenY.set(50); power.set(0);
  }
  function enter(event: PointerEvent<HTMLElement>) {
    if (enabled && event.pointerType !== 'touch') bounds.current = event.currentTarget.getBoundingClientRect();
  }
  function move(event: PointerEvent<HTMLElement>) {
    if (!enabled || event.pointerType === 'touch' || !bounds.current) return;
    const box = bounds.current;
    const px = Math.max(0, Math.min(1, (event.clientX - box.left) / box.width));
    const py = Math.max(0, Math.min(1, (event.clientY - box.top) / box.height));
    tiltX.set((0.5 - py) * 16);
    tiltY.set((px - 0.5) * 16);
    sheenX.set(px * 100); sheenY.set(py * 100);
    power.set(Math.min(1, 0.4 + Math.hypot(px - 0.5, py - 0.5) * 1.5));
  }
  const Element = as === 'span' ? motion.span : motion.div;
  return <Element
    className={`${variant === 'foil' ? 'holo' : 'holo-border'} holo-tilt ${className}`}
    style={{ '--tilt-x': x, '--tilt-y': y, '--sheen-x': sx, '--sheen-y': sy, '--holo-power': pw } as MotionStyle}
    onPointerEnter={enter} onPointerMove={move} onPointerLeave={reset} onPointerCancel={reset}
  >
    <span className="holo-layer holo-shine" aria-hidden="true" />
    <span className="holo-layer holo-grain" aria-hidden="true" />
    {children}
  </Element>;
}
