'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { PublicCase, Verdict } from '@/lib/types';
import type { GameState } from './state';
import { brl, useReducedMotion } from '@/lib/client';
import { BADGES, rankOf } from './fx';

function duration(s: GameState) {
  if (!s.startedAt || !s.finishedAt) return null;
  const m = Math.round((s.finishedAt - s.startedAt) / 60000);
  return m < 1 ? 'menos de 1 min' : `${m} min`;
}

export function Ending({ c, s, verdict, open }: { c: PublicCase; s: GameState; verdict: Verdict; open: (id: string) => void }) {
  const reduced = useReducedMotion();
  const [acc, setAcc] = useState<{ priceCents: number; limit: number; subscribed: boolean } | null>(null);
  useEffect(() => {
    if (c.isDemo) fetch('/api/account').then((r) => r.json()).then(setAcc).catch(() => {});
  }, [c.isDemo]);
  const title = (id: string) => c.clues.find((k) => k.id === id)?.title ?? id;
  const hit = verdict.deductions.filter((d) => d.supported);
  const missed = verdict.deductions.filter((d) => !d.supported);
  const wrongFields = verdict.fields.filter((f) => !f.correct);
  const dur = duration(s);
  const overtime = !!s.expiredAt && (s.finishedAt ?? 0) > s.expiredAt;

  return (
    <main className="ending">
      <section className="verdict">
        <div className="k">CASO Nº {c.number} · ENCERRADO</div>
        <h1 className={verdict.solved ? 'ok' : ''}>{verdict.solved ? 'Caso resolvido.' : verdict.culpritCorrect ? 'Quase.' : 'O culpado escapou.'}</h1>
        <p style={{ fontSize: 18, maxWidth: 620, margin: '0 auto 10px' }}>
          {verdict.solved
            ? `Você identificou ${verdict.culpritName} e sustentou a acusação com provas.`
            : verdict.culpritCorrect
              ? `Você apontou ${verdict.culpritName}, mas faltou a prova que o coloca na cena.`
              : `O responsável era ${verdict.culpritName}.`}
        </p>
        <div className="score">
          {verdict.score} / 100{dur ? ` · ${dur}` : ''}{verdict.timelineAccuracy != null ? ` · cronologia ${Math.round(verdict.timelineAccuracy * 100)}%` : ''}
          {s.limitMin != null && (overtime ? ' · fora do prazo' : ' · dentro do prazo')}
        </div>
        <div className="end-rank">
          <div className="end-xp"><span className="mono">{s.xp}</span> XP · <b>{rankOf(s.xp).name}</b></div>
          <div className="end-badges">
            {BADGES.filter((b) => s.badges.includes(b.id)).map((b, i) => (
              <span key={b.id} className="end-badge" style={{ animationDelay: `${600 + i * 120}ms` }} title={b.desc}><i>{b.icon}</i>{b.name}</span>
            ))}
          </div>
        </div>
      </section>

      <div className="section-title">O que realmente aconteceu</div>
      <ol className="recon">
        {verdict.truth.timeline.map((t, i) => (
          <li key={i} style={{ animationDelay: reduced ? '0ms' : `${200 + i * 380}ms` }}>
            <div className="tm">{t.time}</div>
            <div className="tx">{t.text}</div>
            <div className="minichips">
              {t.clueIds.map((id) => (
                <button key={id} className={`minichip${s.opened.includes(id) ? '' : ' unseen'}`} onClick={() => open(id)} title={s.opened.includes(id) ? 'Você examinou esta pista' : 'Você não examinou esta pista'}>
                  {s.opened.includes(id) ? '✓ ' : ''}{title(id)}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ol>
      <p style={{ fontFamily: 'var(--serif)', fontSize: 17 }}>{verdict.truth.summary}</p>

      <div className="section-title">Onde você acertou</div>
      {verdict.fields.filter((f) => f.correct).map((f) => (
        <div key={f.id} className="resultrow"><span className="ic ok">✓</span><div><b>{f.question}</b><p>{f.correctText}</p></div></div>
      ))}
      {hit.map((d) => (
        <div key={d.id} className="resultrow"><span className="ic ok">✓</span><div><b>{d.statement}</b><p>Você citou as evidências certas.</p></div></div>
      ))}
      {verdict.fields.every((f) => !f.correct) && hit.length === 0 && <p className="muted">Nenhuma conclusão verificável desta vez.</p>}

      {(wrongFields.length > 0 || missed.length > 0) && (
        <>
          <div className="section-title">O que passou despercebido</div>
          {wrongFields.map((f) => (
            <div key={f.id} className="resultrow">
              <span className="ic no">✕</span>
              <div><b>{f.question}</b><p>Você respondeu: {f.chosen}. Correto: {f.correctText}</p><p><b style={{ color: 'var(--text)' }}>Por quê:</b> {f.explanation}</p></div>
            </div>
          ))}
          {missed.map((d) => (
            <div key={d.id} className="resultrow">
              <span className="ic no">!</span>
              <div><b>{d.statement}{d.decisive ? ' (prova decisiva)' : ''}</b><p><b style={{ color: 'var(--text)' }}>Como perceber:</b> {d.missedTip}</p></div>
            </div>
          ))}
        </>
      )}

      <div className="row" style={{ marginTop: 34 }}>
        <Link className="btn primary big" href="/?abrir=1">Investigar outro caso</Link>
      </div>

      {c.isDemo && acc && !acc.subscribed && (
        <section className="pitch">
          <div className="mono" style={{ color: 'var(--amber)', fontSize: 12, letterSpacing: '.16em' }}>ASSINATURA ÁLIBI</div>
          <h2>Um caso novo, sempre que você quiser.</h2>
          <p className="muted">Cada caso é escrito na hora para você, com personagens, documentos e uma lógica diferente — nas quatro dificuldades.</p>
          <div className="price">{brl(acc.priceCents)} <small>/ mês</small></div>
          <ul className="features">
            <li>Até {acc.limit} casos novos por mês</li>
            <li>Fácil, Médio, Difícil e Extreme</li>
            <li>Cancele quando quiser, pelo portal de assinatura</li>
          </ul>
          <Link className="btn primary" href="/assinar">Assinar</Link>
        </section>
      )}
    </main>
  );
}
