export function imageSource(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${url.slice(7).replace(/^ipfs\//, '')}`;
  try { const parsed = new URL(url); return parsed.protocol === 'https:' ? parsed.href : null; } catch { return null; }
}
export function searchTerm(value: string) { return value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 64); }
export function number(value: number) { return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value); }
export function date(value: string) { return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(value)); }
export function dailySeries(rows: { live_at: string }[], now = new Date()) {
  const days = Array.from({ length: 30 }, (_, index) => { const d = new Date(now); d.setUTCDate(d.getUTCDate() - 29 + index); return { day: d.toISOString().slice(0, 10), count: 0 }; });
  const counts = new Map(days.map(d => [d.day, d]));
  for (const row of rows) { const day = counts.get(row.live_at.slice(0, 10)); if (day) day.count++; }
  return days;
}
