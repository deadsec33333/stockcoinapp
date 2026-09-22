import { getSupabase } from './supabase';
import { searchTerm } from './format';
import type { Launch, LaunchPage, Pair, Result, Stats } from './types';
const blankStats: Stats = { tokens_launched: 0, creators: 0, pairs_used: 0, sol_paid_to_holders: 0 };
export async function getLaunches({ page = 1, search = '', stock = '', sort = 'newest' }: { page?: number; search?: string; stock?: string; sort?: string } = {}): Promise<Result<LaunchPage>> {
  const empty = { launches: [], total: 0 };
  try {
    const db = getSupabase(); if (!db) return { data: empty, state: 'unconfigured' };
    let query = db.from('public_launches').select('*', { count: 'exact' }).order('live_at', { ascending: sort === 'oldest' }).order('id', { ascending: sort === 'oldest' });
    const clean = searchTerm(search);
    if (clean) query = query.or(`ticker.ilike.%${clean}%,x_handle.ilike.%${clean}%`);
    if (stock) query = query.eq('stock_symbol', stock);
    const from = (Math.max(1, page) - 1) * 12;
    const { data, error, count } = await query.range(from, from + 11);
    if (error) return { data: empty, state: 'error' };
    return { data: { launches: data as Launch[], total: count || 0 }, state: 'ready' };
  } catch { return { data: empty, state: 'error' }; }
}
export async function getStats(): Promise<Result<Stats>> {
  try { const db = getSupabase(); if (!db) return { data: blankStats, state: 'unconfigured' }; const { data, error } = await db.from('public_stats').select('*').single(); return { data: data || blankStats, state: error ? 'error' : 'ready' }; } catch { return { data: blankStats, state: 'error' }; }
}
export async function getPairs(): Promise<Result<Pair[]>> {
  try {
    const db = getSupabase(); if (!db) return { data: [], state: 'unconfigured' };
    const [pairs, stocks] = await Promise.all([db.from('public_pair_stats').select('*').order('launches', { ascending: false }), db.from('stocks').select('symbol,mint')]);
    if (pairs.error || stocks.error) return { data: [], state: 'error' };
    return { data: (pairs.data || []).map(p => ({ ...p, mint: stocks.data?.find(s => s.symbol === p.symbol)?.mint })) as Pair[], state: 'ready' };
  } catch { return { data: [], state: 'error' }; }
}
export async function getCoin(mint: string): Promise<Result<Launch | null>> {
  try { const db = getSupabase(); if (!db) return { data: null, state: 'unconfigured' }; const { data, error } = await db.from('public_launches').select('*').eq('mint', mint).maybeSingle(); return { data: data as Launch | null, state: error ? 'error' : 'ready' }; } catch { return { data: null, state: 'error' }; }
}
export async function getDailyLaunches(): Promise<Result<{ live_at: string }[]>> {
  const rows: { live_at: string }[] = [];
  try {
    const db = getSupabase(); if (!db) return { data: [], state: 'unconfigured' };
    const since = new Date(); since.setUTCDate(since.getUTCDate() - 29); since.setUTCHours(0, 0, 0, 0);
    // Fetch every page, including beyond Supabase's default 1,000-row response cap.
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db.from('public_launches').select('live_at').gte('live_at', since.toISOString()).order('live_at').order('id').range(from, from + 999);
      if (error) return { data: [], state: 'error' };
      rows.push(...data); if (data.length < 1000) break;
    }
    return { data: rows, state: 'ready' };
  } catch { return { data: [], state: 'error' }; }
}
