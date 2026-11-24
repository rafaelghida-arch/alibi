'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DIFFICULTIES, DIFFICULTY_BLURB, DIFFICULTY_LABEL, type Difficulty } from '@/lib/types';
import { authFetch, brl, INDEX_KEY, store, type SavedIndexItem } from '@/lib/client';

interface Account { canGenerate: boolean; subscribed: boolean; used: number; limit: number; priceCents: number; signedIn: boolean; dev: boolean }

export function Home() {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [d, setD] = useState<Difficulty | null>(null);
  const [acc, setAcc] = useState<Account | null>(null);
  const [saved, setSaved] = useState<SavedIndexItem[]>([]);
  const [gen, setGen] = useState<'idle' | 'busy' | 'error'>('idle');
  const [genErr, setGenErr] = useState('');

  useEffect(() => {
    setSaved((store.get<SavedIndexItem[]>(INDEX_KEY) ?? []).filter((x) => !x.finished).slice(0, 3));
    authFetch('/api/account').then((r) => r.json()).then(setAcc).catch(() => {});
    if (params.get('abrir')) setOpen(true);
  }, [params]);

  function playDemo(diff: Difficulty) {
    router.push(`/caso/demo/${diff}`);
  }
  async function generate(diff: Difficulty) {
    setGen('busy');
    setGenErr('');
    try {
      const r = await authFetch('/api/generate', { method: 'POST', body: JSON.stringify({ d: diff }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Falha ao gerar o caso');
      router.push(`/caso/${j.id}/${diff}`);
    } catch (e) {
      setGen('error');
      setGenErr((e as Error).message);
    }
  }

  return (
    <>
      <header className="topbar">
        <Link href="/" className="wordmark">ÁLIBI</Link>
        <span className="spacer" />
        <Link href="/assinar" className="linkbtn">Assinar</Link>
      </header>
      <main className="home">
        <div className="hero">
          <div className="kicker">Arquivo de casos · Nº 0417 em aberto</div>
          <h1>ÁLIBI</h1>
          <p>Casos fictícios, documentos que você pode virar, ampliar e comparar — e uma acusação que precisa se sustentar.</p>
          <button className="btn primary big" onClick={() => setOpen(true)}>Abrir um caso</button>
          {saved.length > 0 && (
            <div className="continue">
              <h2>Continuar investigação</h2>
              {saved.map((s) => (
                <Link key={s.id + s.d} href={`/caso/${s.id}/${s.d}`}>
                  <span><span className="mono muted">Nº {s.number}</span> · {s.title}</span>
                  <span className="muted">{DIFFICULTY_LABEL[s.d as Difficulty]}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      {open && (
        <div className="scrim" onClick={() => gen !== 'busy' && setOpen(false)} onKeyDown={(e) => e.key === 'Escape' && gen !== 'busy' && setOpen(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="dlg-t" onClick={(e) => e.stopPropagation()}>
            <h2 id="dlg-t">Escolha a dificuldade</h2>
            <p className="sub">Cada nível muda a forma de investigar, não só a quantidade de pistas.</p>
            <div className="diffgrid" role="radiogroup">
              {DIFFICULTIES.map((x, i) => (
                <button key={x} role="radio" aria-checked={d === x} aria-pressed={d === x} className="diffcard" onClick={() => setD(x)} autoFocus={i === 0}>
                  <span className="lvl">NÍVEL {i + 1}</span>
                  <b>{DIFFICULTY_LABEL[x]}</b>
                  <span>{DIFFICULTY_BLURB[x]}</span>
                </button>
              ))}
            </div>
            {d && (
              <div style={{ marginTop: 22, animation: 'rise 220ms' }}>
                {gen === 'error' && <div className="error" style={{ marginBottom: 12 }}>{genErr} Seu progresso nos outros casos está preservado.</div>}
                <div className="row">
                  <button className="btn primary" onClick={() => playDemo(d)} disabled={gen === 'busy'}>
                    Jogar o caso de demonstração
                  </button>
                  {acc?.canGenerate ? (
                    <button className="btn" onClick={() => generate(d)} disabled={gen === 'busy'}>
                      {gen === 'error' ? 'Tentar gerar de novo' : 'Gerar caso novo'}
                    </button>
                  ) : (
                    <Link className="btn ghost" href="/assinar">Casos novos com a assinatura{acc ? ` · ${brl(acc.priceCents)}/mês` : ''}</Link>
                  )}
                </div>
                {acc?.canGenerate && !acc.dev && <p className="muted" style={{ fontSize: 13 }}>Você usou {acc.used} de {acc.limit} casos neste período.</p>}
              </div>
            )}
          </div>
        </div>
      )}
      {gen === 'busy' && (
        <div className="loadingscreen" role="status">
          <div>
            <div className="spinner" />
            <h2 style={{ fontFamily: 'var(--display)', margin: '0 0 6px' }}>Montando o dossiê…</h2>
            <p className="muted" style={{ margin: 0 }}>Escrevendo a verdade do caso e conferindo cada pista. Pode levar até dois minutos.</p>
          </div>
        </div>
      )}
    </>
  );
}
