'use client';
import { useEffect, useMemo, useState } from 'react';
import { DocFront } from './ClueDoc';
import type { PublicCase } from '@/lib/types';
import { useReducedMotion } from '@/lib/client';

export function Intro({ c, onDone }: { c: PublicCase; onDone: () => void }) {
  const reduced = useReducedMotion();
  const [skipped, setSkipped] = useState(false);
  const [ready, setReady] = useState(false);
  const textStart = 2300;
  const step = 1100;
  const total = textStart + c.intro.paragraphs.length * step;
  useEffect(() => {
    const t = setTimeout(() => setReady(true), reduced || skipped ? 0 : total);
    return () => clearTimeout(t);
  }, [reduced, skipped, total]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        if (!ready) setSkipped(true);
      }
      if (e.key === 'Enter' && ready) onDone();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [ready, onDone]);
  const done = skipped || reduced;
  return (
    <div className={`stage${done ? ' intro-done' : ''}`}>
      <div className="desk-grain" />
      <div className="intro-wrap">
        <div style={{ width: 'min(920px, 100%)' }}>
          <div className="folder">
            <div className="tab">CASO Nº {c.number}</div>
            <div className="inside">
              <div className="intro-photo"><DocFront clue={c.intro.photo} /></div>
              <div className="intro-text">
                <div className="meta">{c.intro.location} · {c.intro.date}</div>
                {c.intro.paragraphs.map((p, i) => (
                  <p key={i} style={{ animationDelay: `${textStart + i * step}ms` }}>{p}</p>
                ))}
              </div>
            </div>
            <div className="cover"><div className="stamp">CONFIDENCIAL · {c.number}</div></div>
          </div>
          {ready && (
            <div className="intro-actions">
              <button className="btn primary big" onClick={onDone} autoFocus>Continuar</button>
            </div>
          )}
        </div>
      </div>
      {!ready && (
        <button className="btn small skip" onClick={() => setSkipped(true)}>Pular abertura</button>
      )}
    </div>
  );
}

const TIMES: { v: number | null; label: string; sub: string }[] = [
  { v: 15, label: '15 min', sub: 'Relâmpago' },
  { v: 30, label: '30 min', sub: 'Focado' },
  { v: 45, label: '45 min', sub: 'Meticuloso' },
  { v: 60, label: '60 min', sub: 'Uma noite inteira' },
  { v: null, label: 'Sem limite', sub: 'No seu ritmo' },
];

export function Mission({ c, onStart }: { c: PublicCase; onStart: (min: number | null) => void }) {
  const [choice, setChoice] = useState<number | null | 'custom' | undefined>(undefined);
  const [custom, setCustom] = useState(20);
  const suspects = c.characters.filter((x) => c.suspectIds.includes(x.id));
  const valid = choice !== undefined && (choice !== 'custom' || (custom >= 5 && custom <= 240));
  return (
    <div className="stage">
      <div className="desk-grain" />
      <div className="mission">
        <div className="label">Sua missão</div>
        <h2>{c.mission}</h2>
        <div className="cast" aria-label="Envolvidos">
          {suspects.map((s) => (
            <span key={s.id}><b>{s.name}</b> · {s.role}</span>
          ))}
        </div>
        <div className="timeq">
          <h3 style={{ fontFamily: 'var(--display)', fontSize: 20, margin: 0 }}>Quanto tempo você quer para investigar?</h3>
          <p className="muted" style={{ margin: '4px 0 0', fontSize: 14 }}>O cronômetro só começa quando as pistas estiverem na mesa. Se o tempo acabar, você pode continuar.</p>
          <div className="timegrid" role="radiogroup" aria-label="Tempo de investigação">
            {TIMES.map((t) => (
              <button key={t.label} role="radio" className="timebtn" aria-pressed={choice === t.v} aria-checked={choice === t.v} onClick={() => setChoice(t.v)}>
                {t.label}<small>{t.sub}</small>
              </button>
            ))}
            <button role="radio" className="timebtn" aria-pressed={choice === 'custom'} aria-checked={choice === 'custom'} onClick={() => setChoice('custom')}>
              Personalizado<small>Você decide</small>
            </button>
          </div>
          {choice === 'custom' && (
            <div className="field" style={{ marginBottom: 16 }}>
              <input aria-label="Minutos" className="input" type="number" min={5} max={240} value={custom} onChange={(e) => setCustom(Number(e.target.value))} style={{ width: 110 }} />
              <span className="muted">minutos (5 a 240)</span>
            </div>
          )}
          <button className="btn primary big" disabled={!valid} onClick={() => onStart(choice === 'custom' ? custom : (choice as number | null))}>
            Começar a investigação
          </button>
        </div>
      </div>
    </div>
  );
}

export function Deal({ count, onDone }: { count: number; onDone: () => void }) {
  const reduced = useReducedMotion();
  useEffect(() => {
    const t = setTimeout(onDone, reduced ? 300 : 1900);
    return () => clearTimeout(t);
  }, [onDone, reduced]);
  const cards = useMemo(
    () =>
      Array.from({ length: Math.min(count, 8) }, (_, i) => ({
        fx: `${(i - 4) * 30}px`, fr: `${(i % 2 ? 1 : -1) * 25}deg`,
        tx: `${(i % 4 - 1.5) * 170}px`, ty: `${(Math.floor(i / 4) - 0.5) * 130 + 90}px`, tr: `${((i * 37) % 9) - 4}deg`, d: `${300 + i * 90}ms`,
      })),
    [count],
  );
  return (
    <div className="deal" aria-live="polite">
      {cards.map((c, i) => (
        <div key={i} className="flying" style={{ ['--fx' as string]: c.fx, ['--fr' as string]: c.fr, ['--tx' as string]: c.tx, ['--ty' as string]: c.ty, ['--tr' as string]: c.tr, animationDelay: c.d }} />
      ))}
      <h2>Aqui estão suas primeiras pistas</h2>
    </div>
  );
}
