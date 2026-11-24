'use client';
import { useState } from 'react';
import { ClueCard } from '../ClueDoc';
import type { ModeProps } from '../Game';

export const initials = (n: string) => n.split(' ').map((p) => p[0]).slice(0, 2).join('');

export function MediumMode({ c, s, up, open, available, act, onAccuse, reward }: ModeProps) {
  const m = c.medio!;
  const [sel, setSel] = useState<string[]>([]);
  const [claim, setClaim] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const found = s.medium.found;
  const foundCount = Object.keys(found).length;
  const canAccuse = foundCount >= m.required;

  function toggleSel(id: string) {
    setMsg(null);
    setSel((x) => (x.includes(id) ? x.filter((y) => y !== id) : x.length >= 2 ? [x[1], id] : [...x, id]));
  }
  function hear(cid: string) {
    const ids = m.interviews.find((i) => i.characterId === cid)?.clueIds ?? [];
    up((x) => ({ ...x, medium: { ...x.medium, heard: [...x.medium.heard, cid] }, fresh: [...x.fresh, ...ids] }));
    reward(`hear:${cid}`, 15, `Depoimento colhido: ${c.characters.find((x) => x.id === cid)?.name}`);
  }
  async function verify() {
    if (sel.length !== 2 || !claim) return;
    setBusy(true);
    try {
      const r = await act({ type: 'link', a: sel[0], b: sel[1], claimId: claim, available: available.map((k) => k.id) });
      if (r.correct) {
        if (found[r.deductionId]) {
          setMsg({ ok: true, text: 'Você já tinha estabelecido isso — com outra combinação válida.' });
        } else {
          up((x) => ({
            ...x,
            medium: { ...x.medium, found: { ...x.medium.found, [r.deductionId]: r.establishes }, unlocked: Array.from(new Set([...x.medium.unlocked, ...(r.unlocks ?? [])])) },
            fresh: [...x.fresh, ...(r.unlocks ?? [])],
          }));
          reward(`ded:${r.deductionId}`, 120, m.deductions.find((d) => d.id === r.deductionId)?.label ?? 'Dedução', true);
          setMsg({ ok: true, text: r.unlocks?.length ? `Dedução registrada. ${r.unlocks.length} nova(s) evidência(s) no dossiê.` : 'Dedução registrada.' });
        }
        setSel([]);
        setClaim(null);
      } else setMsg({ ok: false, text: r.message });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }
  function askHint() {
    const next = m.deductions.find((d) => !found[d.id] && !s.medium.hints.includes(d.id));
    if (next) up((x) => ({ ...x, medium: { ...x.medium, hints: [...x.medium.hints, next.id] } }));
  }
  const witnesses = c.characters.filter((ch) => m.interviews.some((i) => i.characterId === ch.id));
  const pending = m.deductions.find((d) => !found[d.id] && !s.medium.hints.includes(d.id));

  return (
    <main className="play">
      <div className="play-head">
        <div>
          <h1>{c.title}</h1>
          <p className="mission-line">{c.mission}</p>
        </div>
      </div>
      <div className="two-col">
        <div>
          <div className="section-title">Dossiê · selecione duas evidências para conectá-las</div>
          <div className="cards">
            {available.map((k) => (
              <div key={k.id} style={{ position: 'relative' }}>
                <ClueCard clue={k} seen={s.opened.includes(k.id)} fresh={s.fresh.includes(k.id)} selected={sel.includes(k.id)} onOpen={() => open(k.id)} />
                <button className="btn small" style={{ position: 'absolute', right: 8, top: 8, minHeight: 28, padding: '0 10px', fontSize: 12 }} onClick={() => toggleSel(k.id)} aria-pressed={sel.includes(k.id)} aria-label={`Selecionar ${k.title}`}>
                  {sel.includes(k.id) ? '✓' : '+'}
                </button>
              </div>
            ))}
          </div>
          <div className="section-title">Quem você quer ouvir?</div>
          <div className="people">
            {witnesses.map((w) => {
              const heard = s.medium.heard.includes(w.id);
              return (
                <div key={w.id} className="person">
                  <span className="av">{initials(w.name)}</span>
                  <span className="nm"><b>{w.name}</b><span>{w.role}</span></span>
                  <button className="btn small" disabled={heard} onClick={() => hear(w.id)}>{heard ? 'Ouvido' : 'Ouvir'}</button>
                </div>
              );
            })}
          </div>
        </div>
        <aside className="sticky">
          <div className="panel">
            <div className="section-title" style={{ marginTop: 0 }}>Conectar evidências</div>
            <div className="slots">
              {[0, 1].map((i) => {
                const k = c.clues.find((x) => x.id === sel[i]);
                return (
                  <div key={i} className={`slot${k ? ' filled' : ''}`}>
                    <span>{k ? k.title : `Evidência ${i === 0 ? 'A' : 'B'}`}</span>
                    {k && <button className="linkbtn" onClick={() => toggleSel(k.id)} aria-label="Remover">✕</button>}
                  </div>
                );
              })}
            </div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>O que a relação entre elas demonstra?</div>
            <div className="claims" role="radiogroup">
              {m.claims.map((cl) => (
                <button key={cl.id} type="button" role="radio" className="opt" aria-checked={claim === cl.id} onClick={() => setClaim(cl.id)}>
                  <span className="dot" />
                  <span>{cl.text}</span>
                </button>
              ))}
            </div>
            <button className="btn primary" disabled={sel.length !== 2 || !claim || busy} onClick={verify}>{busy ? 'Verificando…' : 'Verificar relação'}</button>
            {msg && <div className={msg.ok ? 'hint' : 'error'} style={{ marginTop: 12 }} role="status">{msg.text}</div>}
          </div>
          <div className="panel">
            <div className="section-title" style={{ marginTop: 0 }}>Deduções · {foundCount} de {m.deductions.length}</div>
            <ul className="establish-list">
              {m.deductions.map((d) =>
                found[d.id] ? (
                  <li key={d.id} style={{ animation: 'pop 400ms' }}><b>{d.label}.</b> {found[d.id]}</li>
                ) : s.medium.hints.includes(d.id) ? (
                  <li key={d.id} style={{ borderLeftColor: 'var(--amber)' }}><b>Dica:</b> {d.hint}</li>
                ) : null,
              )}
            </ul>
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn small" onClick={askHint} disabled={!pending}>Pedir dica</button>
              <button className="btn small primary" onClick={onAccuse} disabled={!canAccuse} title={canAccuse ? '' : `Faça ${m.required} deduções para acusar`}>
                Acusar
              </button>
            </div>
            {!canAccuse && <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>A acusação abre após {m.required} deduções.</p>}
          </div>
        </aside>
      </div>
    </main>
  );
}
