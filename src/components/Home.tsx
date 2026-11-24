'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { DIFFICULTIES, DIFFICULTY_BLURB, DIFFICULTY_LABEL, type Difficulty } from '@/lib/types';
import { authFetch, brl, INDEX_KEY, store, useReducedMotion, type SavedIndexItem } from '@/lib/client';
import { Scene } from './scenes';
import { BADGES, RANKS } from './fx';

interface Account { canGenerate: boolean; subscribed: boolean; used: number; limit: number; priceCents: number; signedIn: boolean; dev: boolean }

const LINES = ['Todo álibi tem um horário.', 'A prova às vezes está no verso.', 'Ninguém mente o tempo todo.', 'Duas testemunhas. Dois momentos diferentes.'];

function Typewriter() {
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);
  const [n, setN] = useState(LINES[0].length);
  const [del, setDel] = useState(false);
  useEffect(() => {
    if (reduced) return;
    const line = LINES[i];
    const t = setTimeout(
      () => {
        if (!del && n < line.length) setN(n + 1);
        else if (!del) setDel(true);
        else if (n > 0) setN(n - 1);
        else {
          setDel(false);
          setI((i + 1) % LINES.length);
        }
      },
      !del && n === line.length ? 2200 : del ? 22 : 55,
    );
    return () => clearTimeout(t);
  }, [i, n, del, reduced]);
  return (
    <p className="typer" aria-label={LINES[0]}>
      <span aria-hidden>{LINES[i].slice(0, n)}</span>
      <i className="caret" aria-hidden />
    </p>
  );
}

function DeskHero() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', String((e.clientX - r.left) / r.width - 0.5));
      el.style.setProperty('--my', String((e.clientY - r.top) / r.height - 0.5));
    };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, [reduced]);
  return (
    <div className="desk" ref={ref} aria-hidden>
      <div className="lamp" />
      <svg className="strings" viewBox="0 0 1000 600" preserveAspectRatio="none">
        <path d="M150 168 C 220 90, 300 70, 360 84" />
        <path d="M360 84 C 600 40, 820 120, 890 264" />
        <path d="M890 264 C 900 360, 850 420, 780 456" />
        <path d="M150 168 C 90 300, 120 420, 210 468" />
      </svg>
      <div className="ev ev-photo" style={{ ['--d' as string]: '1.2', left: '6%', top: '12%' }}>
        <div className="ev-ph"><Scene id="fachada" /></div>
        <span>Cine Aurora · dom 10h05</span>
      </div>
      <div className="ev ev-ticket" style={{ ['--d' as string]: '0.7', left: '27%', top: '6%' }}>
        <b>CINE AURORA</b>
        <span>A Mulher do Farol</span>
        <span>Sáb 23/11 · 21h00</span>
        <em>F12</em>
      </div>
      <div className="ev ev-receipt" style={{ ['--d' as string]: '1.6', left: '78%', top: '18%' }}>
        <b>POSTO AURORA 24H</b>
        <span>24/11 00:38:51</span>
        <span>Café expresso ... 6,50</span>
        <span>VISA ****4471</span>
      </div>
      <div className="ev ev-note" style={{ ['--d' as string]: '1', left: '14%', top: '66%' }}>
        cofre: 2–7–1–9<br />trocar depois!! — H.
      </div>
      <div className="ev ev-photo small" style={{ ['--d' as string]: '1.3', left: '70%', top: '72%' }}>
        <div className="ev-ph"><Scene id="cabine" /></div>
        <span>Cabine · 10h12</span>
      </div>
      <div className="ev ev-log" style={{ ['--d' as string]: '0.9', left: '84%', top: '46%' }}>
        <span>00:49 DESARMADO</span>
        <span className="r">00:52 FALHA DE ENERGIA</span>
        <span>01:36 ARMADO</span>
      </div>
      {[['15%', '28%'], ['36%', '14%'], ['89%', '44%'], ['21%', '78%'], ['78%', '76%']].map(([l, t], i) => (
        <i key={i} className="pin" style={{ left: l, top: t, animationDelay: `${0.6 + i * 0.15}s` }} />
      ))}
      <div className="dust" />
    </div>
  );
}

