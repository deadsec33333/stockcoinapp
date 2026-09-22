import type { Result, Stats } from '@/lib/types';
import { Counter } from './motion';
export function StatsRow({ result }: { result: Result<Stats> }) {
  const items = [['Coins launched', result.data.tokens_launched], ['Unique creators', result.data.creators], ['Stock pairings used', result.data.pairs_used], ['SOL paid to holders', result.data.sol_paid_to_holders]] as const;
  return <div className="stats-wrap"><div className="stats-grid">{items.map(([label, value], i) => <div className="stat" key={label}><span className={`stat-value ${i === 3 ? 'accent' : ''}`}>{result.state === 'ready' ? <Counter value={Number(value)} /> : '—'}{i === 3 && <span className="unit">SOL</span>}</span><span className="stat-label">{label}</span></div>)}</div>{result.state !== 'ready' && <p className="data-caption">{result.state === 'error' ? 'Statistics are temporarily unavailable.' : 'Awaiting live data · no activity is simulated.'}</p>}</div>;
}
