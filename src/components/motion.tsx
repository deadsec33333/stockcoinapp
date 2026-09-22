'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';
export function MotionProvider({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  useEffect(() => { if (reduced) return; const lenis = new Lenis({ autoRaf: true, duration: 0.85, anchors: true }); return () => lenis.destroy(); }, [reduced]);
  return children;
}
export function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={false} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.12 }} transition={{ duration: reduced ? 0 : .6, delay, ease: [.22, 1, .36, 1] }}><motion.div initial={reduced ? false : { opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: reduced ? 0 : .6, delay, ease: [.22, 1, .36, 1] }}>{children}</motion.div></motion.div>;
}
export function Headline() {
  const reduced = useReducedMotion();
  return <h1 className="hero-title" aria-label="A little market. A lot of possibility.">{['A little market.', 'A lot of possibility.'].map((line, i) => <span className={i ? 'accent headline-line' : 'headline-line'} aria-hidden="true" key={line}>{line.split(' ').map((word, j) => <motion.span key={word} style={{ display: 'inline-block' }} initial={reduced ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .6, delay: (i * 3 + j) * .06, ease: [.22, 1, .36, 1] }}>{word}&nbsp;</motion.span>)}</span>)}</h1>;
}
export function Parallax({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null); const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [12, -12]);
  return <motion.div ref={ref} style={{ y: reduced ? 0 : y }} className="hero-art">{children}</motion.div>;
}
export function Counter({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null); const visible = useInView(ref, { once: true }); const reduced = useReducedMotion(); const [count, setCount] = useState(0);
  useEffect(() => { if (!visible || reduced) return; let frame: number; let start: number; const tick = (time: number) => { start ??= time; const p = Math.min((time - start) / 900, 1); setCount(value * (1 - Math.pow(1 - p, 3))); if (p < 1) frame = requestAnimationFrame(tick); }; frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame); }, [visible, value, reduced]);
  return <span ref={ref}>{new Intl.NumberFormat('en-US', { maximumFractionDigits: Number.isInteger(value) ? 0 : 2 }).format(reduced ? value : count)}</span>;
}
export function PageTransition({ children }: { children: React.ReactNode }) {
  const path = usePathname(); const reduced = useReducedMotion();
  return <motion.div key={path} initial={reduced ? false : { opacity: .6 }} animate={{ opacity: 1 }} transition={{ duration: .25 }}>{children}</motion.div>;
}