const MINI: Record<Difficulty, React.ReactNode> = {
  facil: (
    <div className="mini mini-steps"><i /><i /><i /><b>✓</b></div>
  ),
  medio: (
    <div className="mini mini-link"><i /><span /><i /></div>
  ),
  dificil: (
    <div className="mini mini-tl"><i /><i /><i /><i /></div>
  ),
  extreme: (
    <div className="mini mini-board"><i /><i /><i /><i /><svg viewBox="0 0 100 60"><path d="M20 15 L70 20 L35 45 L80 48" /></svg></div>
  ),
};

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
  const openWith = (x?: Difficulty) => { if (x) setD(x); setOpen(true); };

  return (
    <>
      <header className="topbar">
        <Link href="/" className="wordmark">ÁLIBI</Link>
        <span className="spacer" />
        <Link href="/assinar" className="linkbtn">Assinar</Link>
      </header>
      <main>
        <section className="hero2">
          <DeskHero />
          <div className="hero2-in">
            <div className="kicker">Arquivo de casos · <span className="mono">Nº 0417</span> em aberto</div>
            <h1 className="title-reveal" aria-label="ÁLIBI">
              {'ÁLIBI'.split('').map((l, i) => <span key={i} style={{ animationDelay: `${0.15 + i * 0.09}s` }}>{l}</span>)}
            </h1>
            <Typewriter />
            <p className="sub2">Casos fictícios com documentos que você vira, amplia, grifa e compara. Cada descoberta conta pontos. A acusação precisa se sustentar.</p>
            <div className="row" style={{ justifyContent: 'center' }}>
              <button className="btn primary big cta" onClick={() => openWith()}>Abrir um caso</button>
              <a className="btn ghost big" href="#como">Como funciona</a>
            </div>
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
          <div className="scrollcue" aria-hidden><i /></div>
        </section>

        <section className="band" id="como">
          <div className="band-in">
            <div className="eyebrow">Quatro jeitos de investigar</div>
            <h2 className="h2">A dificuldade muda a forma de pensar, não só a quantidade de pistas.</h2>
            <div className="modes">
              {DIFFICULTIES.map((x, i) => (
                <button key={x} className="modecard reveal" onClick={() => openWith(x)}>
                  {MINI[x]}
                  <span className="lvl mono">NÍVEL {i + 1}</span>
                  <b>{DIFFICULTY_LABEL[x]}</b>
                  <span className="muted">{DIFFICULTY_BLURB[x]}</span>
                  <span className="go">Jogar →</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="band teaser">
          <div className="band-in teaser-in">
            <div className="teaser-photo reveal">
              <div className="polaroid"><div className="ph"><Scene id="fachada" /></div><span>Cine Aurora · Centro</span></div>
              <div className="folder-tab mono">CASO Nº 0417</div>
            </div>
            <div className="reveal">
              <div className="eyebrow">Caso de demonstração · grátis</div>
              <h2 className="h2">A sessão que ninguém programou</h2>
              <p className="lede">Conheça Helena Duarte. Ontem, ela ficou até mais tarde para fechar o cinema. Hoje cedo, a primeira sessão começou com um filme que ninguém havia programado — e o cofre estava aberto.</p>
              <ul className="facts">
                <li><b>20</b> pistas</li>
                <li><b>4</b> suspeitos</li>
                <li><b>1</b> gravação</li>
                <li><b>3</b> segredos no verso</li>
              </ul>
              <button className="btn primary big" onClick={() => openWith()}>Investigar agora</button>
            </div>
          </div>
        </section>

        <section className="band">
          <div className="band-in">
            <div className="eyebrow">Cada pista conta</div>
            <h2 className="h2">Suba de patente enquanto investiga.</h2>
            <p className="lede" style={{ maxWidth: 640 }}>Examinar documentos, ampliar detalhes, encontrar o que está escrito no verso e estabelecer fatos rende XP e conquistas. Tudo fica no seu caderno.</p>
            <div className="ranks reveal">
              {RANKS.map((r, i) => (
                <div key={r.name} className="rank" style={{ animationDelay: `${i * 120}ms` }}>
                  <span className="mono">{r.xp} XP</span>
                  <b>{r.name}</b>
                </div>
              ))}
            </div>
            <div className="badgerow reveal">
              {BADGES.slice(0, 6).map((b) => <span key={b.id} className="end-badge"><i>{b.icon}</i>{b.name}</span>)}
            </div>
          </div>
        </section>

        <section className="band final">
          <div className="band-in" style={{ textAlign: 'center' }}>
            <h2 className="h2">Um caso novo sempre que você quiser.</h2>
            <p className="lede" style={{ margin: '0 auto 24px' }}>
              Assinantes geram casos originais, com ilustrações e lógicas diferentes{acc ? `, por ${brl(acc.priceCents)}/mês` : ''}.
            </p>
            <div className="row" style={{ justifyContent: 'center' }}>
              <button className="btn primary big" onClick={() => openWith()}>Abrir um caso</button>
              <Link className="btn ghost big" href="/assinar">Ver assinatura</Link>
            </div>
          </div>
        </section>
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
                  <button className="btn primary" onClick={() => router.push(`/caso/demo/${d}`)} disabled={gen === 'busy'}>Jogar o caso de demonstração</button>
                  {acc?.canGenerate ? (
                    <button className="btn" onClick={() => generate(d)} disabled={gen === 'busy'}>{gen === 'error' ? 'Tentar gerar de novo' : 'Gerar caso novo'}</button>
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
            <div className="folderload" aria-hidden><i /><i /><i /></div>
            <h2 style={{ fontFamily: 'var(--display)', margin: '0 0 6px' }}>Montando o dossiê…</h2>
            <p className="muted" style={{ margin: 0 }}>Escrevendo a verdade do caso, conferindo cada pista e revelando as fotografias. Pode levar até três minutos.</p>
          </div>
        </div>
      )}
    </>
  );
}
