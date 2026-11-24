'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { KIND_LABEL, type Clue } from '@/lib/types';

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h);
}

/** Small card used in grids and on the board. */
export function ClueCard({
  clue, seen, selected, fresh, onOpen, onClick, children,
}: {
  clue: Clue; seen?: boolean; selected?: boolean; fresh?: boolean;
  onOpen?: () => void; onClick?: () => void; children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`cluecard${selected ? ' sel' : ''}`}
      data-kind={clue.kind}
      data-clue={clue.id}
      onClick={onClick ?? onOpen}
      onDoubleClick={onOpen}
      aria-pressed={selected}
    >
      <span className="k">
        <span>{KIND_LABEL[clue.kind]}</span>
        {fresh && <span className="new">NOVA</span>}
      </span>
      <span className="t">{clue.title}</span>
      {clue.subtitle && <span className="s">{clue.subtitle}</span>}
      {children}
      {seen && <span className="seen">examinada</span>}
    </button>
  );
}

function PhotoScene({ clue }: { clue: Clue }) {
  const h = hash(clue.id);
  const hue = h % 360;
  const layers = (clue.marks ?? []).map((m, i) => {
    const w = 14 + ((h >> (i * 3)) % 14);
    return `radial-gradient(${w}% ${w * 0.8}% at ${m.x}% ${m.y}%, hsla(${(hue + i * 40) % 360}, 25%, ${42 + i * 4}%, .75), transparent 70%)`;
  });
  return (
    <div
      className="scene"
      style={{
        background: [
          ...layers,
          `linear-gradient(180deg, hsla(${hue}, 14%, 22%, 1) 0%, hsla(${(hue + 30) % 360}, 10%, 12%, 1) 62%, hsla(${hue}, 8%, 8%, 1) 100%)`,
        ].join(','),
      }}
    />
  );
}

function PhotoDoc({ clue }: { clue: Clue }) {
  const [zoom, setZoom] = useState<string | null>(null);
  const mark = clue.marks?.find((m) => m.id === zoom);
  return (
    <div className="doc d-photo">
      <div className="ph">
        <div style={{ position: 'absolute', inset: 0, transition: 'transform 380ms cubic-bezier(.2,.8,.2,1)', transform: mark ? `scale(2.4)` : 'none', transformOrigin: mark ? `${mark.x}% ${mark.y}%` : '50% 50%' }}>
          <PhotoScene clue={clue} />
          {!mark && clue.marks?.map((m, i) => (
            <button key={m.id} className="mk" style={{ left: `${m.x}%`, top: `${m.y}%` }} onClick={() => setZoom(m.id)} aria-label={`Ampliar: ${m.label}`}>
              {i + 1}
            </button>
          ))}
        </div>
        <div className="grain" />
        <div className="cap">{mark ? `Ampliação · ${mark.label}` : clue.scene}</div>
      </div>
      {(clue.marks?.length ?? 0) > 0 && (
        <div className="marklist" role="group" aria-label="Detalhes para ampliar">
          {clue.marks!.map((m, i) => (
            <button key={m.id} aria-pressed={zoom === m.id} onClick={() => setZoom(zoom === m.id ? null : m.id)}>
              {i + 1}. {m.label}
            </button>
          ))}
        </div>
      )}
      {mark && <div className="zoomdetail" key={mark.id}>{mark.detail}</div>}
      <div className="foot">
        <span>{clue.title}</span>
        <span>{clue.subtitle}</span>
      </div>
    </div>
  );
}

