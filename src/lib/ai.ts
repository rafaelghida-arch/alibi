import { z } from 'zod';
import { DEMO_CASE } from './demo-case';
import { validateCase } from './case-logic';
import type { CaseFile, Difficulty } from './types';

// ---------------------------------------------------------------------------
// Schema (structure). Semantic checks live in validateCase().
// ---------------------------------------------------------------------------
const opt = z.object({ id: z.string(), text: z.string() });
const clue = z.object({
  id: z.string(),
  kind: z.enum(['photo', 'ticket', 'receipt', 'note', 'chat', 'map', 'agenda', 'statement', 'calllog', 'audio', 'document', 'log']),
  title: z.string(),
  subtitle: z.string().optional(),
  paragraphs: z.array(z.string()).optional(),
  lines: z.array(z.object({ label: z.string().optional(), text: z.string() })).optional(),
  back: z.string().optional(),
  speakerId: z.string().optional(),
  messages: z.array(z.object({ from: z.string(), time: z.string(), text: z.string() })).optional(),
  scene: z.string().optional(),
  marks: z.array(z.object({ id: z.string(), x: z.number(), y: z.number(), label: z.string(), detail: z.string() })).optional(),
  places: z.array(z.object({ id: z.string(), label: z.string(), x: z.number(), y: z.number(), note: z.string().optional() })).optional(),
  routes: z.array(z.object({ from: z.string(), to: z.string(), label: z.string().optional() })).optional(),
  transcript: z.array(z.object({ speaker: z.string(), text: z.string() })).optional(),
  imagePrompt: z.string().optional(),
});
const caseSchema = z.object({
  number: z.string(),
  title: z.string(),
  logicType: z.string(),
  setting: z.string(),
  intro: z.object({ location: z.string(), date: z.string(), photo: clue, paragraphs: z.array(z.string()).min(2) }),
  mission: z.string(),
  characters: z.array(z.object({ id: z.string(), name: z.string(), age: z.number().optional(), role: z.string(), bio: z.string() })).min(4),
  suspectIds: z.array(z.string()).min(3),
  clues: z.array(clue).min(8),
  accusation: z.object({ fields: z.array(z.object({ id: z.string(), question: z.string(), options: z.array(opt) })).min(3) }),
  facil: z.object({
    stages: z.array(z.object({ id: z.string(), title: z.string(), clueIds: z.array(z.string()), question: z.string(), options: z.array(opt) })),
    conclusionClueIds: z.array(z.string()),
  }).optional(),
  medio: z.object({
    initialClueIds: z.array(z.string()),
    interviews: z.array(z.object({ characterId: z.string(), clueIds: z.array(z.string()) })),
    claims: z.array(opt),
    deductions: z.array(z.object({ id: z.string(), label: z.string(), hint: z.string(), unlocks: z.array(z.string()) })),
  }).optional(),
  dificil: z.object({
    clueIds: z.array(z.string()),
    lockedClueIds: z.array(z.string()),
    events: z.array(z.object({ id: z.string(), text: z.string(), time: z.string().optional() })),
  }).optional(),
  extreme: z.object({ clueIds: z.array(z.string()) }).optional(),
  secret: z.object({
    truth: z.object({
      summary: z.string(),
      culpritId: z.string(),
      motive: z.string(),
      method: z.string(),
      timeline: z.array(z.object({ time: z.string(), text: z.string(), clueIds: z.array(z.string()) })),
    }),
    answers: z.record(z.string(), z.string()),
    explanations: z.record(z.string(), z.string()),
    keyDeductions: z.array(z.object({
      id: z.string(), statement: z.string(), evidenceSets: z.array(z.array(z.string())), missedTip: z.string(), decisive: z.boolean().optional(),
    })),
    facil: z.object({ stages: z.record(z.string(), z.object({ answer: z.string(), establishes: z.string(), hint: z.string(), evidence: z.array(z.string()) })) }).optional(),
    medio: z.object({
      required: z.number(),
      links: z.array(z.object({ deductionId: z.string(), claimId: z.string(), pairs: z.array(z.tuple([z.string(), z.string()])), establishes: z.string() })),
    }).optional(),
    dificil: z.object({
      eventOrder: z.array(z.string()),
      confrontations: z.array(z.object({ characterId: z.string(), clueIds: z.array(z.string()), unlocks: z.string(), reply: z.string() })),
      deflections: z.record(z.string(), z.string()),
    }).optional(),
  }),
});

