// Turns a post like "@YourBot $MOON #AAPL Moon Apple" into a launch request.
// Rules: exactly one $TICKER (2 to 10 letters/digits) and exactly one #STOCK.
// Anything left over (max 32 chars) becomes the coin name; otherwise the ticker is the name.

export type ParsedLaunch =
  | { ok: true; ticker: string; stock: string; name: string }
  | { ok: false; reason: string };

const TICKER_RE = /\$([A-Za-z][A-Za-z0-9]{1,9})\b/g;
const STOCK_RE = /#([A-Za-z]{1,6}(?:\.[A-Za-z])?)\b/g;

export function parseLaunch(text: string, botHandle: string): ParsedLaunch {
  const mention = new RegExp(`@${botHandle}\\b`, 'i');
  if (!mention.test(text)) return { ok: false, reason: 'bot not mentioned' };

  const tickers = [...text.matchAll(TICKER_RE)].map(m => m[1].toUpperCase());
  const stocks = [...text.matchAll(STOCK_RE)].map(m => m[1].toUpperCase());

  if (tickers.length === 0) return { ok: false, reason: 'no $TICKER found' };
  if (tickers.length > 1) return { ok: false, reason: 'use only one $TICKER' };
  if (stocks.length === 0) return { ok: false, reason: 'no #STOCK found' };
  if (stocks.length > 1) return { ok: false, reason: 'use only one #STOCK' };

  const leftover = text
    .replace(/@\w+/g, '')
    .replace(TICKER_RE, '')
    .replace(STOCK_RE, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const name = (leftover.length >= 2 ? leftover : tickers[0]).slice(0, 32);

  return { ok: true, ticker: tickers[0], stock: stocks[0], name };
}
