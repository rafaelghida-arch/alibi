import { NextResponse } from 'next/server';
import { getCase } from '@/lib/server';
import { checkEasyStage, checkLink, confront, judgeAccusation } from '@/lib/case-logic';
import { DIFFICULTIES, type Difficulty } from '@/lib/types';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const d = body?.d as Difficulty;
  if (!body || !DIFFICULTIES.includes(d)) return NextResponse.json({ error: 'Requisição inválida' }, { status: 400 });
  const cf = await getCase(id);
  if (!cf || !cf[d]) return NextResponse.json({ error: 'Caso não encontrado' }, { status: 404 });
  switch (body.type) {
    case 'stage':
      return NextResponse.json(checkEasyStage(cf, String(body.stageId), String(body.optionId)));
    case 'link':
      return NextResponse.json(checkLink(cf, String(body.a), String(body.b), String(body.claimId), Array.isArray(body.available) ? body.available : []));
    case 'confront':
      return NextResponse.json(confront(cf, String(body.characterId), String(body.clueId)));
    case 'timeline': {
      const truth = cf.secret.dificil?.eventOrder ?? [];
      const order: string[] = Array.isArray(body.order) ? body.order : [];
      return NextResponse.json({ correct: truth.filter((id, i) => order[i] === id).length, total: truth.length });
    }
    case 'accuse':
      return NextResponse.json(judgeAccusation(cf, d, {
        answers: body.answers ?? {},
        citedClueIds: Array.isArray(body.citedClueIds) ? body.citedClueIds : [],
        timelineOrder: Array.isArray(body.timelineOrder) ? body.timelineOrder : undefined,
        narrative: typeof body.narrative === 'string' ? body.narrative.slice(0, 5000) : undefined,
      }));
  }
  return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 });
}
