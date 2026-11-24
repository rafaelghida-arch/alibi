'use client';
import { useEffect, useRef, useState } from 'react';
import { ClueDoc } from './ClueDoc';
import { KIND_LABEL, type Character, type Clue } from '@/lib/types';

interface Props {
  clue: Clue;
  available: Clue[];
  characters: Character[];
  notes: Record<string, string>;
  onNote: (id: string, text: string) => void;
  onClose: () => void;
  onSeen: (id: string) => void;
}

function Pane({ clue, characters, flipped, notes, onNote }: { clue: Clue; characters: Character[]; flipped: boolean; notes: Record<string, string>; onNote: Props['onNote'] }) {
  const speaker = characters.find((c) => c.id === clue.speakerId)?.name;
  return (
    <>
      <ClueDoc clue={clue} flipped={flipped} speakerName={speaker} />
      <div className="notes">
        <label htmlFor={`note-${clue.id}`}>Suas anotações</label>
        <textarea id={`note-${clue.id}`} className="input" placeholder="Só você vê isto." value={notes[clue.id] ?? ''} onChange={(e) => onNote(clue.id, e.target.value)} />
      </div>
    </>
  );
}

/** Opens a clue fast; lets the player flip, zoom, listen and compare side by side. */
export function Viewer({ clue, available, characters, notes, onNote, onClose, onSeen }: Props) {
  const [flipA, setFlipA] = useState(false);
  const [flipB, setFlipB] = useState(false);
  const [other, setOther] = useState<Clue | null>(null);
  const [picking, setPicking] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    onSeen(clue.id);
    closeRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clue.id]);
  useEffect(() => {
    if (other) onSeen(other.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [other?.id]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === 'Escape') {
        if (picking) setPicking(false);
        else onClose();
      }
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;
      if (e.key.toLowerCase() === 'v' && clue.back) setFlipA((f) => !f);
      if (e.key.toLowerCase() === 'c') setPicking((p) => !p);
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
          <button className="btn small" onClick={() => setFlipA((f) => !f)} aria-pressed={flipA} title="Atalho: V">
            ↻ {flipA ? 'Ver frente' : 'Virar'}
          </button>
        )}
        {other?.back && (
          <button className="btn small" onClick={() => setFlipB((f) => !f)} aria-pressed={flipB}>↻ Virar 2º</button>
        )}
        {other ? (
          <button className="btn small" onClick={() => setOther(null)}>Fechar comparação</button>
        ) : (
          available.length > 1 && <button className="btn small" onClick={() => setPicking((p) => !p)} title="Atalho: C">⇄ Comparar</button>
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
          <Pane clue={clue} characters={characters} flipped={flipA} notes={notes} onNote={onNote} />
        </div>
        {other && (
          <div className="pane" key={`b-${other.id}`}>
            <Pane clue={other} characters={characters} flipped={flipB} notes={notes} onNote={onNote} />
          </div>
        )}
      </div>
    </div>
  );
}
