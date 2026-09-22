import { Suspense } from 'react';
import { getLaunches, getPairs } from '@/lib/data';
import { LaunchFeed } from '@/components/launch-feed';
import Loading from '../loading';
export const metadata = { title: 'Explore' }; export const dynamic = 'force-dynamic';
export default async function Explore({ searchParams }: { searchParams: Promise<{ page?: string; q?: string; stock?: string; sort?: string }> }) {
  const params = await searchParams; const page = Math.max(1, Math.min(100000, Number(params.page) || 1)) | 0;
  const [result, pairs] = await Promise.all([getLaunches({ page, search: params.q, stock: params.stock, sort: params.sort }), getPairs()]);
  return <section className="container page-section"><div className="page-heading"><span className="eyebrow">THE COMMUNITY, IN MOTION</span><h1>Every coin starts<br />with a little spark.</h1><p>Find a ticker, follow a creator, or see where curiosity takes you.</p></div>{pairs.state === 'error' && <p role="status">Stock filters are temporarily unavailable.</p>}<Suspense fallback={<Loading />}><LaunchFeed result={result} pairs={pairs.data} explore page={page} /></Suspense></section>;
}
