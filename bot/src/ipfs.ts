// Uploads coin image + metadata JSON to IPFS through Pinata.
import { config } from './config.js';

async function pin(file: Blob, filename: string): Promise<string> {
  const form = new FormData();
  form.append('file', file, filename);
  form.append('network', 'public');
  const res = await fetch('https://uploads.pinata.cloud/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.pinataJwt()}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Pinata ${res.status}: ${await res.text()}`);
  const body: any = await res.json();
  return `https://ipfs.io/ipfs/${body.data.cid}`;
}

export async function uploadCoinMetadata(opts: {
  name: string; ticker: string; imageSourceUrl: string; description: string; tweetUrl: string;
}): Promise<{ imageUrl: string; metadataUri: string }> {
  const img = await fetch(opts.imageSourceUrl);
  if (!img.ok) throw new Error(`could not download image ${opts.imageSourceUrl}`);
  const imageUrl = await pin(await img.blob(), `${opts.ticker}.png`);

  const meta = {
    name: opts.name,
    symbol: opts.ticker,
    description: opts.description,
    image: imageUrl,
    showName: true,
    twitter: opts.tweetUrl,
    website: config.siteUrl,
  };
  const metadataUri = await pin(new Blob([JSON.stringify(meta)], { type: 'application/json' }), `${opts.ticker}.json`);
  return { imageUrl, metadataUri };
}
