import type { AccusationInput, CaseFile, Clue, Difficulty, PublicCase, Verdict } from './types';

const uniq = <T,>(a: T[]) => Array.from(new Set(a));

/** Clues that the player can reach before accusing, for one difficulty. */
export function accessibleClueIds(cf: CaseFile, d: Difficulty): string[] {
  switch (d) {
    case 'facil': {
      const s = cf.facil;
      if (!s) return [];
      return uniq([...s.stages.flatMap((x) => x.clueIds), ...s.conclusionClueIds]);
    }
    case 'medio': {
      const s = cf.medio;
      if (!s) return [];
      return uniq([...s.initialClueIds, ...s.interviews.flatMap((i) => i.clueIds), ...s.deductions.flatMap((x) => x.unlocks)]);
    }
    case 'dificil': {
      const s = cf.dificil;
      if (!s) return [];
      return uniq([...s.clueIds, ...s.lockedClueIds]);
    }
    case 'extreme':
      return cf.extreme ? uniq(cf.extreme.clueIds) : [];
  }
}

export function publicView(cf: CaseFile, d: Difficulty): PublicCase {
  const ids = new Set(accessibleClueIds(cf, d));
  const clues = cf.clues.filter((c) => ids.has(c.id));
  const base: PublicCase = {
    id: cf.id,
    number: cf.number,
    title: cf.title,
    isDemo: cf.isDemo,
    difficulty: d,
    intro: cf.intro,
    mission: cf.mission,
    characters: cf.characters,
    suspectIds: cf.suspectIds,
    clues,
    accusation: cf.accusation,
  };
  if (d === 'facil') base.facil = cf.facil;
  if (d === 'medio' && cf.medio) base.medio = { ...cf.medio, required: cf.secret.medio?.required ?? cf.medio.deductions.length };
  if (d === 'dificil' && cf.dificil) base.dificil = { ...cf.dificil, confrontableIds: cf.characters.map((c) => c.id) };
  if (d === 'extreme') base.extreme = cf.extreme;
  return base;
}

// ----------------------------------------------------------------------------
// Validation (used for AI output and in tests for the demo)
// ----------------------------------------------------------------------------
function clueShapeErrors(c: Clue): string[] {
  const e: string[] = [];
  const has = (k: keyof Clue) => Array.isArray(c[k]) && (c[k] as unknown[]).length > 0;
  switch (c.kind) {
    case 'photo':
      if (!c.scene || !has('marks')) e.push(`${c.id}: fotografia precisa de scene e marks`);
      break;
    case 'chat':
      if (!has('messages')) e.push(`${c.id}: conversa precisa de messages`);
      break;
    case 'map':
      if (!has('places')) e.push(`${c.id}: mapa precisa de places`);
      break;
    case 'audio':
      if (!has('transcript')) e.push(`${c.id}: gravação precisa de transcript`);
      break;
    case 'statement':
    case 'note':
      if (!has('paragraphs')) e.push(`${c.id}: ${c.kind} precisa de paragraphs`);
      break;
    default:
      if (!has('lines') && !has('paragraphs')) e.push(`${c.id}: ${c.kind} precisa de lines ou paragraphs`);
  }
  for (const m of c.marks ?? []) if (m.x < 0 || m.x > 100 || m.y < 0 || m.y > 100) e.push(`${c.id}: mark fora de 0-100`);
  for (const p of c.places ?? []) if (p.x < 0 || p.x > 100 || p.y < 0 || p.y > 100) e.push(`${c.id}: place fora de 0-100`);
  for (const r of c.routes ?? []) {
    const ids = new Set((c.places ?? []).map((p) => p.id));
    if (!ids.has(r.from) || !ids.has(r.to)) e.push(`${c.id}: rota aponta para lugar inexistente`);
  }
  return e;
}

