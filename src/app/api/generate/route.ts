import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { accountFor, recentStructures, saveCase, userFromRequest } from '@/lib/server';
import { aiConfigured, generateCase } from '@/lib/ai';
import { DIFFICULTIES, type Difficulty } from '@/lib/types';

export const maxDuration = 300; // texto + imagens
const inFlight = new Set<string>();

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const d = body?.d as Difficulty;
  if (!DIFFICULTIES.includes(d)) return NextResponse.json({ error: 'Dificuldade inválida' }, { status: 400 });
  const user = await userFromRequest(req);
  const acc = await accountFor(user);
  if (!acc.canGenerate) {
    const msg = !acc.signedIn ? 'Entre na sua conta para gerar casos.' : !acc.subscribed ? 'Gerar novos casos é exclusivo para assinantes.' : `Você atingiu o limite de ${acc.limit} casos neste período.`;
    return NextResponse.json({ error: msg, account: acc }, { status: 402 });
  }
  if (!aiConfigured()) return NextResponse.json({ error: 'O gerador de casos não está configurado neste servidor.' }, { status: 503 });
  const key = user?.id ?? 'dev';
  if (inFlight.has(key)) return NextResponse.json({ error: 'Já existe um caso sendo montado para você.' }, { status: 429 });
  inFlight.add(key);
  try {
    const id = randomUUID();
    const cf = await generateCase(d, id, await recentStructures(user?.id ?? null));
    await saveCase(cf, user?.id ?? null, d);
    return NextResponse.json({ id, d });
  } catch (e) {
    console.error('[generate]', e);
    return NextResponse.json({ error: 'Não conseguimos montar um caso consistente agora. Nada foi descontado do seu limite.' }, { status: 502 });
  } finally {
    inFlight.delete(key);
  }
}
