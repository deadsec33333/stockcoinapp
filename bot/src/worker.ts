// The bot loop: read mentions -> validate -> launch coin -> save -> reply.
import { config } from './config.js';
import { db, getState, setState } from './db.js';
import { parseLaunch } from './parse.js';
import { fetchMentions, reply, type Mention } from './x.js';
import { uploadCoinMetadata } from './ipfs.js';
import { createCoin } from './pump.js';

const dayAgo = () => new Date(Date.now() - 86_400_000).toISOString();

async function countSince(filter: { x_user_id?: string }) {
  let q = db.from('launches').select('id', { count: 'exact', head: true })
    .in('status', ['launching', 'live']).gte('created_at', dayAgo());
  if (filter.x_user_id) q = q.eq('x_user_id', filter.x_user_id);
  const { count } = await q;
  return count ?? 0;
}

async function handle(m: Mention) {
  const tweetUrl = `https://x.com/${m.authorHandle}/status/${m.id}`;

  // dedupe
  const { data: existing } = await db.from('launches').select('id').eq('tweet_id', m.id).maybeSingle();
  if (existing) return;

  const parsed = parseLaunch(m.text, config.botHandle);
  if (!parsed.ok) {
    // Only answer people who clearly tried (used $ or #); ignore plain chatter.
    if (/[$#]/.test(m.text)) await reply(m.id, `Couldn't launch: ${parsed.reason}. Format: @${config.botHandle} $TICKER #AAPL`);
    return;
  }

  const { data: stock } = await db.from('stocks').select('*').eq('symbol', parsed.stock).eq('enabled', true).maybeSingle();

  await db.from('creators').upsert({ x_user_id: m.authorId, x_handle: m.authorHandle, avatar_url: m.authorAvatar });

  const base = { tweet_id: m.id, x_user_id: m.authorId, ticker: parsed.ticker, coin_name: parsed.name };

  if (!stock) {
    await reply(m.id, `#${parsed.stock} isn't a supported stock yet. See the list: ${config.siteUrl}/pairs`);
    return;
  }
  if (await countSince({ x_user_id: m.authorId }) >= config.limits.perUserPerDay ||
      await countSince({}) >= config.limits.perDay) {
    await db.from('launches').insert({ ...base, stock_symbol: stock.symbol, status: 'rejected', error: 'daily limit' });
    await reply(m.id, `Daily launch limit reached, try again tomorrow.`);
    return;
  }

  const { data: row, error } = await db.from('launches')
    .insert({ ...base, stock_symbol: stock.symbol, status: 'launching' }).select('id').single();
  if (error) { console.error('insert failed', error); return; }

  try {
    const imageSource = m.imageUrl ?? m.authorAvatar;
    if (!imageSource) throw new Error('no image available');

    if (config.dryRun) {
      console.log(`[DRY RUN] would launch $${parsed.ticker} "${parsed.name}" paired with ${stock.xstock_symbol} for @${m.authorHandle}`);
      await db.from('launches').update({ status: 'failed', error: 'dry run' }).eq('id', row.id);
      return;
    }

    const { imageUrl, metadataUri } = await uploadCoinMetadata({
      name: parsed.name,
      ticker: parsed.ticker,
      imageSourceUrl: imageSource,
      description: `Launched by @${m.authorHandle} via ${config.brand}. Paired with ${stock.xstock_symbol} (${stock.name}). Creator fees go to holders.`,
      tweetUrl,
    });
    const { mint, signature } = await createCoin({ name: parsed.name, ticker: parsed.ticker, uri: metadataUri });

    await db.from('launches').update({
      status: 'live', mint, tx_signature: signature, image_url: imageUrl, metadata_uri: metadataUri, live_at: new Date().toISOString(),
    }).eq('id', row.id);

    console.log(`LIVE $${parsed.ticker} ${mint}`);
    await reply(m.id, `$${parsed.ticker} is live, paired with ${stock.xstock_symbol}.\nhttps://pump.fun/coin/${mint}`);
  } catch (e: any) {
    console.error(`launch failed for ${m.id}:`, e.message);
    await db.from('launches').update({ status: 'failed', error: String(e.message).slice(0, 500) }).eq('id', row.id);
  }
}

async function tick() {
  const since = await getState('since_id');
  const { mentions, newestId } = await fetchMentions(since);
  for (const m of mentions) await handle(m);   // one at a time, on purpose
  if (newestId) await setState('since_id', newestId);
  if (mentions.length) console.log(`processed ${mentions.length} mentions`);
}

console.log(`${config.brand} bot started. dryRun=${config.dryRun} replies=${config.x.replyEnabled} poll=${config.pollSeconds}s`);
for (;;) {
  try { await tick(); } catch (e: any) { console.error('tick error:', e.message); }
  await new Promise(r => setTimeout(r, config.pollSeconds * 1000));
}
