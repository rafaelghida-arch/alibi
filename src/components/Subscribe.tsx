'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { authFetch, brl, supabaseBrowser, useReducedMotion } from '@/lib/client';
import { DIFFICULTY_LABEL, type Difficulty } from '@/lib/types';
import { sound } from './fx';

interface Account {
  signedIn: boolean; subscribed: boolean; status: string | null; used: number; limit: number; priceCents: number;
  email: string | null; billing: boolean; periodEnd: string | null; cancelAtPeriodEnd: boolean;
}
interface MyCase { id: string; title: string; difficulty: Difficulty; created_at: string }

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—');

function Welcome({ onClose }: { onClose: () => void }) {
  const reduced = useReducedMotion();
  const title = 'BEM-VINDO AO ÁLIBI!';
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    sound('stamp');
    const t = setTimeout(() => sound('badge'), 900);
    btn.current?.focus();
    return () => clearTimeout(t);
  }, []);
  const bits = Array.from({ length: 60 }, (_, i) => ({
    l: (i * 37) % 100, d: (i % 12) * 0.12, r: (i * 53) % 360, dur: 2.6 + (i % 5) * 0.4,
    c: ['#f2a93b', '#f3eee2', '#e5654f', '#c9a56a', '#5b9cf2'][i % 5],
  }));
  return (
    <div className="welcome" role="dialog" aria-modal="true" aria-label={title}>
      {!reduced && bits.map((b, i) => (
        <i key={i} className="wc-bit" style={{ left: `${b.l}%`, background: b.c, animationDelay: `${b.d}s`, animationDuration: `${b.dur}s`, ['--r' as string]: `${b.r}deg` }} />
      ))}
      <div className="wc-in">
        <div className="wc-badge" aria-hidden>
          <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="54" /><circle cx="60" cy="60" r="44" /></svg>
          <span>ASSINANTE</span>
        </div>
        <h1 className="wc-title" aria-label={title}>
          {title.split('').map((ch, i) => (
            <span key={i} style={{ animationDelay: `${0.35 + i * 0.045}s` }}>{ch === ' ' ? ' ' : ch}</span>
          ))}
        </h1>
        <p className="wc-sub">Seu distintivo está pronto. A partir de agora, o arquivo inteiro é seu.</p>
        <ul className="wc-perks">
          <li style={{ animationDelay: '1.3s' }}><b>Casos novos</b> escritos na hora, com documentos, gravações e depoimentos</li>
          <li style={{ animationDelay: '1.45s' }}><b>Quatro dificuldades</b>, cada uma com uma lógica de mistério diferente</li>
          <li style={{ animationDelay: '1.6s' }}><b>Seus casos</b> ficam salvos para jogar quando quiser</li>
        </ul>
        <div className="row" style={{ justifyContent: 'center', animation: 'rise 500ms 1.8s both' }}>
          <Link ref={btn as unknown as React.Ref<HTMLAnchorElement>} className="btn primary big" href="/?abrir=1">Gerar meu primeiro caso</Link>
          <button className="btn ghost big" onClick={onClose}>Ver minha assinatura</button>
        </div>
      </div>
    </div>
  );
}

