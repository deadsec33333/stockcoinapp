import type { Metadata } from 'next';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import './globals.css';
import { Navigation, Footer } from '@/components/navigation';
import { MotionProvider } from '@/components/motion';
import { brand } from '@/lib/config';
export const metadata: Metadata = { title: { default: `${brand} — Small sparks. Shared possibilities.`, template: `%s · ${brand}` }, description: 'Discover community-created coins paired with tokenized stocks. One post starts the story.' };
const themeScript = `(function(){try{var t=localStorage.getItem('stockcoin-theme');document.documentElement.dataset.theme=t||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}catch(e){}})()`;
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head><body><a className="skip-link" href="#main">Skip to content</a><MotionProvider><Navigation /><main id="main">{children}</main><Footer /></MotionProvider></body></html>; }
