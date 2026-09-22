export type Launch = { id: number; ticker: string; coin_name: string; image_url: string | null; mint: string; tx_signature: string | null; live_at: string; tweet_id: string; x_handle: string; avatar_url: string | null; stock_symbol: string; xstock_symbol: string; stock_name: string; stock_mint: string };
export type Stats = { tokens_launched: number; creators: number; pairs_used: number; sol_paid_to_holders: number };
export type Pair = { symbol: string; xstock_symbol: string; name: string; launches: number; mint?: string };
export type Result<T> = { data: T; state: 'ready' | 'unconfigured' | 'error' };
export type LaunchPage = { launches: Launch[]; total: number };
