'use client';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowUpRight, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { getSupabase } from '@/lib/supabase';
import { date } from '@/lib/format';
import type { Launch, LaunchPage, Pair, Result } from '@/lib/types';
import { CoinImage, EmptyState } from './ui';
export function LaunchCard({ coin, index }: { coin: Launch; index: number }) {
  const reduced = useReducedMotion();
  return <motion.article className="launch-card" layout={!reduced} initial={reduced ? false : { opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45, delay: Math.min(index, 11) * .06 }}><Link className="card-main" href={`/coin/${encodeURIComponent(coin.mint)}`}><div className="card-art"><CoinImage url={coin.image_url} ticker={coin.ticker} /><span className="pair-badge">{coin.xstock_symbol}</span><span className="card-arrow"><ArrowUpRight size={18} /></span></div><div className="card-title"><h3>{coin.coin_name}</h3><span>${coin.ticker}</span></div></Link><div className="card-meta"><a href={`https://x.com/${encodeURIComponent(coin.x_handle)}`} target="_blank" rel="noopener noreferrer">@{coin.x_handle}</a><time dateTime={coin.live_at}>{date(coin.live_at)}</time></div></motion.article>;
}
export function LaunchFeed({ result, pairs = [], explore = false, page = 1 }: { result: Result<LaunchPage>; pairs?: Pair[]; explore?: boolean; page?: number }) {
  const router = useRouter(); const params = useSearchParams(); const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(params.get('q') || ''); const [live, setLive] = useState(false);
  useEffect(() => { setSearch(params.get('q') || ''); }, [params]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>; const db = getSupabase(); if (!db) return;
    const refresh = () => { clearTimeout(timer); timer = setTimeout(() => router.refresh(), 300); };
    const channel = db.channel('live-launch-feed').on('postgres_changes', { event: '*', schema: 'public', table: 'launches', filter: 'status=eq.live' }, refresh).subscribe(status => { setLive(status === 'SUBSCRIBED'); if (status === 'SUBSCRIBED') refresh(); });
    // Polling also repairs missed events after a network interruption.
    const poll = setInterval(() => { if (document.visibilityState === 'visible') router.refresh(); }, 60000);
    return () => { clearTimeout(timer); clearInterval(poll); void db.removeChannel(channel); };
  }, [router]);
  function update(values: Record<string, string>) { const next = new URLSearchParams(params); for (const [key, value] of Object.entries(values)) { if (value) next.set(key, value); else next.delete(key); } startTransition(() => router.push(`?${next.toString()}`, { scroll: false })); }
  const pages = Math.max(1, Math.ceil(result.data.total / 12));
  return <div className="feed">{explore && <form className="filters" onSubmit={event => { event.preventDefault(); update({ q: search, page: '' }); }}><label className="search-field"><Search size={18} /><input aria-label="Search ticker or creator" placeholder="Search a ticker or @creator" value={search} onChange={e => setSearch(e.target.value)} /><button className="search-submit" type="submit">Search</button></label><label className="select-label"><span className="sr-only">Filter by stock</span><select value={params.get('stock') || ''} onChange={e => update({ stock: e.target.value, page: '' })}><option value="">All stock pairings</option>{pairs.map(pair => <option key={pair.symbol} value={pair.symbol}>{pair.xstock_symbol}</option>)}</select></label><label className="select-label"><span className="sr-only">Sort launches</span><select value={params.get('sort') || 'newest'} onChange={e => update({ sort: e.target.value, page: '' })}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label></form>}<div className="feed-meta"><span>{result.state === 'ready' ? `${result.data.total.toLocaleString()} ${result.data.total === 1 ? 'coin' : 'coins'}${explore ? ' found' : ' and counting'}` : 'A place for the next big little idea'}</span><span className={`live-status ${live ? 'connected' : ''}`}><span className="dot" />{live ? 'Updating live' : result.state === 'unconfigured' ? 'Awaiting connection' : 'Auto-refresh enabled'}</span></div><div aria-busy={pending} className={pending ? 'feed-content pending' : 'feed-content'}>{result.data.launches.length ? <div className="launch-grid">{result.data.launches.map((coin, index) => <LaunchCard key={coin.id} coin={coin} index={index} />)}</div> : <EmptyState state={result.state} filtered={!!params.get('q') || !!params.get('stock')} />}</div>{result.state === 'ready' && (pages > 1 || page > 1) && <div className="pagination"><button className="button secondary small" disabled={page <= 1 || pending} onClick={() => update({ page: String(page - 1) })}><ChevronLeft size={16} />Previous</button><span>Page {page} · {pages} {pages === 1 ? 'page' : 'pages'} available</span><button className="button secondary small" disabled={page >= pages || pending} onClick={() => update({ page: String(page + 1) })}>Next<ChevronRight size={16} /></button></div>}</div>;
}
