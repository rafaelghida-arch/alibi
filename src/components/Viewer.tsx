'use client';
import { useEffect, useRef, useState } from 'react';
import { ClueDoc } from './ClueDoc';
import { HL_COLORS, useHighlights } from './highlight';
import { KIND_LABEL, type Character, type Clue } from '@/lib/types';
import type { GameState } from './state';

export interface ViewerFx {
  onSeen: (id: string) => void;
  onFlip: (id: string) => void;
  onZoom: (id: string, mark: string) => void;
  onCompare: (a: string, b: string) => void;
  onHighlight: (clueId: string, text: string, color: string) => void;
}

interface Props extends ViewerFx {
  clue: Clue;
  available: Clue[];
  characters: Character[];
  notes: Record<string, string>;
  highlights: GameState['highlights'];
  onNote: (id: string, text: string) => void;
  onClose: () => void;
}

function Pane({ paneKey, clue, characters, flipped, notes, onNote, highlights, fx }: {
  paneKey: string; clue: Clue; characters: Character[]; flipped: boolean; notes: Record<string, string>; onNote: Props['onNote'];
  highlights: GameState['highlights']; fx: ViewerFx;
}) {
  const speaker = characters.find((c) => c.id === clue.speakerId)?.name;
  const docRef = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState<{ text: string; x: number; y: number } | null>(null);
  useHighlights(paneKey, docRef, highlights.filter((h) => h.clueId === clue.id));

  function capture() {
    const s = window.getSelection();
    const text = s?.toString().trim() ?? '';
    if (!s || s.isCollapsed || text.length < 2 || !docRef.current?.contains(s.anchorNode)) return setSel(null);
    const r = s.getRangeAt(0).getBoundingClientRect();
    const host = docRef.current.getBoundingClientRect();
    setSel({ text: text.slice(0, 400), x: r.left - host.left + r.width / 2, y: r.top - host.top });
  }
  function mark(color: string) {
    if (!sel) return;
    fx.onHighlight(clue.id, sel.text, color);
    window.getSelection()?.removeAllRanges();
    setSel(null);
  }
  return (
    <>
      <div ref={docRef} className="docwrap" onMouseUp={capture} onTouchEnd={() => setTimeout(capture, 30)} onKeyUp={capture}>
        <ClueDoc clue={clue} flipped={flipped} speakerName={speaker} onZoom={(m) => fx.onZoom(clue.id, m)} />
        {sel && (
          <div className="hltool" style={{ left: sel.x, top: sel.y }} role="toolbar" aria-label="Marca-texto" onMouseDown={(e) => e.preventDefault()}>
            <span>Grifar</span>
            {HL_COLORS.map((c) => (
              <button key={c.id} aria-label={`Grifar em ${c.label}`} style={{ background: c.css }} onClick={() => mark(c.id)} />
            ))}
          </div>
        )}
      </div>
      <p className="hlhint">Selecione um trecho para grifar — ele vai para o seu caderno.</p>
      <div className="notes">
        <label htmlFor={`note-${clue.id}`}>Suas anotações</label>
        <textarea id={`note-${clue.id}`} className="input" placeholder="Só você vê isto." value={notes[clue.id] ?? ''} onChange={(e) => onNote(clue.id, e.target.value)} />
      </div>
    </>
  );
}

/** Opens a clue fast; lets the player flip, zoom, listen, highlight and compare side by side. */
export function Viewer(p: Props) {
  const { clue, available, characters, notes, onNote, onClose, highlights } = p;
  const [flipA, setFlipA] = useState(false);
  const [flipB, setFlipB] = useState(false);
  const [other, setOther] = useState<Clue | null>(null);
  const [picking, setPicking] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    p.onSeen(clue.id);
    closeRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clue.id]);
  useEffect(() => {
    if (other) {
      p.onSeen(other.id);
      p.onCompare(clue.id, other.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [other?.id]);
  useEffect(() => { if (flipA) p.onFlip(clue.id); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [flipA]);
  useEffect(() => { if (flipB && other) p.onFlip(other.id); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [flipB]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === 'Escape') {
        if (picking) setPicking(false);
        else onClose();
      }
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;
      if (e.key.toLowerCase() === 'v' && clue.back) setFlipA((f) => !f);
      if (e.key.toLowerCase() === 'c') setPicking((x) => !x);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [clue.back, onClose, picking]);

  return (
    <div className="viewer" role="dialog" aria-modal="true" aria-label={clue.title}>
      <div className="viewer-bar">
        <button ref={closeRef} className="btn small ghost" onClick={onClose} aria-label="Fechar (Esc)">✕</button>
        <div className="ttl">
          <span className="mono muted" style={{ fontSize: 11, marginRight: 8 }}>{KIND_LABEL[clue.kind].toUpperCase()}</span>
          {clue.title}
          {other && <span className="muted"> ⇄ {other.title}</span>}
        </div>
        {clue.back && (
          <button className={`btn small${!flipA ? ' glow' : ''}`} onClick={() => setFlipA((f) => !f)} aria-pressed={flipA} title="Atalho: V">
            ↻ {flipA ? 'Ver frente' : 'Virar'}
          </button>
        )}
        {other?.back && <button className="btn small" onClick={() => setFlipB((f) => !f)} aria-pressed={flipB}>↻ Virar 2º</button>}
        {other ? (
          <button className="btn small" onClick={() => setOther(null)}>Fechar comparação</button>
        ) : (
          available.length > 1 && <button className="btn small" onClick={() => setPicking((x) => !x)} title="Atalho: C">⇄ Comparar</button>
        )}
      </div>
      {picking && (
        <div className="picker" role="listbox" aria-label="Comparar com">
          {available.filter((c) => c.id !== clue.id).map((c) => (
            <button key={c.id} role="option" aria-selected={false} onClick={() => { setOther(c); setFlipB(false); setPicking(false); }}>
              <span className="mono muted" style={{ fontSize: 10 }}>{KIND_LABEL[c.kind].toUpperCase()} · </span>{c.title}
            </button>
          ))}
        </div>
      )}
      <div className={`viewer-body${other ? ' compare' : ''}`}>
        {/* The first pane keeps its DOM node (and scroll position) when comparison opens. */}
        <div className="pane" key="a">
          <Pane paneKey="a" clue={clue} characters={characters} flipped={flipA} notes={notes} onNote={onNote} highlights={highlights} fx={p} />
        </div>
        {other && (
          <div className="pane" key={`b-${other.id}`}>
            <Pane paneKey={`b-${other.id}`} clue={other} characters={characters} flipped={flipB} notes={notes} onNote={onNote} highlights={highlights} fx={p} />
          </div>
        )}
      </div>
    </div>
  );
}