export function validateCase(cf: CaseFile, d: Difficulty): string[] {
  const e: string[] = [];
  const clueIds = new Set(cf.clues.map((c) => c.id));
  const charIds = new Set(cf.characters.map((c) => c.id));
  if (clueIds.size !== cf.clues.length) e.push('IDs de pistas duplicados');
  if (charIds.size !== cf.characters.length) e.push('IDs de personagens duplicados');
  for (const c of cf.clues) e.push(...clueShapeErrors(c));
  for (const c of cf.clues) if (c.speakerId && !charIds.has(c.speakerId)) e.push(`${c.id}: speakerId inexistente`);
  if (!cf.intro?.paragraphs?.length) e.push('intro sem parágrafos');
  if (!cf.mission) e.push('missão vazia');
  if (cf.suspectIds.length < 3) e.push('é preciso ao menos 3 suspeitos');
  for (const s of cf.suspectIds) if (!charIds.has(s)) e.push(`suspeito inexistente: ${s}`);
  const sec = cf.secret;
  if (!sec) return [...e, 'secret ausente'];
  if (!cf.suspectIds.includes(sec.truth.culpritId)) e.push('culpado não está entre os suspeitos');

  const fields = cf.accusation?.fields ?? [];
  const culpado = fields.find((f) => f.id === 'culpado');
  if (!culpado) e.push('campo de acusação "culpado" ausente');
  else {
    const opts = new Set(culpado.options.map((o) => o.id));
    for (const s of cf.suspectIds) if (!opts.has(s)) e.push(`culpado: falta opção para ${s}`);
  }
  if (sec.answers?.culpado !== sec.truth.culpritId) e.push('answers.culpado diferente do culpado da verdade');
  for (const f of fields) {
    const ans = sec.answers?.[f.id];
    if (!ans || !f.options.some((o) => o.id === ans)) e.push(`campo ${f.id}: resposta inválida`);
    if (f.options.length < 3) e.push(`campo ${f.id}: poucas opções`);
  }

  const access = new Set(accessibleClueIds(cf, d));
  if (access.size === 0) e.push(`seção ${d} ausente`);
  for (const id of access) if (!clueIds.has(id)) e.push(`pista referenciada inexistente: ${id}`);

  // Key deductions must be provable with what the player can reach.
  const kds = sec.keyDeductions ?? [];
  if (!kds.some((k) => k.decisive)) e.push('nenhuma dedução decisiva');
  for (const k of kds) {
    const ok = k.evidenceSets.some((set) => set.length > 0 && set.every((id) => access.has(id)));
    if (!ok) e.push(`dedução ${k.id}: nenhuma combinação de evidências acessível em ${d}`);
  }
  for (const t of sec.truth.timeline) for (const id of t.clueIds) if (!clueIds.has(id)) e.push(`cronologia: pista inexistente ${id}`);

  if (d === 'facil' && cf.facil) {
    const st = cf.facil.stages;
    if (st.length !== 3) e.push('Fácil precisa de exatamente 3 etapas');
    const seen = new Set<string>();
    for (const s of st) {
      s.clueIds.forEach((id) => seen.add(id));
      const a = sec.facil?.stages?.[s.id];
      if (!a) {
        e.push(`etapa ${s.id}: sem gabarito`);
        continue;
      }
      if (!s.options.some((o) => o.id === a.answer)) e.push(`etapa ${s.id}: resposta não está nas opções`);
      if (!a.evidence?.length || !a.evidence.every((id) => seen.has(id))) e.push(`etapa ${s.id}: evidência não acessível até esta etapa`);
      if (!a.hint || !a.establishes) e.push(`etapa ${s.id}: falta dica ou descoberta`);
    }
  }
  if (d === 'medio' && cf.medio) {
    const m = cf.medio;
    const ms = sec.medio;
    if (!ms) e.push('gabarito do Médio ausente');
    else {
      const avail = new Set([...m.initialClueIds, ...m.interviews.flatMap((i) => i.clueIds)]);
      const claimIds = new Set(m.claims.map((c) => c.id));
      for (const ded of m.deductions) {
        const link = ms.links.find((l) => l.deductionId === ded.id);
        if (!link) {
          e.push(`dedução ${ded.id}: sem ligação`);
          continue;
        }
        if (!claimIds.has(link.claimId)) e.push(`dedução ${ded.id}: afirmação inexistente`);
        if (!link.pairs.some(([a, b]) => avail.has(a) && avail.has(b))) e.push(`dedução ${ded.id}: nenhum par acessível antes dela`);
        ded.unlocks.forEach((id) => avail.add(id));
      }
      if (ms.required > m.deductions.length || ms.required < 1) e.push('Médio: required inválido');
      if (m.claims.length < m.deductions.length + 3) e.push('Médio: faltam afirmações falsas');
      for (const i of m.interviews) if (!charIds.has(i.characterId)) e.push(`entrevista com personagem inexistente ${i.characterId}`);
    }
  }
  if (d === 'dificil' && cf.dificil) {
    const h = cf.dificil;
    const hs = sec.dificil;
    if (!hs) e.push('gabarito do Difícil ausente');
    else {
      const evIds = h.events.map((x) => x.id).sort().join();
      if ([...hs.eventOrder].sort().join() !== evIds) e.push('eventOrder não corresponde aos eventos');
      if (h.events.length < 6) e.push('Difícil: poucos eventos na cronologia');
      if (h.events.filter((x) => x.time).length >= h.events.length) e.push('Difícil: a cronologia precisa estar incompleta');
      const open = new Set(h.clueIds);
      for (const c of hs.confrontations) {
        if (!charIds.has(c.characterId)) e.push(`confronto com personagem inexistente ${c.characterId}`);
        if (!h.lockedClueIds.includes(c.unlocks)) e.push(`confronto desbloqueia pista não bloqueada ${c.unlocks}`);
        if (!c.clueIds.some((id) => open.has(id))) e.push(`confronto ${c.unlocks}: nenhuma evidência acessível`);
      }
    }
  }
  if (d === 'extreme' && cf.extreme && cf.extreme.clueIds.length < 12) e.push('Extreme precisa de ao menos 12 pistas');
  return e;
}

