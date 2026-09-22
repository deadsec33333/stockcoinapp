# Frontend spec (hand this to GPT)

Build a Next.js (App Router) + Tailwind site for **{BRAND_NAME}**. The backend already exists: an X bot launches pump.fun coins on Solana, each paired with a tokenized stock (xStock). The site only **reads** data from Supabase.

**Design and wording must be original.** Create your own visual identity, layout, headlines and copy for {BRAND_NAME}. Do not imitate any existing competitor's look or text.

## How it works (explain this on the site in your own words)
1. User posts on X: `@{BOT_HANDLE} $TICKER #AAPL` (optional coin name after it, optional attached image).
2. Bot launches the coin on pump.fun, paired with the xStock (e.g. AAPLx) and replies with the link.
3. Creator fees from all coins are periodically paid out to coin holders in SOL.

## Data (Supabase, anon key, read only)
Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Never use the service role key in the frontend.

| View | Columns |
|---|---|
| `public_launches` | id, ticker, coin_name, image_url, mint, tx_signature, live_at, tweet_id, x_handle, avatar_url, stock_symbol, xstock_symbol, stock_name, stock_mint |
| `public_stats` (1 row) | tokens_launched, creators, pairs_used, sol_paid_to_holders |
| `public_pair_stats` | symbol, xstock_symbol, name, launches |
| `stocks` | symbol, xstock_symbol, name, mint |

Examples:
```ts
supabase.from('public_launches').select('*').order('live_at', { ascending: false }).range(0, 11)
supabase.from('public_stats').select('*').single()
```
Use Supabase Realtime on table `launches` (filter status=eq.live) to show new coins without reload.

## Links
- Coin: `https://pump.fun/coin/{mint}`
- Transaction: `https://solscan.io/tx/{tx_signature}`
- Token: `https://solscan.io/token/{mint}` (also for `stock_mint`)
- Source post: `https://x.com/{x_handle}/status/{tweet_id}`
- Creator: `https://x.com/{x_handle}`

## Pages
1. **Home**: what it is, the post format with a copy button, a "Post on X" button (intent URL `https://x.com/intent/post?text=@{BOT_HANDLE}%20$TICKER%20%23AAPL`), stats, newest launches grid with pagination.
2. **Explore**: all live launches, search by ticker/handle, filter by stock, sort newest/oldest.
3. **Coin detail** `/coin/[mint]`: image, name, ticker, creator, paired xStock, links above, launch time.
4. **Pairs** `/pairs`: supported stocks and how many coins use each (the bot links here when someone uses an unsupported stock).
5. **Analytics**: the stats plus launches per day and per stock (charts).
6. **Docs**: how to launch, rules (one $TICKER, one #STOCK, 2 to 10 chars, daily limits), how fee payouts work, risks and disclaimer (not financial advice, memecoins are risky, xStocks not available to US persons).

## Requirements
Mobile first, dark and light mode, fast (server components where possible), images from IPFS with a fallback, empty and loading states, no wallet connect needed in v1.

## Visual direction: clean, premium, calm
Minimal and high end, in the spirit of modern premium product sites, but an original identity for {BRAND_NAME}. Do not use any real company's logos, icons, product images, trademarked names or proprietary fonts (no SF Pro, no Apple logo, no stock company logos on coin cards; show the xStock as a text badge like `AAPLx`).

**Layout**
- Lots of white space, content max width ~1200px, generous section padding (120px desktop, 72px mobile).
- One idea per section. Big centered hero headline, one line subtitle, two buttons (primary filled, secondary text link).
- 12 column grid; launch cards in a 4/3/2/1 column grid by screen size.

**Type**
- Font: Inter (Google Fonts) with `font-feature-settings: "ss01","cv11"`; tight letter spacing on headings (-0.03em).
- Hero 64 to 88px, weight 600. Section titles 40 to 48px. Body 17px, line height 1.5, muted gray for secondary text.

**Color**
- Light: background #FBFBFD, text #1D1D1F, muted #6E6E73, hairline borders rgba(0,0,0,.08).
- Dark: background #000, surfaces #111113, text #F5F5F7.
- One accent color only (pick one for the brand, e.g. a deep green #0A7D4F for "money"), used for buttons and live indicators.

**Surfaces**
- Cards: radius 20 to 24px, 1px hairline border, very soft shadow, hover lifts 2px with a slightly stronger shadow.
- Sticky top nav with frosted glass (`backdrop-filter: blur(20px) saturate(180%)`, semi transparent background), 56px tall.

**Motion** (Framer Motion)
- Easing `cubic-bezier(0.22, 1, 0.36, 1)`, durations 400 to 700ms. Nothing bouncy.
- Sections fade up 16px as they scroll into view, children staggered 60ms.
- Hero headline reveals word by word; subtle parallax on the hero visual.
- Stats count up from 0 when visible.
- New live launches slide into the top of the grid with a soft glow on the "live" dot.
- Buttons: scale 0.98 on press. Page transitions: quick crossfade.
- Smooth scrolling with Lenis.
- Respect `prefers-reduced-motion` (turn off parallax and big movements).

**Polish**
- Skeleton loaders with a gentle shimmer, never spinners.
- Images fade in when loaded, rounded 16px.
- Numbers in tabular figures (`font-variant-numeric: tabular-nums`).
- Lighthouse 90+ on mobile; animate only transform and opacity.
