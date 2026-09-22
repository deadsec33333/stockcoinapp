import 'dotenv/config';

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name} (see .env.example)`);
  return v;
}
const opt = (name: string, def = '') => process.env[name] ?? def;
const bool = (name: string, def: boolean) => (process.env[name] ?? String(def)).toLowerCase() === 'true';
const num = (name: string, def: number) => Number(process.env[name] ?? def);

export const config = {
  brand: opt('BRAND_NAME', 'YourBrand'),
  botHandle: opt('BOT_HANDLE', 'YourBotHandle'),
  siteUrl: opt('SITE_URL', 'https://example.com'),
  x: {
    bearer: () => req('X_BEARER_TOKEN'),
    botUserId: () => req('X_BOT_USER_ID'),
    apiKey: () => req('X_API_KEY'),
    apiSecret: () => req('X_API_SECRET'),
    accessToken: () => req('X_ACCESS_TOKEN'),
    accessSecret: () => req('X_ACCESS_SECRET'),
    replyEnabled: bool('X_REPLY_ENABLED', false),
  },
  supabase: { url: () => req('SUPABASE_URL'), key: () => req('SUPABASE_SERVICE_ROLE_KEY') },
  pinataJwt: () => req('PINATA_JWT'),
  pump: {
    apiKey: () => req('PUMPPORTAL_API_KEY'),
    devBuySol: num('DEV_BUY_SOL', 0),
    priorityFee: num('PRIORITY_FEE_SOL', 0.0005),
  },
  rpcUrl: opt('SOLANA_RPC_URL', 'https://api.mainnet-beta.solana.com'),
  payoutSecret: () => req('PAYOUT_WALLET_SECRET'),
  dryRun: bool('DRY_RUN', true),
  limits: {
    perUserPerDay: num('MAX_LAUNCHES_PER_USER_PER_DAY', 3),
    perDay: num('MAX_LAUNCHES_PER_DAY', 50),
  },
  pollSeconds: num('POLL_SECONDS', 30),
};
