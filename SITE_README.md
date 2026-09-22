# Stockcoin frontend

A standalone Next.js App Router + Tailwind frontend for the existing Stockcoin bot. It only reads Supabase public data and needs no wallet connection. The backend in the supplied Desktop folder was not modified.

## Run

Requires Node.js 20.9 or newer.

```sh
npm install
cp .env.example .env.local
npm run dev
```

Open http://127.0.0.1:3000. To run the production version: `npm run build`, then `npm start`.

## Connect the existing backend

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to your Supabase project URL and **anon** key. Never put a service role key, payout secret, or bot credential in this app. Set `NEXT_PUBLIC_BOT_HANDLE` to the real X handle without @ to enable Post on X links. The default brand is Stockcoin; change `NEXT_PUBLIC_BRAND_NAME` if needed. Optional daily limit values should match the running backend.

The app reads `public_launches`, `public_stats`, `public_pair_stats`, and `stocks`, using the schema in the supplied backend. Configure Realtime replication for `public.launches` in the Supabase dashboard; the supplied migration does not add this table to the Realtime publication. Existing anonymous SELECT policies must be active, and the public views must be accessible to the anon role. The frontend subscribes to live-status launch changes, refreshes on subscription/reconnection, and refreshes visible feeds every minute as a fallback. It does not write to the database or change policies.

Missing configuration shows an explicit empty state, not fake coins or activity. Connection failures have separate retry states. Publishing requires your hosting account and production environment variables; no deployment has been performed.

## Pages and behavior

- `/`: original hero illustration, copyable post format, stats, paginated live launches.
- `/explore`: URL-backed search by ticker/handle, stock filter, newest/oldest order, 12 launches per page.
- `/coin/[mint]`: coin, creator, pairing, source post, transaction, and explorer links.
- `/pairs`: enabled supported pairs and their launch counts.
- `/analytics`: totals, a UTC 30-day launch chart with accessible daily table, and top 10 stock pairings. Daily query fetches all result pages rather than stopping at the database response cap.
- `/docs`: format, configurable limits, operator-run fee distribution, pairing meaning, and the requested risk disclosures.

Inter is served locally from its open-source font package. All decorative artwork is original CSS/SVG; no third-party logos or stock-company artwork are included. Actual user coin artwork loads directly from HTTPS or through the IPFS gateway, with initials on failure. External images use no-referrer. Dark mode follows the system initially and persists a user override. Motion uses transform/opacity and respects reduced-motion preferences.

## Verification

```sh
npm run typecheck
npm test
npm run build
```

The production build and all six unit tests passed in this workspace, along with TypeScript checks. The production build uses Webpack because the sandbox stalled the default Turbopack build. Browser checks were not run because permission to start the local preview server was declined.

The browser tests in `tests/browser.spec.ts` can be run against a running local server with `npx playwright test` after installing its browser with `npx playwright install chromium`. Unit tests cover search input sanitization, IPFS URL handling, and UTC daily aggregation. Production data and Realtime need a real Supabase project to verify end to end. Lighthouse 90+ is a target, not a measured result until audited against the deployed environment.
