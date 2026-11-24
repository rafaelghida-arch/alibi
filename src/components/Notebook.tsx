'use client';
import { useEffect, useState } from 'react';
import type { PublicCase } from '@/lib/types';
import type { GameState } from './state';
import { HL_COLORS } from './highlight';
import { BADGES, rankOf } from './fx';
import { store, useIsNarrow } from '@/lib/client';

type Tab = 'notas' | 'grifos' | 'descobertas' | 'conquistas';

export function useNotebookOpen(board = false) {
  const narrow = useIsNarrow(1180);
  const key = board ? 'alibi:nb:mesa' : 'alibi:nb';
  const [open, setOpen] = useState<boolean | null>(null);
  useEffect(() => {
    const saved = store.get<boolean>(key);
    setOpen(saved ?? (!narrow && !board));
  }, [narrow, key, board]);
  const set = (v: boolean) => { store.set(key, v); setOpen(v); };
  return { open: !!open, setOpen: set, narrow };
}

export function Notebook({ c, s, up, open: openClue, isOpen, setOpen, narrow }: {
  c: PublicCase; s: GameState; up: (fn: (s: GameState) => GameState) => void; open: (id: string) => void;
  isOpen: boolean; setOpen: (v: boolean) => void; narrow: boolean;
}) {
  const [tab, setTab] = useState<Tab>('notas');
  const title = (id: string) => c.clues.find((k) => k.id === id)?.title ?? id;
  const clueNotes = Object.entries(s.notes).filter(([, v]) => v.trim());
  const facts = [
    ...(c.facil?.stages.filter((x) => s.easy.solved[x.id]).map((x) => ({ k: x.title, v: s.easy.solved[x.id] })) ?? []),
    ...(c.medio?.deductions.filter((d) => s.medium.found[d.id]).map((d) => ({ k: d.label, v: s.medium.found[d.id] })) ?? []),
  ];
  const rank = rankOf(s.xp);
  const hlCss = (id: string) => HL_COLORS.find((h) => h.id === id)?.css;

  if (!isOpen)
    return (
      <button className={`nb-spine${narrow ? ' mobile' : ''}`} onClick={() => setOpen(true)} aria-label="Abrir caderno">
        <span>Caderno</span>
        {s.highlights.length + clueNotes.length > 0 && <b>{s.highlights.length + clueNotes.length}</b>}
      </button>
    );

  return (
    <aside className={`notebook${narrow ? ' mobile' : ''}`} aria-label="Caderno de investigação">
      <div className="nb-rings" aria-hidden>{Array.from({ length: 14 }, (_, i) => <i key={i} />)}</div>
      <div className="nb-head">
        <div>
          <div className="nb-k">CADERNO · CASO Nº {c.number}</div>
          <div className="nb-rank">{rank.name} <span className="mono">· {s.xp} XP</span></div>
        </div>
        <button className="iconbtn dark" onClick={() => setOpen(false)} aria-label="Recolher caderno">{narrow ? '✕' : '›'}</button>
      </div>
      <div className="nb-tabs" role="tablist">
        {([['notas', 'Notas'], ['grifos', `Grifos${s.highlights.length ? ` ${s.highlights.length}` : ''}`], ['descobertas', 'Descobertas'], ['conquistas', 'Conquistas']] as [Tab, string][]).map(([t, l]) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{l}</button>
        ))}
      </div>
      <div className="nb-page">
        {tab === 'notas' && (
          <>
            <textarea className="nb-journal" aria-label="Anotações gerais" placeholder="Escreva suas teorias aqui. Quem mente? O que não fecha?" value={s.journal} onChange={(e) => up((x) => ({ ...x, journal: e.target.value }))} />
            {clueNotes.length > 0 && <div className="nb-sec">Notas nas pistas</div>}
            {clueNotes.map(([id, v]) => (
              <button key={id} className="nb-entry" onClick={() => openClue(id)}>
                <b>{title(id)}</b>
                <span>{v}</span>
              </button>
            ))}
          </>
        )}
        {tab === 'grifos' && (
          <>
            {s.highlights.length === 0 && <p className="nb-empty">Abra uma pista e selecione um trecho para grifar. Os grifos aparecem aqui.</p>}
            {s.highlights.map((h) => (
              <div key={h.id} className="nb-hl">
                <button className="nb-quote" onClick={() => openClue(h.clueId)}>
                  <mark style={{ background: hlCss(h.color) }}>“{h.text}”</mark>
                  <small>{title(h.clueId)}</small>
                </button>
                <input aria-label="Comentário do grifo" placeholder="Por que isso importa?" value={h.note} onChange={(e) => up((x) => ({ ...x, highlights: x.highlights.map((y) => (y.id === h.id ? { ...y, note: e.target.value } : y)) }))} />
                <button className="nb-del" aria-label="Apagar grifo" onClick={() => up((x) => ({ ...x, highlights: x.highlights.filter((y) => y.id !== h.id) }))}>✕</button>
              </div>
            ))}
          </>
        )}
        {tab === 'descobertas' && (
          <>
            {facts.length > 0 && <div className="nb-sec">Fatos estabelecidos</div>}
            {facts.map((f) => <div key={f.k} className="nb-fact"><b>{f.k}.</b> {f.v}</div>)}
            {s.hard.log.filter((l) => l.unlocks).map((l) => (
              <button key={l.unlocks} className="nb-entry" onClick={() => openClue(l.unlocks!)}><b>Nova declaração</b><span>{title(l.unlocks!)}</span></button>
            ))}
            <div className="nb-sec">Diário da investigação</div>
            {s.feed.length === 0 && <p className="nb-empty">Cada pista examinada, detalhe ampliado e descoberta fica registrada aqui.</p>}
            <ul className="nb-feed">
              {s.feed.slice(0, 40).map((f) => (
                <li key={f.id} className={f.big ? 'big' : ''}><span>{f.text}</span><b>+{f.xp}</b></li>
              ))}
            </ul>
          </>
        )}
        {tab === 'conquistas' && (
          <>
            <div className="nb-rankbox">
              <div className="nb-rank">{rank.name}</div>
              <div className="nb-bar"><i style={{ width: `${rank.progress * 100}%` }} /></div>
              <small>{rank.next ? `${rank.toNext} XP para ${rank.next}` : 'Patente máxima'}</small>
            </div>
            <div className="nb-badges">
              {BADGES.map((b) => {
                const got = s.badges.includes(b.id);
                return (
                  <div key={b.id} className={`nb-badge${got ? ' got' : ''}`} title={b.desc}>
                    <span className="ic">{b.icon}</span>
                    <b>{b.name}</b>
                    <small>{b.desc}</small>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
