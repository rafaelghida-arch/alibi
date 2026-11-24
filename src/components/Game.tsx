'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DIFFICULTY_LABEL, type Clue, type Difficulty, type PublicCase, type Verdict } from '@/lib/types';
import { store, touchIndex, useSaved } from '@/lib/client';
import { initialState, type GameState } from './state';
import { Deal, Intro, Mission } from './Opening';
import { Viewer } from './Viewer';
import { EasyMode } from './modes/Easy';
import { MediumMode } from './modes/Medium';
import { HardMode } from './modes/Hard';
import { ExtremeMode } from './modes/Extreme';
import { Accusation } from './Accusation';
import { Ending } from './Ending';
import { Celebrations, grant, MuteButton, XpPill } from './fx';
import { Notebook, useNotebookOpen } from './Notebook';
import { uid } from '@/lib/client';

export function availableIds(c: PublicCase, s: GameState): string[] {
  if (c.facil) {
    const st = c.facil.stages;
    const ids = st.slice(0, Math.min(s.easy.stage + 1, st.length)).flatMap((x) => x.clueIds);
    return s.easy.stage >= st.length ? [...ids, ...c.facil.conclusionClueIds] : ids;
  }
  if (c.medio) {
    const m = c.medio;
    return Array.from(new Set([...m.initialClueIds, ...m.interviews.filter((i) => s.medium.heard.includes(i.characterId)).flatMap((i) => i.clueIds), ...s.medium.unlocked]));
  }
  if (c.dificil) return [...c.dificil.clueIds, ...s.hard.unlocked];
  return c.extreme?.clueIds ?? [];
}

