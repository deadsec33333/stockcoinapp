import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

export const db = createClient(config.supabase.url(), config.supabase.key(), { auth: { persistSession: false } });

export async function getState(key: string): Promise<string | undefined> {
  const { data } = await db.from('bot_state').select('value').eq('key', key).maybeSingle();
  return data?.value;
}
export async function setState(key: string, value: string) {
  await db.from('bot_state').upsert({ key, value });
}
