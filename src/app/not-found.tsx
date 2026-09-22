import Link from 'next/link';
export default function NotFound() { return <section className="container page-section empty-state"><span className="eyebrow">404 / NOT FOUND</span><h1>No coin at this address.</h1><p>This page may not exist, or the launch isn’t live yet.</p><Link className="button primary" href="/explore">Explore live coins</Link></section>; }
