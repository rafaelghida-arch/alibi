import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import path from 'path';
import { DEMO_CASE } from './demo-case';
import type { CaseFile } from './types';

// ---------------- Supabase (optional) ----------------
let admin: SupabaseClient | null = null;
export function supabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!admin) admin = createClient(url, key, { auth: { persistSession: false } });
  return admin;
}

export async function userFromRequest(req: Request): Promise<{ id: string; email?: string } | null> {
  const sb = supabaseAdmin();
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!sb || !token) return null;
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? undefined };
}

// ---------------- Case storage ----------------
const DATA_DIR = path.join(process.cwd(), '.data', 'cases');
const memory = new Map<string, CaseFile>();

export async function getCase(id: string): Promise<CaseFile | null> {
  if (id === 'demo') return DEMO_CASE;
  if (!/^[a-zA-Z0-9-]{6,64}$/.test(id)) return null;
  if (memory.has(id)) return memory.get(id)!;
  const sb = supabaseAdmin();
  if (sb) {
    const { data } = await sb.from('cases').select('data').eq('id', id).maybeSingle();
    if (data?.data) {
      memory.set(id, data.data as CaseFile);
      return data.data as CaseFile;
    }
    return null;
  }
  try {
    const cf = JSON.parse(await fs.readFile(path.join(DATA_DIR, `${id}.json`), 'utf8')) as CaseFile;
    memory.set(id, cf);
    return cf;
  } catch {
    return null;
  }
}

export async function saveCase(cf: CaseFile, userId: string | null, difficulty: string) {
  memory.set(cf.id, cf);
  const sb = supabaseAdmin();
  if (sb) {
    const { error } = await sb.from('cases').insert({
      id: cf.id, user_id: userId, difficulty, logic_type: cf.logicType, setting: cf.setting, title: cf.title, data: cf,
    });
    if (error) throw new Error(`Falha ao salvar o caso: ${error.message}`);
    return;
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(path.join(DATA_DIR, `${cf.id}.json`), JSON.stringify(cf));
}

export async function recentStructures(userId: string | null): Promise<{ logicType: string; setting: string }[]> {
  const sb = supabaseAdmin();
  if (!sb || !userId) return [];
  const { data } = await sb.from('cases').select('logic_type, setting').eq('user_id', userId).order('created_at', { ascending: false }).limit(5);
  return (data ?? []).map((r) => ({ logicType: r.logic_type, setting: r.setting }));
}

// ---------------- Entitlement ----------------
export const PRICE_CENTS = () => Number(process.env.SUBSCRIPTION_PRICE_CENTS || 2990);
export const MONTHLY_LIMIT = () => Number(process.env.GENERATION_LIMIT_PER_MONTH || 30);
export const devUnlocked = () => process.env.ALIBI_DEV_UNLOCK === 'true' && process.env.NODE_ENV !== 'production';

export interface Account {
  signedIn: boolean;
  subscribed: boolean;
  status: string | null;
  used: number;
  limit: number;
  periodEnd: string | null;
  canGenerate: boolean;
  dev: boolean;
}

export async function accountFor(user: { id: string } | null): Promise<Account> {
  const limit = MONTHLY_LIMIT();
  if (devUnlocked()) return { signedIn: !!user, subscribed: true, status: 'dev', used: 0, limit, periodEnd: null, canGenerate: true, dev: true };
  const sb = supabaseAdmin();
  if (!sb || !user) return { signedIn: !!user, subscribed: false, status: null, used: 0, limit, periodEnd: null, canGenerate: false, dev: false };
  const { data: sub } = await sb.from('subscriptions').select('status, current_period_start, current_period_end').eq('user_id', user.id).maybeSingle();
  const active = !!sub && ['active', 'trialing'].includes(sub.status);
  const since = sub?.current_period_start ?? new Date(Date.now() - 30 * 864e5).toISOString();
  const { count } = await sb.from('cases').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', since);
  const used = count ?? 0;
  return {
    signedIn: true, subscribed: active, status: sub?.status ?? null, used, limit,
    periodEnd: sub?.current_period_end ?? null, canGenerate: active && used < limit, dev: false,
  };
}