export const LOGIC_TYPES = [
  'troca de identidade: alguém se passou por outra pessoa em um momento-chave',
  'reconstruir uma sequência: um efeito visível é consequência de um ato anterior',
  'duas testemunhas descrevem momentos diferentes e ambas dizem a verdade',
  'um relógio, carimbo ou registro está adiantado ou atrasado',
  'álibi apoiado em registro digital que pode ter sido feito por outra pessoa',
  'objeto fora do lugar revela quem esteve ali',
  'detalhe que só o responsável poderia saber aparece em um depoimento',
  'documento adulterado: duas versões do mesmo papel não batem',
];
const SETTINGS = [
  'feira livre de bairro em capital do Nordeste', 'pousada em cidade histórica de Minas', 'redação de jornal local',
  'escola de samba às vésperas do desfile', 'barco de passageiros na Amazônia', 'vinícola na Serra Gaúcha',
  'clube de xadrez de São Paulo', 'estação de rádio comunitária', 'museu de cidade do interior', 'condomínio à beira-mar em Santa Catarina',
  'oficina de restauração de azulejos em Salvador', 'teatro municipal durante ensaio geral', 'confeitaria tradicional no Rio',
];

const SPEC = `Formato (TypeScript) do JSON que você deve devolver:
{
 number: string (4 dígitos), title, logicType, setting,
 intro: { location, date, photo: Clue(kind "photo"), paragraphs: string[] (3-4 frases curtas; comece apresentando uma pessoa pelo nome: "Conheça X." e termine com uma situação concreta e intrigante; NUNCA comece com telefonema) },
 mission: string (objetivo específico e verificável),
 characters: {id,name,age,role,bio}[] (4-6, ids em minúsculas sem acento),
 suspectIds: string[] (3-4),
 clues: Clue[],
 accusation: { fields: [{id:"culpado",question,options:[{id:<suspectId>,text:<nome>}]}, {id:"metodo",...4 opções}, {id:"motivo",...4 opções}, opcional 1 campo extra] },
 <SEÇÃO DA DIFICULDADE>,
 secret: {
  truth: { summary, culpritId, motive, method, timeline: {time,text,clueIds}[] (8-12 itens em ordem) },
  answers: { [fieldId]: optionId }, explanations: { [fieldId]: string },
  keyDeductions: { id, statement, evidenceSets: string[][] (combinações alternativas de IDs de pistas que provam a dedução), missedTip (como o jogador poderia ter percebido), decisive?: true }[] (4-5; exatamente 1-2 decisivas que distinguem o culpado dos outros suspeitos),
  <SECRET DA DIFICULDADE>
 }
}
Clue = { id (kebab-case), kind: "photo"|"ticket"|"receipt"|"note"|"chat"|"map"|"agenda"|"statement"|"calllog"|"audio"|"document"|"log", title, subtitle?,
 paragraphs? (statement, note, document), lines? {label?,text}[] (receipt, ticket, log, agenda, calllog, document), back? (texto escrito no verso do papel),
 speakerId? (statement), messages? {from,time,text}[] (chat), scene + marks {id,x,y(0-100),label,detail}[] (photo: 3-4 detalhes ampliáveis),
 places {id,label,x,y,note?}[] + routes {from,to,label?}[] (map), transcript {speaker,text}[] (audio),
 imagePrompt? (OBRIGATÓRIO em toda photo, inclusive intro.photo: descrição visual da cena em uma frase, com os objetos dos marks nas posições aproximadas; sem texto legível, sem rostos reconhecíveis) }
Inclua de 2 a 3 pistas kind "photo" além da foto da introdução.`;

