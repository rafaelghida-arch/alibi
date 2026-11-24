'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ClueCard } from '../ClueDoc';
import type { ModeProps } from '../Game';
import type { BoardState } from '../state';
import { uid, useIsNarrow } from '@/lib/client';
import { KIND_LABEL } from '@/lib/types';

const CW = 220;
const CH = 130;

function hash(s: string) {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Shuffled, legible starting layout: a jittered grid with no overlaps. */
function scatter(ids: string[], seed: number) {
  const order = [...ids].sort((a, b) => (hash(a + seed) % 997) - (hash(b + seed) % 997));
  const cols = Math.ceil(Math.sqrt(order.length * 1.25));
  const pos: BoardState['pos'] = {};
  order.forEach((id, i) => {
    const h = hash(id);
    pos[id] = { x: (i % cols) * 270 + (h % 40) - 20, y: Math.floor(i / cols) * 200 + ((h >> 4) % 36) - 18 };
  });
  return pos;
}

type Drag =
  | { t: 'card'; id: string; sx: number; sy: number; ox: number; oy: number; moved: boolean }
  | { t: 'note'; id: string; sx: number; sy: number; ox: number; oy: number; moved: boolean }
  | { t: 'pan'; sx: number; sy: number; ox: number; oy: number }
  | { t: 'link'; from: string };

type Prompt = { kind: 'link'; a: string; b: string; x: number; y: number; edit?: string } | { kind: 'group'; ids: string[]; x: number; y: number };

export function ExtremeMode({ c, s, up, open, available, onAccuse, reward }: ModeProps) {
  const narrow = useIsNarrow();
  const b = s.board;
  const mode = b.mode ?? (narrow ? 'list' : 'board');
  const setBoard = useCallback((fn: (b: BoardState) => BoardState) => up((x) => ({ ...x, board: fn(x.board) })), [up]);

  useEffect(() => {
    if (Object.keys(b.pos).length === 0 && available.length) setBoard((bb) => ({ ...bb, pos: scatter(available.map((k) => k.id), Number(c.number) || 1) }));
  }, [b.pos, available, c.number, setBoard]);

  return mode === 'list' ? (
    <ListView {...{ c, s, up, open, available, onAccuse, setBoard }} />
  ) : (
    <Board {...{ c, s, open, available, onAccuse, setBoard, reward }} />
  );
}

function Board({ c, s, open, available, onAccuse, setBoard, reward }: Pick<ModeProps, 'c' | 's' | 'open' | 'available' | 'onAccuse' | 'reward'> & { setBoard: (fn: (b: BoardState) => BoardState) => void }) {
  const b = s.board;
  const wrap = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const [live, setLive] = useState<{ id: string; x: number; y: number } | null>(null);
  const [view, setView] = useState(b.view);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const [sel, setSel] = useState<string[]>([]);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [text, setText] = useState('');
  const [panning, setPanning] = useState(false);
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const framed = useRef(false);
  const lastTap = useRef<{ id: string; t: number } | null>(null);

  const posOf = (id: string) => (live?.id === id ? live : b.pos[id] ?? b.notes.find((n) => n.id === id) ?? { x: 0, y: 0 });
  const center = (id: string) => {
    const p = posOf(id);
    return { x: p.x + CW / 2, y: p.y + CH / 2 };
  };
  const toWorld = useCallback(
    (cx: number, cy: number) => {
      const r = wrap.current!.getBoundingClientRect();
      return { x: (cx - r.left - view.x) / view.s, y: (cy - r.top - view.y) / view.s };
    },
    [view],
  );
  const commitView = useCallback((v: typeof view) => { setView(v); setBoard((bb) => ({ ...bb, view: v })); }, [setBoard]);

  const frameAll = useCallback(() => {
    const el = wrap.current;
    if (!el) return;
    const pts = [...available.map((k) => b.pos[k.id]).filter(Boolean), ...b.notes];
    if (!pts.length) return;
    const minX = Math.min(...pts.map((p) => p.x));
    const minY = Math.min(...pts.map((p) => p.y));
    const maxX = Math.max(...pts.map((p) => p.x + CW));
    const maxY = Math.max(...pts.map((p) => p.y + CH));
    const left = el.clientWidth > 900 ? 280 : 0;
    const w = el.clientWidth - left - 40;
    const h = el.clientHeight - 90;
    const sc = Math.max(0.25, Math.min(1.1, w / (maxX - minX), h / (maxY - minY)));
    commitView({ s: sc, x: left + 20 + (w - (maxX - minX) * sc) / 2 - minX * sc, y: 24 + (h - (maxY - minY) * sc) / 2 - minY * sc });
  }, [available, b.pos, b.notes, commitView]);

  useEffect(() => {
    if (!framed.current && Object.keys(b.pos).length) {
      framed.current = true;
      if (b.view.s === 1 && b.view.x === 0 && b.view.y === 0) frameAll();
    }
  }, [b.pos, b.view, frameAll]);

  function zoomBy(f: number, cx?: number, cy?: number) {
    const el = wrap.current!;
    const r = el.getBoundingClientRect();
    const px = cx != null ? cx - r.left : el.clientWidth / 2;
    const py = cy != null ? cy - r.top : el.clientHeight / 2;
    const ns = Math.max(0.25, Math.min(2.2, view.s * f));
    commitView({ s: ns, x: px - (px - view.x) * (ns / view.s), y: py - (py - view.y) * (ns / view.s) });
  }
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || Math.abs(e.deltaY) > Math.abs(e.deltaX)) zoomBy(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
      else commitView({ ...view, x: view.x - e.deltaX, y: view.y - e.deltaY });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });

  function onDown(e: React.PointerEvent, target: { t: 'card' | 'note'; id: string } | null, handle = false) {
    if (e.button !== 0) return;
    if (handle && target) {
      e.stopPropagation();
      drag.current = { t: 'link', from: target.id };
      setLinkFrom(target.id);
      setCursor(toWorld(e.clientX, e.clientY));
      wrap.current?.setPointerCapture(e.pointerId);
      return;
    }
    if (target) {
      if ((e.target as HTMLElement).tagName === 'TEXTAREA') return;
      e.stopPropagation();
      const p = posOf(target.id);
      drag.current = { t: target.t, id: target.id, sx: e.clientX, sy: e.clientY, ox: p.x, oy: p.y, moved: false };
    } else {
      drag.current = { t: 'pan', sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y };
      setPanning(true);
      setPrompt(null);
    }
    wrap.current?.setPointerCapture(e.pointerId);
  }
  function onMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    if (d.t === 'link') return setCursor(toWorld(e.clientX, e.clientY));
    if (d.t === 'pan') return setView({ ...view, x: d.ox + e.clientX - d.sx, y: d.oy + e.clientY - d.sy });
    const dx = (e.clientX - d.sx) / view.s;
    const dy = (e.clientY - d.sy) / view.s;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    if (d.moved) setLive({ id: d.id, x: d.ox + dx, y: d.oy + dy });
  }
  function onUp(e: React.PointerEvent) {
    const d = drag.current;
    drag.current = null;
    setPanning(false);
    if (!d) return;
    if (d.t === 'pan') return commitView(view);
    if (d.t === 'link') {
      setLinkFrom(null);
      setCursor(null);
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-bcard]') as HTMLElement | null;
      const to = el?.dataset.bcard;
      if (to && to !== d.from) startLinkPrompt(d.from, to, e.clientX, e.clientY);
      return;
    }
    if (d.moved && live) {
      const { x, y } = live;
      if (d.t === 'card') setBoard((bb) => ({ ...bb, pos: { ...bb.pos, [d.id]: { x, y } } }));
      else setBoard((bb) => ({ ...bb, notes: bb.notes.map((n) => (n.id === d.id ? { ...n, x, y } : n)) }));
      setLive(null);
    } else if (d.t === 'card') {
      const now = Date.now();
      if (lastTap.current?.id === d.id && now - lastTap.current.t < 380) {
        lastTap.current = null;
        return open(d.id);
      }
      lastTap.current = { id: d.id, t: now };
      if (activeColor) toggleColor(activeColor, [d.id]);
      else setSel((cur) => (e.shiftKey || e.metaKey ? (cur.includes(d.id) ? cur.filter((x) => x !== d.id) : [...cur, d.id]) : cur.length === 1 && cur[0] === d.id ? [] : [d.id]));
    }
  }
  function startLinkPrompt(a: string, bb: string, x: number, y: number) {
    const r = wrap.current!.getBoundingClientRect();
    setText('');
    setPrompt({ kind: 'link', a, b: bb, x: Math.min(x - r.left, r.width - 320), y: Math.min(y - r.top, r.height - 70) });
  }
  function toggleColor(colorId: string, ids: string[]) {
    setBoard((bb) => {
      const tags = { ...bb.tags };
      const all = ids.every((id) => tags[id]?.includes(colorId));
      for (const id of ids) {
        const cur = tags[id] ?? [];
        tags[id] = all ? cur.filter((t) => t !== colorId) : Array.from(new Set([...cur, colorId]));
      }
      return { ...bb, tags };
    });
  }
  function submitPrompt() {
    if (!prompt) return;
    const label = text.trim();
    if (prompt.kind === 'link') {
      if (prompt.edit) setBoard((bb) => ({ ...bb, links: bb.links.map((l) => (l.id === prompt.edit ? { ...l, label } : l)) }));
      else {
        setBoard((bb) => ({ ...bb, links: [...bb.links, { id: uid(), a: prompt.a, b: prompt.b, label }] }));
        reward(`link:${Math.min(b.links.length + 1, 6)}`, 10, label ? `Ligação: “${label}”` : 'Pistas ligadas');
      }
    } else {
      setBoard((bb) => ({ ...bb, groups: [...bb.groups, { id: uid(), label: label || 'Grupo', ids: prompt.ids }] }));
      reward(`group:${Math.min(b.groups.length + 1, 4)}`, 10, `Grupo criado: ${label || 'Grupo'}`);
    }
    setPrompt(null);
    setSel([]);
  }
  function addNote() {
    const el = wrap.current!;
    const p = { x: (el.clientWidth / 2 - view.x) / view.s - 100, y: (el.clientHeight / 2 - view.y) / view.s - 60 };
    setBoard((bb) => ({ ...bb, notes: [...bb.notes, { id: uid(), ...p, text: '' }] }));
    reward(`note:${Math.min(b.notes.length + 1, 4)}`, 5, 'Nota presa na mesa');
  }

  const groups = b.groups.map((g) => {
    const ps = g.ids.map((id) => posOf(id));
    if (!ps.length) return null;
    const x = Math.min(...ps.map((p) => p.x)) - 22;
    const y = Math.min(...ps.map((p) => p.y)) - 26;
    return { ...g, x, y, w: Math.max(...ps.map((p) => p.x + CW)) + 22 - x, h: Math.max(...ps.map((p) => p.y + CH)) + 22 - y };
  });
  const colorOf = (id: string) => b.colors.find((x) => x.id === id);

  return (
    <div
      ref={wrap}
      className={`boardwrap${panning ? ' panning' : ''}${linkFrom ? ' linking' : ''}`}
      onPointerDown={(e) => onDown(e, null)}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      aria-label="Mesa de investigação"
    >
      <div className="world" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})`, ['--inv' as string]: String(Math.min(2.6, 1 / view.s)) }}>
        {groups.map((g) => g && (
          <div key={g.id} className="bgroup" style={{ left: g.x, top: g.y, width: g.w, height: g.h }}>
            <span className="gl" onPointerDown={(e) => e.stopPropagation()}>
              {g.label}
              <button aria-label={`Desfazer grupo ${g.label}`} onClick={() => setBoard((bb) => ({ ...bb, groups: bb.groups.filter((x) => x.id !== g.id) }))}>✕</button>
            </span>
          </div>
        ))}
        <svg className="links" width="1" height="1">
          {b.links.map((l) => {
            const p = center(l.a);
            const q = center(l.b);
            return <line key={l.id} x1={p.x} y1={p.y} x2={q.x} y2={q.y} />;
          })}
          {linkFrom && cursor && <line className="draft" x1={center(linkFrom).x} y1={center(linkFrom).y} x2={cursor.x} y2={cursor.y} />}
        </svg>
        {available.map((k) => {
          const p = posOf(k.id);
          const tags = b.tags[k.id] ?? [];
          return (
            <div
              key={k.id}
              data-bcard={k.id}
              className={`bcard${live?.id === k.id ? ' dragging' : ''}${sel.includes(k.id) ? ' sel' : ''}`}
              style={{ left: p.x, top: p.y }}
              onPointerDown={(e) => onDown(e, { t: 'card', id: k.id })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); open(k.id); }
                if (e.key === ' ') { e.preventDefault(); setSel((cur) => (cur.includes(k.id) ? cur.filter((x) => x !== k.id) : [...cur, k.id])); }
              }}
            >
              <ClueCard clue={k} seen={s.opened.includes(k.id)} selected={sel.includes(k.id)} onClick={() => {}} onOpen={() => open(k.id)}>
                {tags.length > 0 && (
                  <span className="tags">
                    {tags.map((t) => <i key={t} style={{ background: colorOf(t)?.color }} title={colorOf(t)?.label || 'Sem legenda'} />)}
                  </span>
                )}
              </ClueCard>
              <span className="handle" role="button" aria-label={`Ligar ${k.title} a outra pista`} onPointerDown={(e) => onDown(e, { t: 'card', id: k.id }, true)} />
            </div>
          );
        })}
        {b.notes.map((n) => {
          const p = posOf(n.id);
          return (
            <div key={n.id} className="bnote" style={{ left: p.x, top: p.y }} onPointerDown={(e) => onDown(e, { t: 'note', id: n.id })}>
              <button className="x" aria-label="Apagar nota" onPointerDown={(e) => e.stopPropagation()} onClick={() => setBoard((bb) => ({ ...bb, notes: bb.notes.filter((x) => x.id !== n.id) }))}>✕</button>
              <textarea
                aria-label="Nota"
                placeholder="Escreva uma nota…"
                value={n.text}
                onPointerDown={(e) => e.stopPropagation()}
                onChange={(e) => setBoard((bb) => ({ ...bb, notes: bb.notes.map((x) => (x.id === n.id ? { ...x, text: e.target.value } : x)) }))}
              />
            </div>
          );
        })}
        {b.links.map((l) => {
          const p = center(l.a);
          const q = center(l.b);
          return (
            <button
              key={l.id}
              className="linklabel"
              style={{ left: (p.x + q.x) / 2, top: (p.y + q.y) / 2 }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                const r = wrap.current!.getBoundingClientRect();
                setText(l.label);
                setPrompt({ kind: 'link', a: l.a, b: l.b, edit: l.id, x: e.clientX - r.left, y: e.clientY - r.top });
              }}
            >
              {l.label || 'sem rótulo'}
            </button>
          );
        })}
      </div>

      <div className="boardtools" onPointerDown={(e) => e.stopPropagation()}>
        <div className="panel">
          <h4>Caso Nº {c.number}</h4>
          <div style={{ fontWeight: 650, lineHeight: 1.3 }}>{c.title}</div>
          <p className="muted" style={{ fontSize: 13, margin: '6px 0 0' }}>{c.mission}</p>
        </div>
        <div className="panel">
          <h4>Cores e legendas</h4>
          {b.colors.map((col) => (
            <div key={col.id} className="legend-row">
              <button
                className="sw"
                style={{ background: col.color }}
                aria-pressed={activeColor === col.id}
                aria-label={`Cor ${col.label || 'sem legenda'}${sel.length ? ': aplicar às selecionadas' : ''}`}
                onClick={() => (sel.length ? toggleColor(col.id, sel) : setActiveColor((a) => (a === col.id ? null : col.id)))}
              />
              <input aria-label="Legenda da cor" placeholder="Legenda…" value={col.label} onBlur={(e) => e.target.value.trim() && reward(`label:${col.id}`, 5, `Legenda: ${e.target.value.trim()}`)} onChange={(e) => setBoard((bb) => ({ ...bb, colors: bb.colors.map((x) => (x.id === col.id ? { ...x, label: e.target.value } : x)) }))} />
            </div>
          ))}
          <p className="muted" style={{ fontSize: 12, margin: '6px 0 0' }}>
            {activeColor ? 'Clique nos cartões para pintar. Clique na cor de novo para parar.' : 'Selecione cartões e clique numa cor — ou escolha a cor e clique nos cartões.'}
          </p>
        </div>
        <div className="panel">
          <h4>{sel.length ? `${sel.length} selecionada(s)` : 'Ações'}</h4>
          <div className="row">
            {sel.length === 1 && <button className="btn small" onClick={() => open(sel[0])}>Abrir</button>}
            {sel.length === 2 && <button className="btn small" onClick={() => startLinkPrompt(sel[0], sel[1], 300, 200)}>Ligar</button>}
            {sel.length >= 2 && <button className="btn small" onClick={() => { setText(''); setPrompt({ kind: 'group', ids: sel, x: 290, y: 200 }); }}>Agrupar</button>}
            <button className="btn small" onClick={addNote}>Nova nota</button>
            <button className="btn small" onClick={frameAll}>Enquadrar todas as pistas</button>
            <button className="btn small" onClick={() => setBoard((bb) => ({ ...bb, mode: 'list' }))}>Ver em lista</button>
          </div>
          <p className="muted" style={{ fontSize: 12, margin: '10px 0 0' }}>Arraste o ponto âmbar de um cartão até outro para ligar. Clique duplo abre a pista. Shift+clique seleciona várias.</p>
        </div>
        <button className="btn primary" onClick={onAccuse}>Escrever relatório e acusar</button>
      </div>

      <div className="zoombar" onPointerDown={(e) => e.stopPropagation()}>
        <button className="btn small ghost" onClick={() => zoomBy(1 / 1.2)} aria-label="Afastar">−</button>
        <span className="mono">{Math.round(view.s * 100)}%</span>
        <button className="btn small ghost" onClick={() => zoomBy(1.2)} aria-label="Aproximar">+</button>
        <button className="btn small" onClick={frameAll}>Enquadrar</button>
      </div>

      {prompt && (
        <form
          className="inlineprompt"
          style={{ left: Math.max(8, prompt.x), top: Math.max(8, prompt.y) }}
          onPointerDown={(e) => e.stopPropagation()}
          onSubmit={(e) => { e.preventDefault(); submitPrompt(); }}
        >
          <input
            autoFocus
            className="input"
            placeholder={prompt.kind === 'link' ? 'Rótulo da ligação (ex.: os relógios discordam)' : 'Nome do grupo'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setPrompt(null)}
          />
          <button className="btn small primary" type="submit">OK</button>
          {prompt.kind === 'link' && prompt.edit && (
            <button className="btn small" type="button" onClick={() => { setBoard((bb) => ({ ...bb, links: bb.links.filter((l) => l.id !== prompt.edit) })); setPrompt(null); }}>Apagar</button>
          )}
        </form>
      )}
    </div>
  );
}

function ListView({ c, s, up, open, available, onAccuse, setBoard }: Pick<ModeProps, 'c' | 's' | 'up' | 'open' | 'available' | 'onAccuse'> & { setBoard: (fn: (b: BoardState) => BoardState) => void }) {
  const b = s.board;
  const [linkFor, setLinkFor] = useState<string | null>(null);
  const [target, setTarget] = useState('');
  const [label, setLabel] = useState('');
  const narrow = useIsNarrow();
  const title = useMemo(() => Object.fromEntries(c.clues.map((k) => [k.id, k.title])), [c.clues]);
  return (
    <div className="listview">
      <div className="play-head">
        <div>
          <h1 style={{ fontSize: 24 }}>{c.title}</h1>
          <p className="mission-line">{c.mission}</p>
        </div>
        <div className="row">
          {!narrow && <button className="btn small" onClick={() => setBoard((bb) => ({ ...bb, mode: 'board' }))}>Ver mesa</button>}
          <button className="btn small primary" onClick={onAccuse}>Acusar</button>
        </div>
      </div>
      <details className="panel" style={{ marginBottom: 14 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Legendas de cor</summary>
        <div style={{ marginTop: 10 }}>
          {b.colors.map((col) => (
            <div key={col.id} className="legend-row">
              <span className="sw" style={{ background: col.color }} />
              <input className="input" aria-label="Legenda da cor" placeholder="Legenda…" value={col.label} onChange={(e) => setBoard((bb) => ({ ...bb, colors: bb.colors.map((x) => (x.id === col.id ? { ...x, label: e.target.value } : x)) }))} />
            </div>
          ))}
        </div>
      </details>
      {b.notes.length > 0 && (
        <div className="panel" style={{ marginBottom: 14 }}>
          <div className="section-title" style={{ marginTop: 0 }}>Notas da mesa</div>
          {b.notes.map((n) => (
            <textarea key={n.id} className="input" style={{ marginBottom: 8 }} value={n.text} aria-label="Nota" onChange={(e) => setBoard((bb) => ({ ...bb, notes: bb.notes.map((x) => (x.id === n.id ? { ...x, text: e.target.value } : x)) }))} />
          ))}
        </div>
      )}
      {available.map((k) => {
        const tags = b.tags[k.id] ?? [];
        const conns = b.links.filter((l) => l.a === k.id || l.b === k.id);
        const grs = b.groups.filter((g) => g.ids.includes(k.id));
        return (
          <div key={k.id} className="listitem">
            <div className="hd">
              <div>
                <div className="mono muted" style={{ fontSize: 10.5 }}>{KIND_LABEL[k.kind].toUpperCase()}{s.opened.includes(k.id) ? ' · examinada' : ''}</div>
                <b>{k.title}</b>
              </div>
              <button className="btn small" onClick={() => open(k.id)}>Abrir</button>
            </div>
            <div className="sws" role="group" aria-label="Cores">
              {b.colors.map((col) => (
                <button key={col.id} style={{ background: col.color }} aria-pressed={tags.includes(col.id)} aria-label={col.label || 'Cor sem legenda'}
                  onClick={() => setBoard((bb) => ({ ...bb, tags: { ...bb.tags, [k.id]: tags.includes(col.id) ? tags.filter((t) => t !== col.id) : [...tags, col.id] } }))} />
              ))}
              {tags.map((t) => { const col = b.colors.find((x) => x.id === t); return col?.label ? <span key={t} className="chip" style={{ padding: '3px 8px', fontSize: 12 }}>{col.label}</span> : null; })}
            </div>
            <textarea className="input" placeholder="Suas anotações…" aria-label={`Anotações sobre ${k.title}`} value={s.notes[k.id] ?? ''} onChange={(e) => up((x) => ({ ...x, notes: { ...x.notes, [k.id]: e.target.value } }))} />
            {(conns.length > 0 || grs.length > 0) && (
              <div className="conns">
                {grs.map((g) => <div key={g.id}>Grupo: <b>{g.label}</b></div>)}
                {conns.map((l) => (
                  <div key={l.id}>↔ {title[l.a === k.id ? l.b : l.a]} {l.label && <>— “{l.label}”</>}
                    <button className="linkbtn" onClick={() => setBoard((bb) => ({ ...bb, links: bb.links.filter((x) => x.id !== l.id) }))} aria-label="Apagar ligação">✕</button>
                  </div>
                ))}
              </div>
            )}
            {linkFor === k.id ? (
              <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                <select className="input" value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Ligar a">
                  <option value="">Ligar a…</option>
                  {available.filter((o) => o.id !== k.id).map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
                </select>
                <input className="input" placeholder="Rótulo da ligação" value={label} onChange={(e) => setLabel(e.target.value)} />
                <div className="row">
                  <button className="btn small primary" disabled={!target} onClick={() => { setBoard((bb) => ({ ...bb, links: [...bb.links, { id: uid(), a: k.id, b: target, label: label.trim() }] })); setLinkFor(null); setTarget(''); setLabel(''); }}>Ligar</button>
                  <button className="btn small ghost" onClick={() => setLinkFor(null)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <button className="linkbtn" style={{ marginTop: 6 }} onClick={() => setLinkFor(k.id)}>+ Ligar a outra pista</button>
            )}
          </div>
        );
      })}
    </div>
  );
}
