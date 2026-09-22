import assert from 'node:assert/strict';
import { parseLaunch } from '../src/parse.js';

const B = 'MyBot';
const cases: [string, any][] = [
  ['@MyBot $moon #aapl', { ok: true, ticker: 'MOON', stock: 'AAPL', name: 'MOON' }],
  ['@mybot $MOON #TSLA Moon Tesla Club', { ok: true, ticker: 'MOON', stock: 'TSLA', name: 'Moon Tesla Club' }],
  ['hey @MyBot launch $X9 #NVDA https://t.co/abc', { ok: true, ticker: 'X9', stock: 'NVDA', name: 'hey launch' }],
  ['@MyBot $A #AAPL', { ok: false, reason: 'no $TICKER found' }],
  ['@MyBot $ONE $TWO #AAPL', { ok: false, reason: 'use only one $TICKER' }],
  ['@MyBot $ONE', { ok: false, reason: 'no #STOCK found' }],
  ['@MyBot $ONE #AAPL #TSLA', { ok: false, reason: 'use only one #STOCK' }],
  ['$ONE #AAPL', { ok: false, reason: 'bot not mentioned' }],
  ['@MyBot $CAT #BRK.B', { ok: true, ticker: 'CAT', stock: 'BRK.B', name: 'CAT' }],
];
for (const [text, want] of cases) {
  assert.deepEqual(parseLaunch(text, B), want, text);
}
console.log(`parse: ${cases.length} cases passed`);
