import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailySeries, imageSource, searchTerm } from '../src/lib/format';
import { getCoin, getDailyLaunches, getLaunches, getPairs, getStats } from '../src/lib/data';

test('IPFS URLs normalize and unsafe or invalid image protocols are rejected', () => {
  assert.equal(imageSource('ipfs://ipfs/bafy123/image.png'), 'https://ipfs.io/ipfs/bafy123/image.png');
  assert.equal(imageSource('ipfs://bafy123'), 'https://ipfs.io/ipfs/bafy123');
  assert.equal(imageSource('https://example.com/image.jpg'), 'https://example.com/image.jpg');
  for (const value of ['javascript:alert(1)', 'data:image/svg+xml,abc', 'http://example.com', '/local', null]) assert.equal(imageSource(value), null);
});
test('search cannot inject PostgREST filter operators', () => {
  assert.equal(searchTerm('@alice'), 'alice');
  assert.equal(searchTerm('$MOON'), 'MOON');
  assert.equal(searchTerm('a%,ticker.eq.bad()'), 'atickereqbad');
  assert.equal(searchTerm('a'.repeat(200)).length, 64);
});
test('daily aggregation uses UTC dates, includes empty days, and excludes out-of-window rows', () => {
  const days = dailySeries([{ live_at: '2026-09-22T00:01:00Z' }, { live_at: '2026-09-22T23:59:59Z' }, { live_at: '2026-09-21T23:59:59Z' }, { live_at: '2026-08-01T00:00:00Z' }], new Date('2026-09-22T03:00:00Z'));
  assert.equal(days.length, 30); assert.equal(days[0].day, '2026-08-24'); assert.equal(days[0].count, 0); assert.equal(days.at(-1)?.count, 2); assert.equal(days.at(-2)?.count, 1);
});
test('unconfigured data is distinguished from zero activity', async () => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL; delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const results = await Promise.all([getStats(), getLaunches(), getPairs(), getCoin('missing'), getDailyLaunches()]);
  for (const result of results) assert.equal(result.state, 'unconfigured');
});
test('data queries paginate, filter, sort and report failures without simulated data', async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co'; process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon';
  const originalFetch = globalThis.fetch; const urls: URL[] = [];
  globalThis.fetch = async (input) => { urls.push(new URL(String(input))); return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json', 'Content-Range': '0-0/25' } }); };
  try {
    const result = await getLaunches({ page: 2, search: '@alice', stock: 'AAPL', sort: 'oldest' });
    assert.equal(result.state, 'ready'); assert.equal(result.data.total, 25); assert.equal(urls[0].searchParams.get('offset'), '12'); assert.equal(urls[0].searchParams.get('limit'), '12'); assert.equal(urls[0].searchParams.get('stock_symbol'), 'eq.AAPL'); assert.equal(urls[0].searchParams.get('order'), 'live_at.asc,id.asc'); assert.equal(urls[0].searchParams.get('or'), '(ticker.ilike.%alice%,x_handle.ilike.%alice%)');
    globalThis.fetch = async () => new Response(JSON.stringify({ message: 'unavailable' }), { status: 400 });
    const failed = await getLaunches(); assert.equal(failed.state, 'error'); assert.equal(failed.data.launches.length, 0);
  } finally { globalThis.fetch = originalFetch; }
});
test('analytics includes results past the 1000-row response limit', async () => {
  const originalFetch = globalThis.fetch; let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response(JSON.stringify(Array.from({ length: calls === 1 ? 1000 : 2 }, () => ({ live_at: '2026-09-22T00:00:00Z' }))), { status: 200, headers: { 'Content-Type': 'application/json' } }); };
  try { const result = await getDailyLaunches(); assert.equal(result.state, 'ready'); assert.equal(result.data.length, 1002); assert.equal(calls, 2); } finally { globalThis.fetch = originalFetch; }
});
