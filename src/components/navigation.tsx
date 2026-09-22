'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Menu, Moon, Sun, X } from 'lucide-react';
import { brand, botHandle, intentUrl } from '@/lib/config';
const links = [['Explore', '/explore'], ['Pairs', '/pairs'], ['Analytics', '/analytics'], ['Docs', '/docs']];
export function Mark() { return <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>; }
export function PostButton({ className = 'button primary', label = 'Post on X' }: { className?: string; label?: string }) {
  return botHandle ? <a className={className} href={intentUrl} target="_blank" rel="noopener noreferrer">{label}<ArrowUpRight size={16} /></a> : <Link className={className} href="/docs#launch">How to launch<ArrowUpRight size={16} /></Link>;
}
export function Navigation() {
  const path = usePathname(); const [open, setOpen] = useState(false); const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.dataset.theme === 'dark'); }, []);
  useEffect(() => { setOpen(false); }, [path]);
  function toggle() { const next = !dark; setDark(next); document.documentElement.dataset.theme = next ? 'dark' : 'light'; try { localStorage.setItem('stockcoin-theme', next ? 'dark' : 'light'); } catch {} }
  return <header className="navigation"><div className="nav-inner"><Link className="brand" href="/" aria-label={`${brand} home`}><Mark />{brand.toLowerCase()}<span className="beta">BETA</span></Link><nav className="desktop-nav" aria-label="Main navigation">{links.map(([label, href]) => <Link key={href} href={href} aria-current={path === href ? 'page' : undefined}>{label}</Link>)}</nav><div className="nav-actions"><button className="icon-button" aria-label={dark ? 'Use light theme' : 'Use dark theme'} onClick={toggle}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button><PostButton className="button primary small nav-post" label="Launch a coin" /><button className="icon-button mobile-menu" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}>{open ? <X size={20} /> : <Menu size={20} />}</button></div></div>{open && <nav id="mobile-navigation" className="mobile-navigation" aria-label="Mobile navigation">{links.map(([label, href]) => <Link key={href} href={href} aria-current={path === href ? 'page' : undefined}>{label}</Link>)}<PostButton /></nav>}</header>;
}
export function Footer() { return <footer className="footer container"><div className="footer-top"><Link className="brand" href="/"><Mark />{brand.toLowerCase()}</Link><span>Small sparks. Shared possibilities.</span><div><Link href="/docs">Documentation</Link><Link href="/docs#risks">Risks & disclaimer</Link></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} {brand}. Built around community.</span><span>Memecoins carry risk. Nothing here is financial advice.</span><span className="network"><span className="dot" /> On Solana</span></div></footer>; }
