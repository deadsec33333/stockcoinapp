'use client';
export default function ErrorPage({ reset }: { reset: () => void }) { return <section className="container page-section empty-state"><h1>A brief interruption.</h1><p>Something didn’t load as expected. Give it another try.</p><button className="button primary" onClick={reset}>Try again</button></section>; }
