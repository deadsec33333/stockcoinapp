// Minimal X API v2 client: read mentions (bearer) and reply (OAuth 1.0a user context).
import crypto from 'node:crypto';
import { config } from './config.js';

export type Mention = {
  id: string;
  text: string;
  authorId: string;
  authorHandle: string;
  authorAvatar?: string;
  imageUrl?: string;       // first photo attached to the post, if any
};

export async function fetchMentions(sinceId?: string): Promise<{ mentions: Mention[]; newestId?: string }> {
  const url = new URL(`https://api.x.com/2/users/${config.x.botUserId()}/mentions`);
  url.searchParams.set('max_results', '100');
  url.searchParams.set('tweet.fields', 'author_id,attachments,created_at');
  url.searchParams.set('expansions', 'author_id,attachments.media_keys');
  url.searchParams.set('user.fields', 'username,profile_image_url');
  url.searchParams.set('media.fields', 'url,type');
  if (sinceId) url.searchParams.set('since_id', sinceId);

  const res = await fetch(url, { headers: { Authorization: `Bearer ${config.x.bearer()}` } });
  if (res.status === 429) throw new Error('X rate limit hit, will retry next poll');
  if (!res.ok) throw new Error(`X mentions ${res.status}: ${await res.text()}`);
  const body: any = await res.json();

  const users = new Map<string, any>((body.includes?.users ?? []).map((u: any) => [u.id, u]));
  const media = new Map<string, any>((body.includes?.media ?? []).map((m: any) => [m.media_key, m]));

  const mentions: Mention[] = (body.data ?? []).map((t: any) => {
    const u = users.get(t.author_id);
    const photo = (t.attachments?.media_keys ?? []).map((k: string) => media.get(k)).find((m: any) => m?.type === 'photo');
    return {
      id: t.id,
      text: t.text,
      authorId: t.author_id,
      authorHandle: u?.username ?? 'unknown',
      authorAvatar: u?.profile_image_url?.replace('_normal', '_400x400'),
      imageUrl: photo?.url,
    };
  });
  // X returns newest first; process oldest first
  mentions.reverse();
  return { mentions, newestId: body.meta?.newest_id };
}

// ---- OAuth 1.0a signing for POST /2/tweets ----
const enc = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());

function oauthHeader(method: string, url: string): string {
  const p: Record<string, string> = {
    oauth_consumer_key: config.x.apiKey(),
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: config.x.accessToken(),
    oauth_version: '1.0',
  };
  const paramStr = Object.keys(p).sort().map(k => `${enc(k)}=${enc(p[k])}`).join('&');
  const base = [method.toUpperCase(), enc(url), enc(paramStr)].join('&');
  const key = `${enc(config.x.apiSecret())}&${enc(config.x.accessSecret())}`;
  p.oauth_signature = crypto.createHmac('sha1', key).update(base).digest('base64');
  return 'OAuth ' + Object.keys(p).sort().map(k => `${enc(k)}="${enc(p[k])}"`).join(', ');
}

export async function reply(toTweetId: string, text: string): Promise<void> {
  if (!config.x.replyEnabled) { console.log(`[reply disabled] -> ${toTweetId}: ${text}`); return; }
  const url = 'https://api.x.com/2/tweets';
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: oauthHeader('POST', url), 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, reply: { in_reply_to_tweet_id: toTweetId } }),
  });
  if (!res.ok) console.error(`X reply failed ${res.status}: ${await res.text()}`);
}
