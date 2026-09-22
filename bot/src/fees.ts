// Creator fees -> holders.
//   npm run fees:claim   claim all pump.fun creator fees into the PumpPortal wallet
//   npm run fees:plan    split an amount of SOL across holders of every live coin (writes 'planned' rows, sends nothing)
//   npm run fees:pay     send the planned payouts from PAYOUT_WALLET (real money, run by hand)
//
// Split rule (v1, simple and transparent): the SOL you pass to fees:plan is divided equally between live coins,
// then inside each coin pro rata by balance among holders, skipping the bonding curve / pool accounts
// and anyone below MIN_SHARE_SOL.
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';
import { config } from './config.js';
import { db } from './db.js';
import { claimCreatorFees } from './pump.js';

const MIN_SHARE_SOL = 0.001;
const conn = new Connection(config.rpcUrl, 'confirmed');

async function holdersOf(mint: string): Promise<{ owner: string; amount: number }[]> {
  // Helius DAS getTokenAccounts, paginated
  const out = new Map<string, number>();
  for (let page = 1; page < 50; page++) {
    const res = await fetch(config.rpcUrl, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTokenAccounts', params: { mint, page, limit: 1000 } }),
    });
    const body: any = await res.json();
    const accts = body.result?.token_accounts ?? [];
    for (const a of accts) out.set(a.owner, (out.get(a.owner) ?? 0) + Number(a.amount));
    if (accts.length < 1000) break;
  }
  return [...out].map(([owner, amount]) => ({ owner, amount })).filter(h => h.amount > 0);
}

async function isOnCurve(addr: string) {
  try { return PublicKey.isOnCurve(new PublicKey(addr).toBytes()); } catch { return false; }
}

async function plan(totalSol: number) {
  const { data: coins } = await db.from('launches').select('id, ticker, mint').eq('status', 'live');
  if (!coins?.length) return console.log('no live coins');
  const perCoin = totalSol / coins.length;

  for (const c of coins) {
    const all = await holdersOf(c.mint!);
    // program owned accounts (bonding curve, AMM pools) are off curve: skip them
    const holders = [];
    for (const h of all) if (await isOnCurve(h.owner)) holders.push(h);
    const supply = holders.reduce((s, h) => s + h.amount, 0);
    const rows = holders
      .map(h => ({ launch_id: c.id, holder: h.owner, amount_sol: +(perCoin * h.amount / supply).toFixed(6) }))
      .filter(r => r.amount_sol >= MIN_SHARE_SOL);
    if (rows.length) await db.from('payouts').insert(rows);
    console.log(`$${c.ticker}: ${rows.length} holders planned, ${perCoin.toFixed(4)} SOL`);
  }
}

async function pay() {
  const payer = Keypair.fromSecretKey(bs58.decode(config.payoutSecret()));
  const { data: rows } = await db.from('payouts').select('*').eq('status', 'planned').limit(500);
  for (const r of rows ?? []) {
    try {
      const tx = new Transaction().add(SystemProgram.transfer({
        fromPubkey: payer.publicKey, toPubkey: new PublicKey(r.holder), lamports: Math.floor(r.amount_sol * LAMPORTS_PER_SOL),
      }));
      const sig = await sendAndConfirmTransaction(conn, tx, [payer]);
      await db.from('payouts').update({ status: 'sent', tx_signature: sig }).eq('id', r.id);
    } catch (e: any) {
      await db.from('payouts').update({ status: 'failed' }).eq('id', r.id);
      console.error(`payout ${r.id} failed: ${e.message}`);
    }
  }
  console.log(`processed ${rows?.length ?? 0} payouts`);
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === 'claim') {
  const sig = await claimCreatorFees();
  await db.from('fee_claims').insert({ tx_signature: sig });
  console.log('claimed, tx', sig);
} else if (cmd === 'plan') {
  const sol = Number(arg);
  if (!(sol > 0)) throw new Error('usage: npm run fees:plan -- 1.5   (SOL to distribute)');
  await plan(sol);
} else if (cmd === 'pay') {
  await pay();
} else {
  console.log('usage: claim | plan <SOL> | pay');
}
