import type { Verdict } from '@/lib/types';

export type Phase = 'intro' | 'mission' | 'deal' | 'play' | 'accuse' | 'ending';

export interface BoardState {
  pos: Record<string, { x: number; y: number }>;
  view: { x: number; y: number; s: number };
  colors: { id: string; color: string; label: string }[];
  tags: Record<string, string[]>;
  groups: { id: string; label: string; ids: string[] }[];
  notes: { id: string; x: number; y: number; text: string }[];
  links: { id: string; a: string; b: string; label: string }[];
  mode: 'board' | 'list' | null;
}

export interface GameState {
  v: 1;
  phase: Phase;
  limitMin: number | null;
  startedAt: number | null;
  expiredAt: number | null;
  timeUpSeen: boolean;
  opened: string[];
  fresh: string[];
  notes: Record<string, string>;
  easy: { stage: number; solved: Record<string, string> };
  medium: { heard: string[]; found: Record<string, string>; unlocked: string[]; hints: string[] };
  hard: { order: string[]; unlocked: string[]; log: { characterId: string; clueId: string; reply: string; unlocks?: string }[] };
  board: BoardState;
  draft: { answers: Record<string, string>; cited: string[]; narrative: string };
  verdict: Verdict | null;
  finishedAt: number | null;
}

export const SWATCHES = ['#f2a93b', '#e5654f', '#5b9cf2', '#5bbf8a', '#b07cf0', '#9b998f'];

export const initialState = (): GameState => ({
  v: 1,
  phase: 'intro',
  limitMin: null,
  startedAt: null,
  expiredAt: null,
  timeUpSeen: false,
  opened: [],
  fresh: [],
  notes: {},
  easy: { stage: 0, solved: {} },
  medium: { heard: [], found: {}, unlocked: [], hints: [] },
  hard: { order: [], unlocked: [], log: [] },
  board: {
    pos: {},
    view: { x: 0, y: 0, s: 1 },
    colors: SWATCHES.map((c, i) => ({ id: `c${i}`, color: c, label: '' })),
    tags: {},
    groups: [],
    notes: [],
    links: [],
    mode: null,
  },
  draft: { answers: {}, cited: [], narrative: '' },
  verdict: null,
  finishedAt: null,
});

export type Update = (fn: (s: GameState) => GameState) => void;
