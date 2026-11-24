'use client';
import { useEffect, useRef, useState } from 'react';
import type { GameState } from './state';
import { store } from '@/lib/client';

// ---------------------------------------------------------------------------
// Patentes, conquistas e recompensas
// ---------------------------------------------------------------------------
export const RANKS = [
  { xp: 0, name: 'Recruta' },
  { xp: 150, name: 'Agente' },
  { xp: 400, name: 'Detetive' },
  { xp: 800, name: 'Inspetor(a)' },
  { xp: 1300, name: 'Lenda do Arquivo' },
];
export function rankOf(xp: number) {
  let i = 0;
  while (i + 1 < RANKS.length && xp >= RANKS[i + 1].xp) i++;
  const cur = RANKS[i];
  const next = RANKS[i + 1];
  return { index: i, name: cur.name, next: next?.name ?? null, progress: next ? (xp - cur.xp) / (next.xp - cur.xp) : 1, toNext: next ? next.xp - xp : 0 };
}

export interface BadgeCtx { total: number; events: number }
export const BADGES: { id: string; icon: string; name: string; desc: string; test: (s: GameState, k: BadgeCtx) => boolean }[] = [
  { id: 'primeira', icon: '★', name: 'Primeira descoberta', desc: 'Estabeleceu um fato do caso.', test: (s) => s.feed.some((f) => f.big) },
  { id: 'olho', icon: '◎', name: 'Olho clínico', desc: 'Ampliou 5 detalhes em fotografias.', test: (s) => s.zoomed.length >= 5 },
  { id: 'avesso', icon: '↻', name: 'Do avesso', desc: 'Encontrou 2 anotações no verso de documentos.', test: (s) => s.flipped.length >= 2 },
  { id: 'grifo', icon: '✎', name: 'Marca-texto', desc: 'Grifou 3 trechos importantes.', test: (s) => s.highlights.length >= 3 },
  { id: 'arquivista', icon: '▤', name: 'Arquivista', desc: 'Examinou todas as pistas disponíveis.', test: (s, k) => k.total > 0 && s.opened.length >= k.total },
  { id: 'teia', icon: '✳', name: 'Teia vermelha', desc: 'Ligou 3 pares de pistas na mesa.', test: (s) => s.board.links.length >= 3 },
  { id: 'ponto-fraco', icon: '⚑', name: 'Ponto fraco', desc: 'Fez alguém mudar a versão.', test: (s) => s.hard.unlocked.length >= 1 },
  { id: 'cronologista', icon: '⧗', name: 'Cronologista', desc: 'Montou a cronologia inteira na ordem certa.', test: (s, k) => k.events > 0 && s.timelineBest >= k.events },
];

export function grant(s: GameState, key: string, xp: number, text: string, big: boolean, ctx: BadgeCtx): GameState {
  if (s.rewards.includes(key)) return s;
  let n: GameState = {
    ...s,
    xp: s.xp + xp,
    rewards: [...s.rewards, key],
    feed: [{ id: `${key}@${Date.now()}`, t: Date.now(), text, xp, big }, ...s.feed].slice(0, 80),
  };
  if (rankOf(n.xp).index > rankOf(s.xp).index) {
    n = { ...n, feed: [{ id: `badge:rank-${rankOf(n.xp).index}@${Date.now()}`, t: Date.now(), text: `Nova patente: ${rankOf(n.xp).name}`, xp: 0 }, ...n.feed] };
  }
  for (const b of BADGES) {
    if (!n.badges.includes(b.id) && b.test(n, ctx)) {
      n = { ...n, xp: n.xp + 40, badges: [...n.badges, b.id], feed: [{ id: `badge:${b.id}@${Date.now()}`, t: Date.now(), text: `Conquista: ${b.name}`, xp: 40 }, ...n.feed] };
    }
  }
  return n;
}

// ---------------------------------------------------------------------------
// Som discreto (WebAudio, sem arquivos)
// ---------------------------------------------------------------------------
let ctx: AudioContext | null = null;
export function isMuted() {
  return store.get<boolean>('alibi:mute') ?? false;
}
export function sound(kind: 'tick' | 'stamp' | 'badge' | 'paper') {
  if (typeof window === 'undefined' || isMuted()) return;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const t = ctx.currentTime;
    const tone = (f: number, d: number, type: OscillatorType, v: number, at = 0) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, t + at);
      g.gain.setValueAtTime(v, t + at);
      g.gain.exponentialRampToValueAtTime(0.0001, t + at + d);
      o.connect(g).connect(ctx!.destination);
      o.start(t + at);
      o.stop(t + at + d);
    };
    if (kind === 'tick') tone(880, 0.12, 'sine', 0.05);
    if (kind === 'paper') tone(320, 0.08, 'triangle', 0.04);
    if (kind === 'badge') { tone(660, 0.18, 'sine', 0.06); tone(990, 0.3, 'sine', 0.05, 0.1); }
    if (kind === 'stamp') {
      tone(90, 0.25, 'square', 0.08);
      tone(523, 0.25, 'sine', 0.05, 0.12);
      tone(784, 0.4, 'sine', 0.05, 0.22);
    }
  } catch {
    /* sem áudio */
  }
}

