'use client';
import { useEffect, useState } from 'react';
import { ClueCard } from '../ClueDoc';
import type { ModeProps } from '../Game';
import { initials } from './Medium';

function shuffle<T>(a: T[], seed: number) {
  const r = [...a];
  let x = seed || 1;
  for (let i = r.length - 1; i > 0; i--) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    const j = x % (i + 1);
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

type Tab = 'dep' | 'doc' | 'tl' | 'conf' | 'new';

export function HardMode({ c, s, up, open, available, act, onAccuse }: ModeProps) {
  const h = c.dificil!;
  const [tab, setTab] = useState<Tab>('dep');
  const [who, setWho] = useState<string>('');
  const [what, setWhat] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [freshTab, setFreshTab] = useState(false);

  useEffect(() => {
    if (!s.hard.order.length) up((x) => ({ ...x, hard: { ...x.hard, order: shuffle(h.events.map((e) => e.id), Number(c.number) || 7) } }));
  }, [s.hard.order.length, h.events, c.number, up]);

  const unlocked = available.filter((k) => s.hard.unlocked.includes(k.id));
  const statements = available.filter((k) => k.kind === 'statement' && !s.hard.unlocked.includes(k.id));
  const docs = available.filter((k) => k.kind !== 'statement');
  const order = s.hard.order.length ? s.hard.order : h.events.map((e) => e.id);
  const ev = (id: string) => h.events.find((e) => e.id === id)!;

  function move(id: string, to: number) {
    up((x) => {
      const o = [...(x.hard.order.length ? x.hard.order : order)].filter((y) => y !== id);
      o.splice(Math.max(0, Math.min(o.length, to)), 0, id);
      return { ...x, hard: { ...x.hard, order: o } };
    });
  }
  async function doConfront() {
    if (!who || !what) return;
    setBusy(true);
    try {
      const r = await act({ type: 'confront', characterId: who, clueId: what });
      const already = r.unlocks && s.hard.unlocked.includes(r.unlocks);
      up((x) => ({
        ...x,
        hard: {
          ...x.hard,
          log: [{ characterId: who, clueId: what, reply: r.reply, unlocks: r.pertinent && !already ? r.unlocks : undefined }, ...x.hard.log],
          unlocked: r.pertinent && r.unlocks ? Array.from(new Set([...x.hard.unlocked, r.unlocks])) : x.hard.unlocked,
        },
        fresh: r.pertinent && r.unlocks && !already ? [...x.fresh, r.unlocks] : x.fresh,
      }));
      if (r.pertinent && !already) setFreshTab(true);
    } finally {
      setBusy(false);
    }
  }
  const name = (id: string) => c.characters.find((x) => x.id === id)?.name ?? id;
  const tabs: [Tab, string][] = [['dep', `Depoimentos (${statements.length})`], ['doc', `Documentos (${docs.length})`], ['tl', 'Cronologia'], ['conf', 'Confrontar']];
  if (unlocked.length) tabs.push(['new', `Novas declarações (${unlocked.length})`]);

  return (
    <main className="play">
      <div className="play-head">
        <div>
          <h1>{c.title}</h1>
          <p className="mission-line">{c.mission}</p>
        </div>
        <button className="btn primary" onClick={onAccuse}>Acusar</button>
      </div>
      <div className="tabs" role="tablist">
        {tabs.map(([t, label]) => (
          <button key={t} role="tab" aria-selected={tab === t} className={t === 'new' && freshTab ? 'fresh' : ''} onClick={() => { setTab(t); if (t === 'new') setFreshTab(false); }}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'dep' && <div className="cards">{statements.map((k) => <ClueCard key={k.id} clue={k} seen={s.opened.includes(k.id)} onOpen={() => open(k.id)} />)}</div>}
      {tab === 'doc' && <div className="cards">{docs.map((k) => <ClueCard key={k.id} clue={k} seen={s.opened.includes(k.id)} onOpen={() => open(k.id)} />)}</div>}
      {tab === 'new' && <div className="cards">{unlocked.map((k) => <ClueCard key={k.id} clue={k} seen={s.opened.includes(k.id)} fresh={s.fresh.includes(k.id)} onOpen={() => open(k.id)} />)}</div>}
      {tab === 'tl' && (
        <div className="panel" style={{ maxWidth: 760 }}>
          <p className="muted" style={{ marginTop: 0, fontSize: 14 }}>
            Ordene os acontecimentos. Só alguns têm horário conhecido — os outros você deduz das pistas. A ordem entra na sua acusação.
          </p>
          <ol className="timeline" aria-label="Linha do tempo">
            {order.map((id, i) => {
              const e = ev(id);
              if (!e) return null;
              return (
                <li
                  key={id}
                  className={`tl-item${dragId === id ? ' dragging' : ''}`}
                  draggable
                  onDragStart={() => setDragId(id)}
                  onDragEnd={() => setDragId(null)}
                  onDragOver={(ev2) => ev2.preventDefault()}
                  onDrop={() => dragId && move(dragId, i)}
                >
                  <span className={`tm${e.time ? '' : ' unk'}`}>{e.time ?? '--:--'}</span>
                  <span className="tx">{e.text}</span>
                  <span className="mv">
                    <button aria-label={`Mover para cima: ${e.text}`} disabled={i === 0} onClick={() => move(id, i - 1)}>↑</button>
                    <button aria-label={`Mover para baixo: ${e.text}`} disabled={i === order.length - 1} onClick={() => move(id, i + 1)}>↓</button>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
      {tab === 'conf' && (
        <div className="two-col">
          <div className="panel">
            <div className="section-title" style={{ marginTop: 0 }}>1 · Quem você vai confrontar?</div>
            <div className="people">
              {h.confrontableIds.map((id) => {
                const ch = c.characters.find((x) => x.id === id)!;
                return (
                  <button key={id} className="person" style={{ textAlign: 'left', borderColor: who === id ? 'var(--amber)' : undefined }} aria-pressed={who === id} onClick={() => setWho(id)}>
                    <span className="av">{initials(ch.name)}</span>
                    <span className="nm"><b>{ch.name}</b><span>{ch.role}</span></span>
                  </button>
                );
              })}
            </div>
            <div className="section-title">2 · Com qual evidência?</div>
            <select className="input" value={what} onChange={(e) => setWhat(e.target.value)} aria-label="Evidência">
              <option value="">Escolha uma evidência…</option>
              {available.map((k) => <option key={k.id} value={k.id}>{k.title}</option>)}
            </select>
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn primary" disabled={!who || !what || busy} onClick={doConfront}>{busy ? '…' : 'Confrontar'}</button>
            </div>
          </div>
          <div className="log" aria-live="polite">
            {s.hard.log.length === 0 && <p className="muted">Ninguém foi confrontado ainda. Um confronto pertinente pode fazer alguém mudar a versão.</p>}
            {s.hard.log.map((l, i) => (
              <div key={s.hard.log.length - i} className={`entry${l.unlocks ? ' hit' : ''}`}>
                <div className="muted" style={{ fontSize: 12 }}>{name(l.characterId)} × {c.clues.find((k) => k.id === l.clueId)?.title}</div>
                <div>{l.reply}</div>
                {l.unlocks && (
                  <button className="btn small" style={{ marginTop: 8 }} onClick={() => open(l.unlocks!)}>Ler nova declaração</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
