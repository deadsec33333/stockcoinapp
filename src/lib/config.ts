export const brand = process.env.NEXT_PUBLIC_BRAND_NAME || 'Stockcoin';
const rawHandle = (process.env.NEXT_PUBLIC_BOT_HANDLE || '').replace(/^@/, '');
export const botHandle = /^[A-Za-z0-9_]{1,15}$/.test(rawHandle) ? rawHandle : '';
export const postText = `@${botHandle || 'YOUR_BOT'} $TICKER #AAPL`;
export const intentUrl = `https://x.com/intent/post?text=${encodeURIComponent(postText)}`;
export const userLimit = process.env.NEXT_PUBLIC_DAILY_USER_LIMIT;
export const globalLimit = process.env.NEXT_PUBLIC_DAILY_GLOBAL_LIMIT;
