'use client';
import { useState } from 'react';
import { ClueCard } from '../ClueDoc';
import type { ModeProps } from '../Game';

function Option({ checked, onClick, children }: { checked: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" role="radio" aria-checked={checked} className="opt" onClick={onClick}>
      <span className="dot" />
      <span>{children}</span>
    </button>
  );
}

export function EasyMode({ c, s, up, open, available, act, submitAccusation }: ModeProps) {
  const sec = c.facil!;
  const stageIdx = s.easy.stage;
  const stage = sec.stages[stageIdx];
  const [pick, setPick] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const solvedHere = stage ? s.easy.solved[stage.id] : undefined;

  async function answer() {
    if (!pick || !stage) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await act({ type: 'stage', stageId: stage.id, optionId: pick });
      if (r.correct) {
        setHint(null);
        up((x) => ({ ...x, easy: { ...x.easy, solved: { ...x.easy.solved, [stage.id]: r.establishes } } }));
      } else setHint(r.hint);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function next() {
    const nextIds = stageIdx + 1 < sec.stages.length ? sec.stages[stageIdx + 1].clueIds : sec.conclusionClueIds;
    up((x) => ({ ...x, easy: { ...x.easy, stage: x.easy.stage + 1 }, fresh: nextIds }));
    setPick(null);
    setHint(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const steps = [...sec.stages.map((x, i) => `Etapa ${i + 1}`), 'Conclusão'];
  const current = stage ? stage.clueIds : sec.conclusionClueIds;
  const earlier = available.filter((k) => !current.includes(k.id));
  const established = sec.stages.filter((x) => s.easy.solved[x.id]).map((x) => ({ title: x.title, text: s.easy.solved[x.id] }));

  return (
    <main className="play">
      <div className="play-head">
        <div>
          <div className="stepper" aria-label="Progresso">
            {steps.map((t, i) => (
              <span key={t} className={i < stageIdx ? 'done' : i === stageIdx ? 'on' : ''}>{t}</span>
            ))}
          </div>
          <h1 style={{ marginTop: 12 }}>{stage ? stage.title : 'Quem esteve no cinema?'}</h1>
          <p className="mission-line">{c.mission}</p>
        </div>
      </div>
      <div className="two-col">
        <div>
          <div className="section-title">{stage ? 'Pistas desta etapa' : 'Novas pistas para a conclusão'}</div>
          <div className="cards">
            {current.map((id) => {
              const k = c.clues.find((x) => x.id === id)!;
              return <ClueCard key={id} clue={k} seen={s.opened.includes(id)} fresh={s.fresh.includes(id)} onOpen={() => open(id)} />;
            })}
          </div>
          {earlier.length > 0 && (
            <>
              <div className="section-title">Pistas anteriores</div>
              <div className="cards">
                {earlier.map((k) => <ClueCard key={k.id} clue={k} seen={s.opened.includes(k.id)} onOpen={() => open(k.id)} />)}
              </div>
            </>
          )}
        </div>
        <aside className="sticky">
          {stage ? (
            <div className="panel question">
              <div className="mono muted" style={{ fontSize: 11, letterSpacing: '.14em' }}>PERGUNTA {stageIdx + 1} DE {sec.stages.length}</div>
              <h3>{stage.question}</h3>
              {!solvedHere ? (
                <>
                  <div className="opts" role="radiogroup">
                    {stage.options.map((o) => (
                      <Option key={o.id} checked={pick === o.id} onClick={() => setPick(o.id)}>{o.text}</Option>
                    ))}
                  </div>
                  <div className="row" style={{ marginTop: 14 }}>
                    <button className="btn primary" disabled={!pick || busy} onClick={answer}>{busy ? 'Verificando…' : 'Responder'}</button>
                  </div>
                  {hint && <div className="hint" role="status" key={hint + pick}><b>Ainda não.</b> {hint}</div>}
                  {err && <div className="error" style={{ marginTop: 12 }}>{err}</div>}
                </>
              ) : (
                <div className="discovery" role="status">
                  <div className="k">Descoberta</div>
                  <p>{solvedHere}</p>
                  <button className="btn primary" onClick={next} autoFocus>
                    {stageIdx + 1 < sec.stages.length ? `Abrir etapa ${stageIdx + 2}` : 'Ir para a conclusão'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <GuidedConclusion c={c} s={s} up={up} available={available} submit={submitAccusation} />
          )}
          {established.length > 0 && (
            <div className="panel">
              <div className="section-title" style={{ marginTop: 0 }}>O que já está estabelecido</div>
              <ul className="establish-list">
                {established.map((e) => <li key={e.title}><b>{e.title}.</b> {e.text}</li>)}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

function GuidedConclusion({ c, s, up, available, submit }: Pick<ModeProps, 'c' | 's' | 'up' | 'available'> & { submit: ModeProps['submitAccusation'] }) {
  const fields = c.accusation.fields;
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const answers = s.draft.answers;
  const cited = s.draft.cited;
  const total = fields.length + 1;
  const setAns = (fid: string, v: string) => up((x) => ({ ...x, draft: { ...x.draft, answers: { ...x.draft.answers, [fid]: v } } }));
  const toggle = (id: string) => up((x) => ({ ...x, draft: { ...x.draft, cited: x.draft.cited.includes(id) ? x.draft.cited.filter((y) => y !== id) : [...x.draft.cited, id] } }));
  const f = fields[i];
  async function send() {
    setBusy(true);
    setErr(null);
    try {
      await submit(answers, cited, '');
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <div className="panel question">
      <div className="progressdots">{Array.from({ length: total }, (_, k) => <i key={k} className={k <= i ? 'on' : ''} />)}</div>
      {f ? (
        <>
          <div className="mono muted" style={{ fontSize: 11, letterSpacing: '.14em' }}>CONCLUSÃO · {i + 1} DE {total}</div>
          <h3>{f.question}</h3>
          <div className="opts" role="radiogroup">
            {f.options.map((o) => (
              <Option key={o.id} checked={answers[f.id] === o.id} onClick={() => setAns(f.id, o.id)}>{o.text}</Option>
            ))}
          </div>
          <div className="row" style={{ marginTop: 14 }}>
            {i > 0 && <button className="btn ghost" onClick={() => setI(i - 1)}>Voltar</button>}
            <button className="btn primary" disabled={!answers[f.id]} onClick={() => setI(i + 1)}>Próxima</button>
          </div>
        </>
      ) : (
        <>
          <div className="mono muted" style={{ fontSize: 11, letterSpacing: '.14em' }}>CONCLUSÃO · {total} DE {total}</div>
          <h3>Quais pistas sustentam a sua acusação?</h3>
          <p className="muted" style={{ fontSize: 14, marginTop: -6 }}>Escolha as evidências que provam o que você afirmou.</p>
          <div className="chips">
            {available.map((k) => (
              <button key={k.id} className="chip" aria-pressed={cited.includes(k.id)} onClick={() => toggle(k.id)}>{k.title}</button>
            ))}
          </div>
          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn ghost" onClick={() => setI(i - 1)}>Voltar</button>
            <button className="btn primary" disabled={!cited.length || busy} onClick={send}>{busy ? 'Enviando…' : 'Apresentar acusação'}</button>
          </div>
          {err && <div className="error" style={{ marginTop: 12 }}>{err}</div>}
        </>
      )}
    </div>
  );
}
