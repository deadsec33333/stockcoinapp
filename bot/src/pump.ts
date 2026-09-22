// Creates coins and claims creator fees through the PumpPortal Lightning API.
// The Lightning API key is linked to a PumpPortal-managed wallet: it pays launch costs and is the coin "creator".
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { config } from './config.js';

const API = () => `https://pumpportal.fun/api/trade?api-key=${config.pump.apiKey()}`;

export async function createCoin(meta: { name: string; ticker: string; uri: string }): Promise<{ mint: string; signature: string }> {
  const mintKeypair = Keypair.generate();
  const res = await fetch(API(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'create',
      tokenMetadata: { name: meta.name, symbol: meta.ticker, uri: meta.uri },
      mint: bs58.encode(mintKeypair.secretKey),
      denominatedInSol: 'true',
      amount: config.pump.devBuySol,
      slippage: 10,
      priorityFee: config.pump.priorityFee,
      pool: 'pump',
    }),
  });
  const body: any = await res.json().catch(() => ({}));
  if (!res.ok || !body.signature) throw new Error(`PumpPortal create failed ${res.status}: ${JSON.stringify(body)}`);
  return { mint: mintKeypair.publicKey.toBase58(), signature: body.signature };
}

export async function claimCreatorFees(): Promise<string> {
  const res = await fetch(API(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'collectCreatorFee', priorityFee: 0.000001, pool: 'pump' }),
  });
  const body: any = await res.json().catch(() => ({}));
  if (!res.ok || !body.signature) throw new Error(`PumpPortal fee claim failed ${res.status}: ${JSON.stringify(body)}`);
  return body.signature;
}