function fmt(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function Timer({ s, onExpire }: { s: GameState; onExpire: (at: number) => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const remaining = s.limitMin != null && s.startedAt ? s.limitMin * 60 - (now - s.startedAt) / 1000 : null;
  useEffect(() => {
    if (remaining != null && remaining <= 0 && !s.expiredAt && s.startedAt && s.limitMin != null) onExpire(s.startedAt + s.limitMin * 60000);
  }, [remaining, s.expiredAt, s.startedAt, s.limitMin, onExpire]);
  if (!s.startedAt) return null;
  if (remaining == null) {
    return <span className="timer" title="Tempo decorrido" aria-label="Tempo decorrido">{fmt((now - s.startedAt) / 1000)}</span>;
  }
  if (remaining <= 0) return <span className="timer over" role="timer">00:00</span>;
  return <span className={`timer${remaining < 300 ? ' low' : ''}`} role="timer" aria-label="Tempo restante">{fmt(remaining)}</span>;
}

export function Game({ id, d }: { id: string; d: Difficulty }) {
  const caseKey = `alibi:case:${id}:${d}`;
  const [c, setC] = useState<PublicCase | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [s, up, ready] = useSaved<GameState>(`alibi:game:${id}:${d}`, initialState);
  const [viewing, setViewing] = useState<string | null>(null);

  useEffect(() => {
    const cached = store.get<PublicCase>(caseKey);
    if (cached) {
      setC(cached);
      return;
    }
    fetch(`/api/cases/${encodeURIComponent(id)}?d=${d}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'Falha ao abrir o caso');
        store.set(caseKey, j);
        setC(j);
      })
      .catch((e) => setErr(e.message));
  }, [caseKey, id, d]);

  useEffect(() => {
    if (c && ready)
      touchIndex({ id, d, title: c.title, number: c.number, isDemo: c.isDemo, updatedAt: Date.now(), finished: s.phase === 'ending' });
  }, [c, ready, s.phase, id, d]);

  const act = useCallback(
    async (body: Record<string, unknown>) => {
      const r = await fetch(`/api/cases/${encodeURIComponent(id)}/action`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...body, d }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Falha na verificação');
      return j;
    },
    [id, d],
  );

  const avail = useMemo(() => (c ? availableIds(c, s) : []), [c, s]);
  const availClues = useMemo(() => (c ? (avail.map((x) => c.clues.find((k) => k.id === x)).filter(Boolean) as Clue[]) : []), [c, avail]);
  const open = useCallback((cid: string) => setViewing(cid), []);
  const onSeen = useCallback(
    (cid: string) => up((x) => (x.opened.includes(cid) && !x.fresh.includes(cid) ? x : { ...x, opened: Array.from(new Set([...x.opened, cid])), fresh: x.fresh.filter((f) => f !== cid) })),
    [up],
  );
  const onNote = useCallback((cid: string, text: string) => up((x) => ({ ...x, notes: { ...x.notes, [cid]: text } })), [up]);
  const ctxRef = useMemo(() => ({ total: avail.length, events: c?.dificil?.events.length ?? 0 }), [avail.length, c]);
  const reward = useCallback(
    (key: string, xp: number, text: string, big = false) => up((x) => grant(x, key, xp, text, big, ctxRef)),
    [up, ctxRef],
  );
  const titleOf = useCallback((id: string) => c?.clues.find((k) => k.id === id)?.title ?? id, [c]);
  const fx = useMemo(() => ({
    onSeen: (cid: string) => {
      onSeen(cid);
      reward(`open:${cid}`, 10, `Pista examinada: ${titleOf(cid)}`);
    },
    onFlip: (cid: string) => {
      up((x) => (x.flipped.includes(cid) ? x : { ...x, flipped: [...x.flipped, cid] }));
      reward(`flip:${cid}`, 15, `Verso encontrado: ${titleOf(cid)}`);
    },
    onZoom: (cid: string, m: string) => {
      const k = `${cid}:${m}`;
      up((x) => (x.zoomed.includes(k) ? x : { ...x, zoomed: [...x.zoomed, k] }));
      reward(`zoom:${k}`, 5, 'Detalhe ampliado');
    },
    onCompare: (a: string, b: string) => reward(`cmp:${[a, b].sort().join('+')}`, 5, 'Documentos comparados'),
    onHighlight: (cid: string, text: string, color: string) => {
      up((x) => ({ ...x, highlights: [{ id: uid(), clueId: cid, text, color, note: '' }, ...x.highlights] }));
      setTimeout(() => up((x) => grant(x, `hl:${Math.min(x.highlights.length, 6)}`, 8, 'Trecho grifado no caderno', false, ctxRef)), 0);
    },
  }), [onSeen, reward, titleOf, up, ctxRef]);
  const nb = useNotebookOpen(d === 'extreme');
  const onExpire = useCallback((at: number) => up((x) => (x.expiredAt ? x : { ...x, expiredAt: at })), [up]);

  async function submitAccusation(answers: Record<string, string>, cited: string[], narrative: string) {
    const v: Verdict = await act({ type: 'accuse', answers, citedClueIds: cited, narrative, timelineOrder: d === 'dificil' ? s.hard.order : undefined });
    up((x) => ({ ...x, verdict: v, phase: 'ending', finishedAt: Date.now() }));
    if (v.solved) reward('solved', 300, 'Caso resolvido', true);
    else reward('closed', 50, 'Caso encerrado');
    window.scrollTo(0, 0);
  }

  if (err)
    return (
      <div className="page">
        <h1>Caso indisponível</h1>
        <p className="error">{err}</p>
        <Link className="btn" href="/">Voltar ao início</Link>
      </div>
    );
  if (!c || !ready) return <div className="loadingscreen"><div><div className="spinner" />Abrindo o arquivo…</div></div>;

  if (s.phase === 'intro') return <Intro c={c} onDone={() => up((x) => ({ ...x, phase: 'mission' }))} />;
  if (s.phase === 'mission') return <Mission c={c} onStart={(min) => up((x) => ({ ...x, limitMin: min, phase: 'deal' }))} />;
  if (s.phase === 'deal')
    return <Deal count={avail.length} onDone={() => up((x) => ({ ...x, phase: 'play', startedAt: x.startedAt ?? Date.now(), fresh: [] }))} />;

  const viewingClue = viewing ? c.clues.find((k) => k.id === viewing) : null;
  const examined = avail.filter((x) => s.opened.includes(x)).length / Math.max(1, avail.length);
  const modePct = c.facil
    ? Object.keys(s.easy.solved).length / c.facil.stages.length
    : c.medio
      ? Object.keys(s.medium.found).length / c.medio.deductions.length
      : c.dificil
        ? (s.hard.unlocked.length / Math.max(1, c.dificil.lockedClueIds.length) + s.timelineBest / c.dificil.events.length) / 2
        : Math.min(1, (s.board.links.length + s.board.groups.length + s.highlights.length) / 8);
  const pct = s.phase === 'ending' ? 1 : Math.min(1, examined * 0.45 + modePct * 0.55);
  const showNb = s.phase === 'play' || s.phase === 'accuse';
  const modeProps = { c, s, up, open, available: availClues, act, reward, onAccuse: () => { up((x) => ({ ...x, phase: 'accuse' })); window.scrollTo(0, 0); }, submitAccusation };

  return (
    <>
      <header className="topbar">
        <Link href="/" className="wordmark" aria-label="ÁLIBI — início">ÁLIBI</Link>
        <span className="casechip">Nº {c.number}</span>
        <span className="casechip">{DIFFICULTY_LABEL[d]}</span>
        {c.isDemo && <span className="demo-tag">Demonstração</span>}
        <span className="spacer" />
        <XpPill xp={s.xp} pct={pct} />
        <MuteButton />
        {s.phase !== 'ending' && <Timer s={s} onExpire={onExpire} />}
      </header>
      <Celebrations feed={s.feed} />
      {s.expiredAt && !s.timeUpSeen && s.phase !== 'ending' && (
        <div className="timeup" role="alert">
          <span><b>Tempo esgotado.</b> O desafio foi registrado como encerrado. Suas anotações continuam aqui — siga investigando no seu ritmo.</span>
          <button className="btn small" onClick={() => up((x) => ({ ...x, timeUpSeen: true }))}>Continuar</button>
        </div>
      )}
      <div className={showNb && nb.open && !nb.narrow ? 'with-nb' : ''}>
      {s.phase === 'play' && d === 'facil' && <EasyMode {...modeProps} />}
      {s.phase === 'play' && d === 'medio' && <MediumMode {...modeProps} />}
      {s.phase === 'play' && d === 'dificil' && <HardMode {...modeProps} />}
      {s.phase === 'play' && d === 'extreme' && <ExtremeMode {...modeProps} />}
      {s.phase === 'accuse' && <Accusation {...modeProps} onBack={() => up((x) => ({ ...x, phase: 'play' }))} />}
      {s.phase === 'ending' && s.verdict && <Ending c={c} s={s} verdict={s.verdict} open={open} />}
      </div>
      {showNb && <Notebook c={c} s={s} up={up} open={open} isOpen={nb.open} setOpen={nb.setOpen} narrow={nb.narrow} />}
      {viewingClue && (
        <Viewer
          clue={viewingClue}
          available={s.phase === 'ending' ? c.clues : availClues}
          characters={c.characters}
          notes={s.notes}
          highlights={s.highlights}
          onNote={onNote}
          {...fx}
          onClose={() => setViewing(null)}
        />
      )}
    </>
  );
}

export type ModeProps = {
  c: PublicCase;
  s: GameState;
  up: (fn: (s: GameState) => GameState) => void;
  open: (id: string) => void;
  available: Clue[];
  act: (body: Record<string, unknown>) => Promise<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  onAccuse: () => void;
  reward: (key: string, xp: number, text: string, big?: boolean) => void;
  submitAccusation: (answers: Record<string, string>, cited: string[], narrative: string) => Promise<void>;
};