export function Subscribe() {
  const params = useSearchParams();
  const status = params.get('status');
  const sessionId = params.get('session_id');
  const [acc, setAcc] = useState<Account | null>(null);
  const [cases, setCases] = useState<MyCase[]>([]);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [welcome, setWelcome] = useState(false);
  const [askCancel, setAskCancel] = useState(false);
  const sb = supabaseBrowser();

  const load = async () => {
    const a = await authFetch('/api/account').then((r) => r.json()).catch(() => null);
    if (a) setAcc(a);
    if (a?.signedIn) authFetch('/api/my-cases').then((r) => r.json()).then(setCases).catch(() => {});
    return a as Account | null;
  };

  useEffect(() => {
    load();
    const sub = sb?.auth.onAuthStateChange(() => load());
    return () => sub?.data.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Volta do checkout: confirma o pagamento direto com o Stripe e celebra.
  useEffect(() => {
    if (status !== 'ok' || !sessionId) return;
    let cancelled = false;
    (async () => {
      setConfirming(true);
      for (let i = 0; i < 6 && !cancelled; i++) {
        const r = await authFetch('/api/stripe/confirm', { method: 'POST', body: JSON.stringify({ sessionId }) });
        const j = await r.json().catch(() => ({}));
        if (r.ok && j.subscribed) {
          setAcc((a) => ({ ...(a ?? j), ...j }));
          setWelcome(true);
          window.history.replaceState(null, '', '/assinar');
          break;
        }
        await new Promise((res) => setTimeout(res, 1500));
      }
      if (!cancelled) setConfirming(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, sessionId]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (!sb) return;
    setBusy(true);
    setErr(null);
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/assinar` } });
    setBusy(false);
    if (error) setErr('Não foi possível enviar o link. Confira o e-mail e tente de novo em alguns minutos.');
    else setSent(true);
  }
  async function go(path: string) {
    setBusy(true);
    setErr(null);
    const r = await authFetch(path, { method: 'POST' });
    const j = await r.json();
    if (j.url) window.location.href = j.url;
    else {
      setErr(j.error || 'Algo deu errado.');
      setBusy(false);
    }
  }
  async function cancel(resume: boolean) {
    setBusy(true);
    setErr(null);
    const r = await authFetch('/api/stripe/cancel', { method: 'POST', body: JSON.stringify({ resume }) });
    const j = await r.json();
    if (r.ok) setAcc((a) => ({ ...(a as Account), ...j }));
    else setErr(j.error || 'Não foi possível concluir.');
    setAskCancel(false);
    setBusy(false);
  }

  const pct = acc ? Math.min(1, acc.used / Math.max(1, acc.limit)) : 0;

  return (
    <>
      <header className="topbar">
        <Link href="/" className="wordmark">ÁLIBI</Link>
        <span className="spacer" />
        {acc?.signedIn && <span className="muted" style={{ fontSize: 13 }}>{acc.email}</span>}
        {acc?.signedIn && <button className="linkbtn" onClick={() => sb?.auth.signOut().then(() => load())}>Sair</button>}
      </header>
      <main className="page">
        {confirming && (
          <div className="notice" style={{ marginBottom: 18 }} role="status">
            <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, display: 'inline-block', margin: '0 8px -3px 0' }} />
            Confirmando seu pagamento com o Stripe…
          </div>
        )}
        {status === 'cancelado' && <div className="notice" style={{ margin: '0 0 18px' }}>Checkout cancelado. Nada foi cobrado.</div>}

        {acc?.subscribed ? (
          <>
            <div className="mono" style={{ color: 'var(--amber)', fontSize: 12, letterSpacing: '.16em' }}>SUA ASSINATURA</div>
            <h1>Área do assinante</h1>
            <div className="acct">
              <div className="acct-row">
                <span className={`pill ${acc.cancelAtPeriodEnd ? 'warn' : 'ok'}`}>{acc.cancelAtPeriodEnd ? 'Cancelamento agendado' : 'Ativa'}</span>
                <span className="muted">{acc.cancelAtPeriodEnd ? `Acesso até ${fmtDate(acc.periodEnd)}` : `Renova em ${fmtDate(acc.periodEnd)} · ${brl(acc.priceCents)}/mês`}</span>
              </div>
              <div className="usage">
                <div className="usage-h"><span>Casos gerados neste período</span><b className="mono">{acc.used} / {acc.limit}</b></div>
                <div className="usage-bar"><i style={{ width: `${pct * 100}%` }} /></div>
              </div>
              <div className="row">
                <Link className="btn primary big" href="/?abrir=1">Gerar caso novo</Link>
              </div>
            </div>

            <div className="section-title">Seus casos</div>
            {cases.length === 0 ? (
              <p className="muted">Você ainda não gerou nenhum caso. O primeiro está a um clique.</p>
            ) : (
              <div className="mycases">
                {cases.map((c) => (
                  <Link key={c.id} href={`/caso/${c.id}/${c.difficulty}`} className="mycase">
                    <b>{c.title}</b>
                    <span className="muted">{DIFFICULTY_LABEL[c.difficulty]} · {new Date(c.created_at).toLocaleDateString('pt-BR')}</span>
                  </Link>
                ))}
              </div>
            )}

            <div className="section-title">Gerenciar</div>
            <div className="manage">
              <button className="manage-item" disabled={busy} onClick={() => go('/api/stripe/portal')}>
                <b>Pagamento e recibos</b>
                <span>Trocar o cartão e baixar faturas no portal seguro do Stripe.</span>
              </button>
              {acc.cancelAtPeriodEnd ? (
                <button className="manage-item" disabled={busy} onClick={() => cancel(true)}>
                  <b>Manter minha assinatura</b>
                  <span>Desfaz o cancelamento. Nada muda na cobrança.</span>
                </button>
              ) : askCancel ? (
                <div className="manage-item danger confirm">
                  <b>Cancelar a assinatura?</b>
                  <span>Você continua com acesso até {fmtDate(acc.periodEnd)} e não será cobrado de novo.</span>
                  <div className="row" style={{ marginTop: 10 }}>
                    <button className="btn small" style={{ background: 'var(--red)', color: '#fff' }} disabled={busy} onClick={() => cancel(false)}>Sim, cancelar</button>
                    <button className="btn small ghost" onClick={() => setAskCancel(false)}>Voltar</button>
                  </div>
                </div>
              ) : (
                <button className="manage-item danger" onClick={() => setAskCancel(true)}>
                  <b>Cancelar assinatura</b>
                  <span>Dois cliques, sem ligação nem formulário.</span>
                </button>
              )}
            </div>
            {err && <div className="error" style={{ marginTop: 12 }}>{err}</div>}
          </>
        ) : (
          <>
            <div className="mono" style={{ color: 'var(--amber)', fontSize: 12, letterSpacing: '.16em' }}>ASSINATURA</div>
            <h1>Um caso novo, sempre que você quiser.</h1>
            <p className="muted">Cada investigação é escrita na hora: personagens, documentos, gravações, fotografias e uma lógica diferente a cada vez. O caso de demonstração continua grátis.</p>
            <div className="pitch">
              <div className="price">{acc ? brl(acc.priceCents) : '—'} <small>/ mês</small></div>
              <ul className="features">
                <li>Até {acc?.limit ?? '—'} casos novos por mês de assinatura</li>
                <li>Documentos, gravações e depoimentos em cada caso</li>
                <li>Fácil, Médio, Difícil e Extreme</li>
                <li>Cancele em dois cliques, aqui mesmo</li>
              </ul>
              {!acc ? null : !acc.billing || !sb ? (
                <div className="notice">Assinaturas ainda não estão disponíveis neste servidor. Jogue o caso de demonstração enquanto isso.</div>
              ) : acc.signedIn ? (
                <div className="row">
                  <button className="btn primary big" disabled={busy || confirming} onClick={() => go('/api/stripe/checkout')}>Assinar por {brl(acc.priceCents)}/mês</button>
                  <span className="muted" style={{ fontSize: 13 }}>Conectado como {acc.email}</span>
                </div>
              ) : sent ? (
                <div className="notice">Enviamos um link de acesso para {email}. Abra-o neste navegador para continuar.</div>
              ) : (
                <form onSubmit={login} style={{ display: 'grid', gap: 10 }}>
                  <label htmlFor="email" className="muted" style={{ fontSize: 14 }}>Entre com seu e-mail para assinar</label>
                  <input id="email" className="input" type="email" required placeholder="voce@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <button className="btn primary" disabled={busy}>Receber link de acesso</button>
                </form>
              )}
              {err && <div className="error" style={{ marginTop: 12 }}>{err}</div>}
            </div>
            <p className="muted" style={{ fontSize: 13, marginTop: 20 }}>Pagamento processado pelo Stripe. O limite mensal de casos é informado acima antes da compra.</p>
          </>
        )}
      </main>
      {welcome && <Welcome onClose={() => setWelcome(false)} />}
    </>
  );
}

/** Small account link for top bars. */
export function AccountLink() {
  const [acc, setAcc] = useState<{ signedIn: boolean; subscribed: boolean } | null>(null);
  useEffect(() => {
    authFetch('/api/account').then((r) => r.json()).then(setAcc).catch(() => {});
  }, []);
  return (
    <Link href="/assinar" className={acc?.subscribed ? 'acctlink sub' : 'linkbtn'}>
      {acc?.subscribed ? 'Assinante' : acc?.signedIn ? 'Assinar' : 'Entrar · Assinar'}
    </Link>
  );
}
