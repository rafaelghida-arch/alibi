'use client';
import { useState } from 'react';
import type { ModeProps } from './Game';

export function Accusation({ c, s, up, available, submitAccusation, onBack }: ModeProps & { onBack: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { answers, cited, narrative } = s.draft;
  const fields = c.accusation.fields;
  const culpado = fields.find((f) => f.id === 'culpado')!;
  const others = fields.filter((f) => f.id !== 'culpado');
  const extreme = c.difficulty === 'extreme';
  const setDraft = (patch: Partial<typeof s.draft>) => up((x) => ({ ...x, draft: { ...x.draft, ...patch } }));
  const complete = fields.every((f) => answers[f.id]) && cited.length > 0;
  const sorted = [...available].sort((a, b) => Number(s.opened.includes(b.id)) - Number(s.opened.includes(a.id)));

  async function send() {
    setBusy(true);
    setErr(null);
    try {
      await submitAccusation(answers, cited, narrative);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <main className="accuse">
      <button className="linkbtn" onClick={onBack} style={{ paddingLeft: 0 }}>← Voltar à investigação</button>
      <h1>{extreme ? 'Relatório de investigação' : 'Sua acusação'}</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Você será avaliado pelas conclusões e pelas evidências que citar — não por palavras exatas. Depois de enviar, o caso é encerrado.
      </p>

      <div className="section-title">{culpado.question}</div>
      <div className="suspects" role="radiogroup" aria-label={culpado.question}>
        {culpado.options.map((o) => {
          const ch = c.characters.find((x) => x.id === o.id);
          return (
            <button key={o.id} role="radio" className="suspect" aria-checked={answers.culpado === o.id} onClick={() => setDraft({ answers: { ...answers, culpado: o.id } })}>
              <b>{o.text}</b>
              <span>{ch?.role}</span>
            </button>
          );
        })}
      </div>

      {others.map((f) => (
        <div key={f.id}>
          <div className="section-title">{f.question}</div>
          <div className="opts" role="radiogroup" aria-label={f.question}>
            {f.options.map((o) => (
              <button key={o.id} type="button" role="radio" className="opt" aria-checked={answers[f.id] === o.id} onClick={() => setDraft({ answers: { ...answers, [f.id]: o.id } })}>
                <span className="dot" />
                <span>{o.text}</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="section-title">Evidências que sustentam a acusação · {cited.length}</div>
      <div className="chips">
        {sorted.map((k) => (
          <button key={k.id} className="chip" aria-pressed={cited.includes(k.id)} onClick={() => setDraft({ cited: cited.includes(k.id) ? cited.filter((x) => x !== k.id) : [...cited, k.id] })}>
            {k.title}
          </button>
        ))}
      </div>

      {c.difficulty === 'dificil' && (
        <p className="muted" style={{ fontSize: 14 }}>A cronologia que você montou na aba “Cronologia” também será avaliada.</p>
      )}

      <div className="section-title">{extreme ? 'Sua narrativa do que aconteceu' : 'Sua reconstrução (opcional)'}</div>
      <textarea className="input" style={{ minHeight: extreme ? 180 : 110 }} placeholder="Conte o que aconteceu, na ordem, com suas palavras." value={narrative} onChange={(e) => setDraft({ narrative: e.target.value })} />

      {err && <div className="error" style={{ marginTop: 14 }}>{err}</div>}
      <div className="row" style={{ marginTop: 22 }}>
        <button className="btn primary big" disabled={!complete || busy} onClick={send}>{busy ? 'Enviando…' : 'Apresentar acusação'}</button>
        {!complete && <span className="muted" style={{ fontSize: 14 }}>Responda todos os campos e cite ao menos uma evidência.</span>}
      </div>
    </main>
  );
}
