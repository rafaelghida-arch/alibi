import { NextResponse } from 'next/server';
import { getCase } from '@/lib/server';
import { publicView } from '@/lib/case-logic';
import { DIFFICULTIES, type Difficulty } from '@/lib/types';

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const d = new URL(req.url).searchParams.get('d') as Difficulty;
  if (!DIFFICULTIES.includes(d)) return NextResponse.json({ error: 'Dificuldade inválida' }, { status: 400 });
  const cf = await getCase(id);
  if (!cf) return NextResponse.json({ error: 'Caso não encontrado' }, { status: 404 });
  if (!cf[d]) return NextResponse.json({ error: 'Este caso não foi preparado para essa dificuldade' }, { status: 404 });
  return NextResponse.json(publicView(cf, d), { headers: { 'cache-control': 'private, max-age=3600' } });
}