const SECTION: Record<Difficulty, string> = {
  facil: `facil: { stages: [3 x {id:"s1"|"s2"|"s3", title, clueIds (3-4 pistas novas), question (dedutível das pistas desta etapa e anteriores), options: 4 x {id:"a".."d", text}}], conclusionClueIds: (2-3 pistas para a conclusão) }
secret.facil: { stages: { s1: {answer, establishes (o que a descoberta estabelece, 1-2 frases), hint (convida a reler um detalhe específico, sem entregar), evidence: [ids]}, s2..., s3... } }
Cada etapa deve avançar o mistério final. Total de pistas: 12-15.`,
  medio: `medio: { initialClueIds (3-4), interviews: [{characterId, clueIds (depoimento + 0-1 documento)}] (um por personagem), claims: [{id,text}] (as afirmações verdadeiras das deduções + pelo menos 4 falsas plausíveis, embaralhadas), deductions: [{id:"d1"..,label (curto, sem entregar), hint, unlocks: [ids de pistas que entram no dossiê ao acertar]}] (4-5) }
secret.medio: { required (3), links: [{deductionId, claimId, pairs: [[idA,idB], ...] (todas as combinações válidas, incluindo alternativas), establishes}] }
Cada par precisa usar pistas acessíveis antes da dedução (iniciais, entrevistas ou desbloqueadas por deduções anteriores). Total de pistas: 14-17.`,
  dificil: `dificil: { clueIds (16-20 pistas abertas, incluindo depoimentos conflitantes e documentos), lockedClueIds (3-4 declarações novas, kind "statement", só liberadas por confronto), events: [{id, text, time?}] (10-13 eventos; só 2-3 com horário visível; os demais o jogador ordena a partir das pistas) }
secret.dificil: { eventOrder: [ids em ordem real], confrontations: [{characterId, clueIds (evidências que tornam o confronto pertinente), unlocks (id bloqueado), reply (reação curta)}], deflections: {[characterId]: resposta evasiva} }
Não marque qual depoimento contém a contradição.`,
  extreme: `extreme: { clueIds (18-22 pistas, incluindo pistas ambíguas e falsas trilhas) }
Sem etapas nem perguntas intermediárias.`,
};

function buildPrompt(d: Difficulty, logic: string, setting: string, avoid: string[]) {
  return `Crie um caso ORIGINAL de investigação para o jogo ÁLIBI, em português do Brasil, com tom de documentário true crime.
Dificuldade: ${d}. Lógica do mistério: ${logic}. Ambiente: ${setting}.
${avoid.length ? `Evite repetir estas estruturas recentes do jogador: ${avoid.join(' | ')}.` : ''}
Regras:
- Pessoas, empresas e lugares fictícios. Crime não violento ou sem descrição gráfica.
- Primeiro decida a verdade completa (secret.truth): o que aconteceu, quem, por quê, cronologia real, e quais evidências provam cada conclusão. Depois escreva o dossiê.
- Toda pergunta precisa ter resposta dedutível do material já acessível. O desfecho nunca introduz a prova decisiva.
- A conclusão precisa distinguir o culpado dos outros suspeitos por evidências, não por intuição. Dê a cada suspeito inocente algo suspeito mas explicável.
- Misture formatos (pelo menos 6 kinds diferentes, incluindo 1 audio e 1 photo). Horários e valores precisam ser coerentes entre documentos.
- IDs consistentes: toda referência aponta para um id existente.
${SECTION[d]}
${SPEC}
Responda APENAS com o JSON, sem comentários nem markdown.`;
}

function extractJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '');
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  return JSON.parse(t.slice(start, end + 1));
}

type Msg = { role: 'user' | 'assistant'; content: string };

async function callModel(messages: Msg[]): Promise<string> {
  const provider = process.env.AI_PROVIDER || 'anthropic';
  const key = process.env.AI_API_KEY?.trim().replace(/^["']|["']$/g, '');
  if (!key) throw new Error('AI_API_KEY ausente');
  if (provider === 'anthropic' && !key.startsWith('sk-ant-'))
    throw new Error(
      `AI_API_KEY não é uma chave da Anthropic: ${key.startsWith('sk-proj') || key.startsWith('sk-') ? 'parece ser da OpenAI' : key.startsWith('AIza') ? 'parece ser do Google' : 'formato desconhecido'} (${key.length} caracteres).`,
    );
  const system = 'Você é roteirista de mistérios dedutivos justos. Você devolve somente JSON válido.';
  if (provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.AI_MODEL || 'claude-sonnet-5-5', max_tokens: 20000, system, messages }),
    });
    if (!res.ok) throw new Error(`IA respondeu ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    return (data.content ?? []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('');
  }
  if (provider === 'openai') {
    const base = process.env.AI_BASE_URL || 'https://api.openai.com/v1';
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'gpt-4.1',
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: system }, ...messages],
      }),
    });
    if (!res.ok) throw new Error(`IA respondeu ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
  }
  throw new Error(`AI_PROVIDER desconhecido: ${provider}`);
}

/** Offline generator used for tests and AI_PROVIDER=mock: a relabelled copy of the demo. */
export function mockCase(d: Difficulty, id: string): CaseFile {
  const c: CaseFile = JSON.parse(JSON.stringify(DEMO_CASE));
  c.id = id;
  c.isDemo = false;
  c.number = String(1000 + Math.floor(Math.random() * 8999));
  c.title = `${DEMO_CASE.title} (gerado em modo de teste)`;
  for (const k of ['facil', 'medio', 'dificil', 'extreme'] as const) if (k !== d) delete c[k];
  for (const k of ['facil', 'medio', 'dificil'] as const) if (k !== d) delete c.secret[k];
  return c;
}

