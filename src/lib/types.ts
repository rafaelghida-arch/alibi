export type Difficulty = 'facil' | 'medio' | 'dificil' | 'extreme';
export const DIFFICULTIES: Difficulty[] = ['facil', 'medio', 'dificil', 'extreme'];
export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  facil: 'Fácil',
  medio: 'Médio',
  dificil: 'Difícil',
  extreme: 'Extreme',
};
export const DIFFICULTY_BLURB: Record<Difficulty, string> = {
  facil: 'Investigação guiada em três etapas e uma conclusão.',
  medio: 'Escolha quem ouvir e conecte evidências para formar hipóteses.',
  dificil: 'Depoimentos conflitantes, cronologia incompleta e confrontos.',
  extreme: 'Mesa livre de detetive. Nenhuma etapa, nenhuma pista de graça.',
};

export type ClueKind =
  | 'photo'
  | 'ticket'
  | 'receipt'
  | 'note'
  | 'chat'
  | 'map'
  | 'agenda'
  | 'statement'
  | 'calllog'
  | 'audio'
  | 'document'
  | 'log';

export const KIND_LABEL: Record<ClueKind, string> = {
  photo: 'Fotografia',
  ticket: 'Ingresso',
  receipt: 'Recibo',
  note: 'Bilhete',
  chat: 'Conversa',
  map: 'Mapa',
  agenda: 'Agenda',
  statement: 'Depoimento',
  calllog: 'Registro de chamadas',
  audio: 'Gravação',
  document: 'Documento',
  log: 'Registro de sistema',
};

export interface Line {
  label?: string;
  text: string;
}
export interface PhotoMark {
  id: string;
  x: number; // 0-100
  y: number; // 0-100
  label: string;
  detail: string;
}
export interface MapPlace {
  id: string;
  label: string;
  x: number; // 0-100
  y: number; // 0-100
  note?: string;
}

export interface Clue {
  id: string;
  kind: ClueKind;
  title: string;
  subtitle?: string;
  /** statement / note / document body */
  paragraphs?: string[];
  /** receipt, log, agenda, calllog, ticket, document fields */
  lines?: Line[];
  /** text on the back of the paper (ticket, note, receipt, document) */
  back?: string;
  speakerId?: string;
  messages?: { from: string; time: string; text: string }[];
  scene?: string;
  marks?: PhotoMark[];
  places?: MapPlace[];
  routes?: { from: string; to: string; label?: string }[];
  transcript?: { speaker: string; text: string }[];
  /** illustration drawn in code (demo) */
  art?: string;
  /** AI-generated picture (generated cases) */
  imageUrl?: string;
  /** prompt used to generate imageUrl (server only, removed from public view) */
  imagePrompt?: string;
}

export interface Character {
  id: string;
  name: string;
  age?: number;
  role: string;
  bio: string;
}

export interface Option {
  id: string;
  text: string;
}

export interface AccusationField {
  id: string;
  question: string;
  options: Option[];
}

// ---------------- Difficulty sections (public) ----------------
export interface EasyStage {
  id: string;
  title: string;
  clueIds: string[];
  question: string;
  options: Option[];
}
export interface EasySection {
  stages: EasyStage[];
  conclusionClueIds: string[];
}
export interface MediumSection {
  initialClueIds: string[];
  interviews: { characterId: string; clueIds: string[] }[];
  claims: Option[];
  deductions: { id: string; label: string; hint: string; unlocks: string[] }[];
}
export interface HardSection {
  clueIds: string[];
  lockedClueIds: string[];
  events: { id: string; text: string; time?: string }[];
}
export interface ExtremeSection {
  clueIds: string[];
}

// ---------------- Secret sections ----------------
export interface EasySecret {
  stages: Record<string, { answer: string; establishes: string; hint: string; evidence: string[] }>;
}
export interface MediumSecret {
  links: { deductionId: string; claimId: string; pairs: [string, string][]; establishes: string }[];
  /** how many deductions are needed to unlock the accusation */
  required: number;
}
export interface HardSecret {
  eventOrder: string[];
  confrontations: { characterId: string; clueIds: string[]; unlocks: string; reply: string }[];
  deflections: Record<string, string>;
}

export interface KeyDeduction {
  id: string;
  statement: string;
  evidenceSets: string[][];
  missedTip: string;
  decisive?: boolean;
}

export interface CaseTruth {
  summary: string;
  culpritId: string;
  motive: string;
  method: string;
  timeline: { time: string; text: string; clueIds: string[] }[];
}

/** Full case as stored on the server. Never sent as-is to the client. */
export interface CaseFile {
  id: string;
  number: string;
  title: string;
  isDemo: boolean;
  logicType: string;
  setting: string;
  intro: { location: string; date: string; photo: Clue; paragraphs: string[] };
  mission: string;
  characters: Character[];
  suspectIds: string[];
  clues: Clue[];
  accusation: { fields: AccusationField[] };
  facil?: EasySection;
  medio?: MediumSection;
  dificil?: HardSection;
  extreme?: ExtremeSection;
  secret: {
    truth: CaseTruth;
    answers: Record<string, string>;
    explanations: Record<string, string>;
    keyDeductions: KeyDeduction[];
    facil?: EasySecret;
    medio?: MediumSecret;
    dificil?: HardSecret;
  };
}

/** What the client receives. */
export interface PublicCase {
  id: string;
  number: string;
  title: string;
  isDemo: boolean;
  difficulty: Difficulty;
  intro: CaseFile['intro'];
  mission: string;
  characters: Character[];
  suspectIds: string[];
  clues: Clue[];
  accusation: { fields: AccusationField[] };
  facil?: EasySection;
  medio?: MediumSection & { required: number };
  dificil?: HardSection & { confrontableIds: string[] };
  extreme?: ExtremeSection;
}

export interface AccusationInput {
  answers: Record<string, string>;
  citedClueIds: string[];
  narrative?: string;
  timelineOrder?: string[];
  examinedClueIds?: string[];
}

export interface Verdict {
  solved: boolean;
  score: number;
  culpritCorrect: boolean;
  culpritName: string;
  fields: { id: string; question: string; chosen: string; correct: boolean; correctText: string; explanation: string }[];
  deductions: { id: string; statement: string; supported: boolean; missedTip: string; decisive: boolean }[];
  timelineAccuracy?: number;
  truth: CaseTruth;
}
