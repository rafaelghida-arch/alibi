import { DEMO_CASE } from '../src/lib/demo-case';
import { validateCase, publicView, checkEasyStage, checkLink, confront, judgeAccusation, accessibleClueIds } from '../src/lib/case-logic';
import { DIFFICULTIES } from '../src/lib/types';
import { mockCase, repairCase } from '../src/lib/ai';

let fail = 0;
const ok = (cond: unknown, msg: string) => { if (!cond) { fail++; console.error('✗', msg); } else console.log('✓', msg); };

for (const d of DIFFICULTIES) {
  const errs = validateCase(DEMO_CASE, d);
  ok(errs.length === 0, `demo válido em ${d}${errs.length ? ': ' + errs.join('; ') : ''}`);
  const pub = JSON.stringify(publicView(DEMO_CASE, d));
  ok(!pub.includes('"secret"') && !pub.includes('culpritId') && !pub.includes('eventOrder'), `visão pública de ${d} sem gabarito`);
  const good = judgeAccusation(DEMO_CASE, d, {
    answers: DEMO_CASE.secret.answers,
    citedClueIds: accessibleClueIds(DEMO_CASE, d),
    timelineOrder: DEMO_CASE.secret.dificil?.eventOrder,
  });
  ok(good.solved && good.score >= 95, `acusação completa resolve ${d} (nota ${good.score})`);
  const noEvidence = judgeAccusation(DEMO_CASE, d, { answers: DEMO_CASE.secret.answers, citedClueIds: [] });
  ok(!noEvidence.solved, `acusação sem evidências não resolve ${d}`);
  const wrong = judgeAccusation(DEMO_CASE, d, { answers: { ...DEMO_CASE.secret.answers, culpado: 'helena' }, citedClueIds: accessibleClueIds(DEMO_CASE, d) });
  ok(!wrong.solved, `culpado errado não resolve ${d}`);
}

// Fácil: respostas
for (const s of DEMO_CASE.facil!.stages) {
  ok((checkEasyStage(DEMO_CASE, s.id, DEMO_CASE.secret.facil!.stages[s.id].answer) as any).correct, `Fácil ${s.id} aceita a resposta certa`);
  ok((checkEasyStage(DEMO_CASE, s.id, 'a') as any).hint, `Fácil ${s.id} dá dica no erro`);
}
// Médio: percorre as deduções com as pistas liberadas
const m = DEMO_CASE.medio!;
let avail = [...m.initialClueIds, ...m.interviews.flatMap((i) => i.clueIds)];
for (const l of DEMO_CASE.secret.medio!.links) {
  const [a, b] = l.pairs.find(([x, y]) => avail.includes(x) && avail.includes(y))!;
  const r: any = checkLink(DEMO_CASE, b, a, l.claimId, avail);
  ok(r.correct, `Médio ${l.deductionId} via ${a}+${b}`);
  avail = [...avail, ...(r.unlocks ?? [])];
}
ok(!(checkLink(DEMO_CASE, 'log-servidor', 'foto-quadro', 'x-recado', avail) as any).correct, 'Médio rejeita afirmação falsa');
// Difícil: confrontos
ok((confront(DEMO_CASE, 'otavio', 'recibo-posto') as any).unlocks === 'nova-otavio', 'Difícil: confronto pertinente desbloqueia declaração');
ok(!(confront(DEMO_CASE, 'marta', 'recibo-posto') as any).pertinent, 'Difícil: confronto irrelevante não desbloqueia');
// Mock de IA passa pela mesma validação
for (const d of DIFFICULTIES) {
  const mc = mockCase(d, 'abc');
  ok(validateCase(mc, d).length === 0, `caso mock (${d}) válido`);
}
// Reparo automático de erros mecânicos da IA
for (const d of DIFFICULTIES) {
  const bad = mockCase(d, 'rep');
  bad.secret.answers.culpado = 'ninguem';
  bad.accusation.fields = bad.accusation.fields.filter((f) => f.id !== 'culpado');
  bad.clues[0].marks![0].x = 140;
  bad.secret.truth.timeline[0].clueIds.push('pista-inexistente');
  if (bad.dificil) bad.dificil.events.forEach((e) => (e.time = '00:00'));
  ok(validateCase(bad, d).length > 0 && validateCase(repairCase(bad, d), d).length === 0, `reparo automático corrige caso com defeitos (${d})`);
}
if (fail) { console.error(`\n${fail} falha(s)`); process.exit(1); }
console.log('\nTudo certo.');