export function MuteButton() {
  const [m, setM] = useState(false);
  useEffect(() => setM(isMuted()), []);
  return (
    <button className="iconbtn" aria-pressed={m} aria-label={m ? 'Ativar sons' : 'Silenciar sons'} title={m ? 'Ativar sons' : 'Silenciar sons'}
      onClick={() => { store.set('alibi:mute', !m); setM(!m); }}>
      {m ? '🔇' : '🔊'}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Toasts e carimbo de descoberta
// ---------------------------------------------------------------------------
type Toast = { id: string; text: string; xp: number; badge: boolean };

export function Celebrations({ feed }: { feed: GameState['feed'] }) {
  const seen = useRef<Set<string> | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [stamp, setStamp] = useState<{ id: string; text: string } | null>(null);
  useEffect(() => {
    if (!seen.current) {
      seen.current = new Set(feed.map((f) => f.id));
      return;
    }
    const fresh = feed.filter((f) => !seen.current!.has(f.id)).reverse();
    if (!fresh.length) return;
    fresh.forEach((f) => seen.current!.add(f.id));
    const big = fresh.find((f) => f.big);
    if (big) {
      setStamp({ id: big.id, text: big.text });
      sound('stamp');
      setTimeout(() => setStamp((s) => (s?.id === big.id ? null : s)), 1700);
    } else sound(fresh.some((f) => f.id.startsWith('badge:')) ? 'badge' : 'tick');
    const add = fresh.filter((f) => !f.big).map((f) => ({ id: f.id, text: f.text, xp: f.xp, badge: f.id.startsWith('badge:') }));
    setToasts((t) => [...t, ...add].slice(-3));
    add.forEach((a) => setTimeout(() => setToasts((t) => t.filter((x) => x.id !== a.id)), a.badge ? 3600 : 2200));
  }, [feed]);
  return (
    <>
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast${t.badge ? ' badge' : ''}`}>
            <span>{t.text}</span>
            <b>+{t.xp} XP</b>
          </div>
        ))}
      </div>
      {stamp && <Stamp key={stamp.id} text={stamp.text} />}
    </>
  );
}

function Stamp({ text }: { text: string }) {
  const bits = Array.from({ length: 26 }, (_, i) => ({
    l: 50 + (Math.cos(i * 2.4) * (30 + (i % 5) * 6)),
    t: 45 + (Math.sin(i * 2.4) * (24 + (i % 4) * 6)),
    r: (i * 47) % 360,
    c: ['#f2a93b', '#f3eee2', '#e5654f', '#c9a56a'][i % 4],
    d: (i % 6) * 30,
  }));
  return (
    <div className="stampfx" aria-hidden>
      {bits.map((b, i) => (
        <i key={i} style={{ ['--l' as string]: `${b.l}%`, ['--t' as string]: `${b.t}%`, ['--r' as string]: `${b.r}deg`, background: b.c, animationDelay: `${b.d}ms` }} />
      ))}
      <div className="stampbox">
        <span className="stamp-k">DESCOBERTA</span>
        <span className="stamp-t">{text}</span>
      </div>
    </div>
  );
}

export function XpPill({ xp, pct }: { xp: number; pct: number }) {
  const r = rankOf(xp);
  const [bump, setBump] = useState(false);
  const prev = useRef(xp);
  useEffect(() => {
    if (xp !== prev.current) {
      prev.current = xp;
      setBump(true);
      const t = setTimeout(() => setBump(false), 500);
      return () => clearTimeout(t);
    }
  }, [xp]);
  const C = 2 * Math.PI * 9;
  return (
    <div className={`xppill${bump ? ' bump' : ''}`} title={r.next ? `${r.toNext} XP para ${r.next}` : 'Patente máxima'}>
      <svg width="24" height="24" viewBox="0 0 24 24" aria-label={`Progresso da investigação: ${Math.round(pct * 100)}%`}>
        <circle cx="12" cy="12" r="9" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="3" />
        <circle cx="12" cy="12" r="9" fill="none" stroke="var(--amber)" strokeWidth="3" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} transform="rotate(-90 12 12)" style={{ transition: 'stroke-dashoffset 600ms var(--ease)' }} />
      </svg>
      <span className="xp-rank">{r.name}</span>
      <span className="xp-num mono">{xp} XP</span>
      <span className="xp-bar"><i style={{ width: `${r.progress * 100}%` }} /></span>
    </div>
  );
}
