'use client';
import { useState } from 'react';
import { Check, Copy, ArrowUpRight, Layers3 } from 'lucide-react';
import { botHandle, postText } from '@/lib/config';
import { imageSource } from '@/lib/format';
import { PostButton } from './navigation';
export function CopyButton({ text, label = 'Copy format' }: { text: string; label?: string }) {
  const [state, setState] = useState('idle');
  async function copy() { try { await navigator.clipboard.writeText(text); setState('copied'); setTimeout(() => setState('idle'), 2000); } catch { setState('failed'); } }
  return <button className="copy-button" onClick={copy} aria-label={label}><span aria-live="polite">{state === 'copied' ? 'Copied' : state === 'failed' ? 'Select text to copy' : label}</span>{state === 'copied' ? <Check size={15} /> : <Copy size={15} />}</button>;
}
export function PostComposer() { return <div className="post-composer"><div className="composer-top"><span className="eyebrow">YOUR NEXT IDEA STARTS WITH A POST</span><CopyButton text={postText} /></div><div className="post-code"><span>@{botHandle || 'YOUR_BOT'}</span> <strong>$TICKER</strong> <span>#AAPL</span><span className="typing-cursor" /></div><div className="composer-bottom"><span>A ticker. A stock. Your own little corner of the market.</span><PostButton className="text-link" /></div>{!botHandle && <small className="config-note">Example format · the launch link appears when the bot is configured.</small>}</div>; }
export function CoinImage({ url, ticker, large = false }: { url: string | null; ticker: string; large?: boolean }) {
  const src = imageSource(url); const [failed, setFailed] = useState(false); const [loaded, setLoaded] = useState(false);
  return <div className={`coin-image ${large ? 'large' : ''}`}>{src && !failed ? <img src={src} alt={`${ticker} coin artwork`} loading={large ? 'eager' : 'lazy'} referrerPolicy="no-referrer" onError={() => setFailed(true)} onLoad={() => setLoaded(true)} style={{ opacity: loaded ? 1 : 0 }} /> : <span aria-label={`${ticker} artwork placeholder`}>{ticker.slice(0, 2)}</span>}</div>;
}
export function EmptyState({ state, noun = 'launches', filtered = false }: { state: 'ready' | 'unconfigured' | 'error'; noun?: string; filtered?: boolean }) {
  return <div className="empty-state"><div className="empty-icon"><Layers3 size={26} strokeWidth={1.2} /></div><h3>{state === 'error' ? 'A little pause in the feed.' : state === 'unconfigured' ? 'The next chapter starts here.' : filtered ? 'No matches. New possibilities.' : `No ${noun} just yet.`}</h3><p>{state === 'error' ? 'We couldn’t reach the data source. Try again in a moment.' : state === 'unconfigured' ? 'Live data will appear once the public data connection is configured.' : filtered ? 'Try another ticker, creator, or stock pairing.' : `When ${noun} are available, you’ll find them here.`}</p>{state === 'error' && <button className="button secondary" onClick={() => window.location.reload()}>Try again<ArrowUpRight size={15} /></button>}</div>;
}