// ---------------------------------------------------------------------------
// Ilustrações por IA (opcional): fotografias da introdução e das pistas.
// ---------------------------------------------------------------------------
const IMAGE_STYLE =
  'Fotografia documental de investigação, estilo série true crime brasileira, 35mm, luz natural baixa, grão de filme, cores dessaturadas, composição jornalística. Sem texto legível, sem logotipos, sem rostos reconhecíveis. Cena: ';

async function renderImage(prompt: string): Promise<Buffer> {
  const base = process.env.IMAGE_BASE_URL || 'https://api.openai.com/v1';
  const res = await fetch(`${base}/images/generations`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.IMAGE_API_KEY?.trim()}` },
    body: JSON.stringify({
      model: process.env.IMAGE_MODEL || 'gpt-image-1',
      prompt: IMAGE_STYLE + prompt,
      size: '1536x1024',
      quality: process.env.IMAGE_QUALITY || 'medium',
      output_format: 'jpeg',
      output_compression: 80,
      n: 1,
    }),
  });
  if (!res.ok) throw new Error(`imagem ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error('imagem vazia');
  return Buffer.from(b64, 'base64');
}

export const imagesConfigured = () => !!process.env.IMAGE_API_KEY;

/** Generates up to IMAGE_MAX_PER_CASE pictures. Failures fall back to the drawn scene. */
export async function illustrate(cf: CaseFile): Promise<CaseFile> {
  const strip = (c: CaseFile) => {
    delete c.intro.photo.imagePrompt;
    c.clues.forEach((k) => delete k.imagePrompt);
    return c;
  };
  if (!imagesConfigured()) return strip(cf);
  const { saveImage } = await import('./server');
  const max = Math.max(0, Math.min(8, Number(process.env.IMAGE_MAX_PER_CASE ?? 4)));
  const targets = [cf.intro.photo, ...cf.clues.filter((k) => k.kind === 'photo')].filter((k) => k.imagePrompt).slice(0, max);
  await Promise.all(
    targets.map(async (k) => {
      try {
        const buf = await renderImage(k.imagePrompt!);
        k.imageUrl = await saveImage(cf.id, k.id, buf);
      } catch (e) {
        console.warn('[illustrate]', k.id, (e as Error).message);
      }
    }),
  );
  return strip(cf);
}

export function aiConfigured() {
  return process.env.AI_PROVIDER === 'mock' || !!process.env.AI_API_KEY;
}

export async function generateCase(d: Difficulty, id: string, recent: { logicType: string; setting: string }[]): Promise<CaseFile> {
  if (process.env.AI_PROVIDER === 'mock') return mockCase(d, id);
  const recentLogic = new Set(recent.map((r) => r.logicType));
  const logicPool = LOGIC_TYPES.filter((l) => !recentLogic.has(l));
  const logic = (logicPool.length ? logicPool : LOGIC_TYPES)[Math.floor(Math.random() * (logicPool.length || LOGIC_TYPES.length))];
  const recentSet = new Set(recent.map((r) => r.setting));
  const setPool = SETTINGS.filter((s) => !recentSet.has(s));
  const setting = (setPool.length ? setPool : SETTINGS)[Math.floor(Math.random() * (setPool.length || SETTINGS.length))];
  const messages: Msg[] = [{ role: 'user', content: buildPrompt(d, logic, setting, recent.map((r) => r.logicType)) }];
  const retries = Math.max(0, Math.min(3, Number(process.env.AI_MAX_RETRIES ?? 1)));
  let lastErrors: string[] = [];
  for (let attempt = 0; attempt <= retries; attempt++) {
    const text = await callModel(messages);
    let errors: string[];
    try {
      const parsed = caseSchema.safeParse(extractJson(text));
      if (!parsed.success) {
        errors = parsed.error.issues.slice(0, 15).map((i) => `${i.path.join('.')}: ${i.message}`);
      } else {
        const cf = { ...(parsed.data as unknown as CaseFile), id, isDemo: false, logicType: logic, setting };
        errors = validateCase(cf, d);
        if (!errors.length) return await illustrate(cf);
      }
    } catch {
      errors = ['A resposta não era um JSON válido.'];
    }
    lastErrors = errors;
    messages.push({ role: 'assistant', content: text }, { role: 'user', content: `O caso falhou na validação. Corrija e devolva o JSON completo:\n- ${errors.join('\n- ')}` });
  }
  throw new Error(`Caso gerado não passou na validação: ${lastErrors.slice(0, 5).join('; ')}`);
}