function AudioDoc({ clue }: { clue: Clue }) {
  const [canSpeak, setCanSpeak] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(-1);
  const stopRef = useRef(false);
  const bars = useMemo(() => Array.from({ length: 48 }, (_, i) => 20 + ((hash(clue.id + i) % 80))), [clue.id]);
  useEffect(() => {
    setCanSpeak(typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined');
    return () => {
      stopRef.current = true;
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);
  const lines = clue.transcript ?? [];
  function play() {
    const synth = window.speechSynthesis;
    if (playing) {
      stopRef.current = true;
      synth.cancel();
      setPlaying(false);
      setCur(-1);
      return;
    }
    stopRef.current = false;
    synth.cancel();
    const voices = synth.getVoices();
    const voice = voices.find((v) => v.lang?.toLowerCase() === 'pt-br') ?? voices.find((v) => v.lang?.toLowerCase().startsWith('pt'));
    setPlaying(true);
    lines.forEach((l, i) => {
      const u = new SpeechSynthesisUtterance(l.text);
      u.lang = 'pt-BR';
      if (voice) u.voice = voice;
      u.rate = 1;
      u.pitch = (hash(l.speaker) % 5) / 10 + 0.8;
      u.onstart = () => !stopRef.current && setCur(i);
      u.onend = () => {
        if (i === lines.length - 1) {
          setPlaying(false);
          setCur(-1);
        }
      };
      u.onerror = () => {
        setPlaying(false);
        setCur(-1);
      };
      synth.speak(u);
    });
  }
  const progress = cur < 0 ? 0 : (cur + 1) / lines.length;
  return (
    <div className="doc d-audio">
      <div className="mono" style={{ fontSize: 11, letterSpacing: '.14em', color: '#9fb2c3' }}>GRAVAÇÃO</div>
      <h3 style={{ margin: '6px 0 2px' }}>{clue.title}</h3>
      <div style={{ color: '#9fb2c3', fontSize: 13 }}>{clue.subtitle}</div>
      <div className="wave" aria-hidden>
        {bars.map((b, i) => <i key={i} style={{ height: `${b}%` }} className={i / bars.length < progress ? 'on' : ''} />)}
      </div>
      {canSpeak && (
        <button className="btn primary small" onClick={play} aria-label={playing ? 'Parar gravação' : 'Ouvir gravação'}>
          {playing ? '■ Parar' : '▶ Ouvir'}
        </button>
      )}
      <div className="tr" aria-label="Transcrição integral">
        <b>Transcrição</b>
        {lines.map((l, i) => (
          <p key={i} className={i === cur ? 'cur' : ''}>
            <span style={{ color: '#9fb2c3' }}>{l.speaker}: </span>
            {l.text}
          </p>
        ))}
      </div>
    </div>
  );
}

function MapDoc({ clue }: { clue: Clue }) {
  const places = clue.places ?? [];
  const at = (id: string) => places.find((p) => p.id === id);
  return (
    <div className="doc d-map">
      <h3 style={{ fontFamily: 'var(--display)' }}>{clue.title}</h3>
      {clue.subtitle && <div className="docsub">{clue.subtitle}</div>}
      <svg viewBox="0 0 100 70" role="img" aria-label={`Mapa: ${places.map((p) => p.label).join(', ')}`}>
        {(clue.routes ?? []).map((r, i) => {
          const a = at(r.from);
          const b = at(r.to);
          if (!a || !b) return null;
          return (
            <g key={i}>
              <line x1={a.x} y1={a.y * 0.7} x2={b.x} y2={b.y * 0.7} stroke="#9a7b4f" strokeWidth={0.5} strokeDasharray="1.4 1" />
              {r.label && (
                <text x={(a.x + b.x) / 2} y={((a.y + b.y) / 2) * 0.7 - 1} fontSize={2.4} fill="#7a5b2f" textAnchor="middle" fontFamily="var(--mono)">{r.label}</text>
              )}
            </g>
          );
        })}
        {places.map((p, i) => (
          <g key={p.id}>
            <circle cx={p.x} cy={p.y * 0.7} r={1.8} fill="#c0392b" />
            <text x={p.x} y={p.y * 0.7 - 2.8} fontSize={2.9} textAnchor="middle" fill="#222" fontWeight={600} fontFamily="var(--sans)">{i + 1}. {p.label}</text>
          </g>
        ))}
      </svg>
      <div className="legend">
        {places.map((p, i) => (
          <div key={p.id}><b>{i + 1}. {p.label}</b>{p.note ? ` — ${p.note}` : ''}</div>
        ))}
      </div>
    </div>
  );
}

function Lines({ clue }: { clue: Clue }) {
  return (
    <dl>
      {clue.lines!.map((l, i) => (
        <div key={i} style={{ display: 'contents' }}>
          <dt>{l.label ?? ''}</dt>
          <dd>{l.text}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DocFront({ clue, speakerName }: { clue: Clue; speakerName?: string }) {
  switch (clue.kind) {
    case 'photo':
      return <PhotoDoc clue={clue} />;
    case 'audio':
      return <AudioDoc clue={clue} />;
    case 'map':
      return <MapDoc clue={clue} />;
    case 'chat':
      return (
        <div className="doc d-chat">
          <div className="scr">
            <div className="hd">{clue.title}<small>{clue.subtitle}</small></div>
            {clue.messages?.map((m, i) => {
              const me = !!clue.subtitle?.toLowerCase().includes(`de ${m.from}`.toLowerCase());
              return (
                <div key={i} className={`bubble${me ? ' me' : ''}`}>
                  {!me && <div className="who">{m.from}</div>}
                  <div>{m.text}</div>
                  <div className="tm">{m.time}</div>
                </div>
              );
            })}
          </div>
        </div>
      );
    case 'receipt':
      return (
        <div className="doc d-receipt">
          {clue.lines?.map((l, i) =>
            l.label ? (
              <div key={i} className={`rl${/total/i.test(l.label) ? ' total' : ''}`}><span>{l.label}</span><span>{l.text}</span></div>
            ) : (
              <div key={i} className={`rl c${i === 0 ? ' ttl' : ''}`}>{l.text}</div>
            ),
          )}
          {clue.paragraphs?.map((p, i) => <div key={i} className="rl c">{p}</div>)}
        </div>
      );
    case 'ticket':
      return (
        <div className="doc d-ticket">
          <div className="main">
            {clue.lines?.map((l, i) =>
              l.label ? (
                <div key={i} className="line"><b>{l.label}</b> {l.text}</div>
              ) : (
                <div key={i} className="head">{l.text}</div>
              ),
            )}
          </div>
          <div className="stub">ADMITIDO</div>
        </div>
      );
    case 'note':
      return (
        <div className="doc d-note">
          {(clue.paragraphs ?? clue.lines?.map((l) => l.text) ?? []).map((p, i) => <p key={i}>{p}</p>)}
        </div>
      );
    case 'agenda':
      return (
        <div className="doc d-agenda">
          <h3 style={{ fontFamily: 'var(--display)' }}>{clue.title}</h3>
          {clue.subtitle && <div className="docsub">{clue.subtitle}</div>}
          {clue.lines?.map((l, i) => (
            <div key={i} className="day"><b>{l.label}</b><span>{l.text}</span></div>
          ))}
        </div>
      );
    case 'log':
    case 'calllog':
      return (
        <div className="doc d-log">
          <h3>{clue.title}</h3>
          {clue.subtitle && <div className="docsub">{clue.subtitle}</div>}
          {clue.lines?.map((l, i) => (
            <div key={i} className={`ll${/alerta|falha|desarmado|não atendida|não encontrada/i.test(l.text) ? ' alert' : ''}`}>
              <span className="l">{l.label}</span>
              <span>{l.text}</span>
            </div>
          ))}
          {clue.paragraphs?.map((p, i) => <div key={i} className="ll"><span /> <span>{p}</span></div>)}
        </div>
      );
    case 'statement':
      return (
        <div className="doc d-statement">
          <header><span>TERMO DE DEPOIMENTO</span><span>{speakerName ?? ''}</span></header>
          <div className="body">
            <h3 style={{ fontFamily: 'var(--display)', fontSize: 20 }}>{clue.title}</h3>
            {clue.subtitle && <div className="docsub">{clue.subtitle}</div>}
            {clue.paragraphs?.map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </div>
      );
    default:
      return (
        <div className="doc d-paper">
          <h3 style={{ fontFamily: 'var(--display)' }}>{clue.title}</h3>
          {clue.subtitle && <div className="docsub">{clue.subtitle}</div>}
          {clue.paragraphs?.map((p, i) => <p key={i}>{p}</p>)}
          {clue.lines && <Lines clue={clue} />}
        </div>
      );
  }
}

export function ClueDoc({ clue, flipped, speakerName }: { clue: Clue; flipped: boolean; speakerName?: string }) {
  if (!clue.back) return <div style={{ width: 'min(640px, 100%)', display: 'flex', justifyContent: 'center' }}><DocFront clue={clue} speakerName={speakerName} /></div>;
  return (
    <div className={`flip${flipped ? ' flipped' : ''}`}>
      <div className="flip-inner">
        <div className="flip-face" aria-hidden={flipped} style={{ display: 'flex', justifyContent: 'center' }}>
          <DocFront clue={clue} speakerName={speakerName} />
        </div>
        <div className="flip-face flip-back" aria-hidden={!flipped}>
          <div className="backpaper" aria-label="Verso">{clue.back}</div>
        </div>
      </div>
    </div>
  );
}