// ----------------------------------------------------------------------------
// Judging
// ----------------------------------------------------------------------------
export function checkEasyStage(cf: CaseFile, stageId: string, optionId: string) {
  const s = cf.secret.facil?.stages[stageId];
  if (!s) return { error: 'Etapa inválida' };
  return s.answer === optionId ? { correct: true, establishes: s.establishes, evidence: s.evidence } : { correct: false, hint: s.hint };
}

export function checkLink(cf: CaseFile, a: string, b: string, claimId: string, available: string[]) {
  const ms = cf.secret.medio;
  if (!ms || !cf.medio) return { error: 'Caso sem modo Médio' };
  const av = new Set(available);
  if (!av.has(a) || !av.has(b) || a === b) return { correct: false, message: 'Escolha duas evidências diferentes do seu dossiê.' };
  const link = ms.links.find((l) => l.claimId === claimId);
  const pairOk = link?.pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  if (link && pairOk) {
    const ded = cf.medio.deductions.find((d) => d.id === link.deductionId)!;
    return { correct: true, deductionId: link.deductionId, establishes: link.establishes, unlocks: ded.unlocks };
  }
  if (link) return { correct: false, message: 'A afirmação pode até ser verdadeira, mas essas duas evidências juntas não a demonstram.' };
  return { correct: false, message: 'Essas evidências não sustentam essa conclusão.' };
}

export function confront(cf: CaseFile, characterId: string, clueId: string) {
  const hs = cf.secret.dificil;
  if (!hs) return { error: 'Caso sem modo Difícil' };
  const c = hs.confrontations.find((x) => x.characterId === characterId && x.clueIds.includes(clueId));
  if (c) return { pertinent: true, reply: c.reply, unlocks: c.unlocks };
  return { pertinent: false, reply: hs.deflections[characterId] ?? 'Não tenho nada a dizer sobre isso.' };
}

function pairAccuracy(order: string[], truth: string[]): number {
  const pos = new Map(truth.map((id, i) => [id, i]));
  const o = order.filter((id) => pos.has(id));
  let ok = 0;
  let total = 0;
  for (let i = 0; i < o.length; i++)
    for (let j = i + 1; j < o.length; j++) {
      total++;
      if (pos.get(o[i])! < pos.get(o[j])!) ok++;
    }
  return total ? ok / total : 0;
}

export function judgeAccusation(cf: CaseFile, d: Difficulty, input: AccusationInput): Verdict {
  const sec = cf.secret;
  const cited = new Set(input.citedClueIds ?? []);
  const access = new Set(accessibleClueIds(cf, d));
  const nameOf = (id: string) => cf.characters.find((c) => c.id === id)?.name ?? '—';

  const fields = cf.accusation.fields.map((f) => {
    const chosen = input.answers?.[f.id] ?? '';
    const right = sec.answers[f.id];
    return {
      id: f.id,
      question: f.question,
      chosen: f.options.find((o) => o.id === chosen)?.text ?? 'Sem resposta',
      correct: chosen === right,
      correctText: f.options.find((o) => o.id === right)?.text ?? '',
      explanation: sec.explanations[f.id] ?? '',
    };
  });
  const deductions = sec.keyDeductions
    .filter((k) => k.evidenceSets.some((s) => s.every((id) => access.has(id))))
    .map((k) => ({
      id: k.id,
      statement: k.statement,
      supported: k.evidenceSets.some((s) => s.every((id) => cited.has(id))),
      missedTip: k.missedTip,
      decisive: !!k.decisive,
    }));

  const culpritCorrect = input.answers?.culpado === sec.truth.culpritId;
  const other = fields.filter((f) => f.id !== 'culpado');
  const fieldScore = other.length ? other.filter((f) => f.correct).length / other.length : 1;
  const dedScore = deductions.length ? deductions.filter((x) => x.supported).length / deductions.length : 1;
  let score = (culpritCorrect ? 40 : 0) + fieldScore * 30 + dedScore * 30;
  let timelineAccuracy: number | undefined;
  if (d === 'dificil' && sec.dificil && input.timelineOrder?.length) {
    timelineAccuracy = pairAccuracy(input.timelineOrder, sec.dificil.eventOrder);
    score = score * 0.85 + timelineAccuracy * 15;
  }
  const decisiveOk = deductions.filter((x) => x.decisive).every((x) => x.supported);
  return {
    solved: culpritCorrect && decisiveOk,
    score: Math.round(score),
    culpritCorrect,
    culpritName: nameOf(sec.truth.culpritId),
    fields,
    deductions,
    timelineAccuracy,
    truth: { ...sec.truth, timeline: sec.truth.timeline.map((t) => ({ ...t, clueIds: t.clueIds.filter((id) => access.has(id)) })) },
  };
}
