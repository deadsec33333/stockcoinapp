# {Brand} backend: X post -> pump.fun coin paired with a stock

What's here: the bot and database. The website you build separately (see FRONTEND_SPEC.md).

## Accounts you need
1. **Supabase** (database). Free plan is fine to start.
2. **X developer account** for the bot's X account, pay per use (reading mentions and replying cost money per call).
3. **PumpPortal** Lightning API key (it creates a wallet for you; put some SOL in it, it pays each launch).
4. **Pinata** (free) for coin images.
5. **Helius** (free) for Solana RPC.
6. A small server that runs 24/7 (Railway, Render or Fly.io, about 5 USD/month).

## Setup, step by step
1. Supabase: create a project, open SQL Editor, run `supabase/migrations/001_init.sql`, then `002_seed_stocks.sql`.
2. Copy `.env.example` to `.env` and fill in the keys. Leave `DRY_RUN=true` and `X_REPLY_ENABLED=false`.
3. Install: `npm install`. Test: `npm test`.
4. Start the bot: `npm run bot`. Post `@YourBot $TEST #AAPL` from another account. You should see `[DRY RUN] would launch...` in the log.
5. When that works, set `X_REPLY_ENABLED=true` and check the bot replies.
6. Put ~0.1 SOL in the PumpPortal wallet, set `DRY_RUN=false`, post again. The coin should appear on pump.fun and on your site.
7. Deploy the same folder to Railway/Render with the same env vars, start command `npm run bot`.

## Paying holders (manual on purpose)
1. `npm run fees:claim` claims creator fees into the PumpPortal wallet.
2. Move the SOL you want to distribute to your payout wallet (`PAYOUT_WALLET_SECRET`).
3. `npm run fees:plan -- 1.5` plans how 1.5 SOL is split (nothing is sent). Check the `payouts` table.
4. `npm run fees:pay` sends it.

## Safety
The service role key, PumpPortal key and payout secret must never go into the frontend or GitHub. Daily limits are in `.env`. Check every stock mint on solscan.io before going live.
