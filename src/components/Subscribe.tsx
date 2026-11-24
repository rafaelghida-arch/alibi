'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { authFetch, brl, supabaseBrowser } from '@/lib/client';

interface Account { signedIn: boolean; subscribed: boolean; used: number; limit: number; priceCents: number; email: string | null; billing: boolean; periodEnd: string | null }

export function Subscribe() {
  const params = useSearchParams();
  const status = params.get('status');
  const [acc, setAcc] = useState<Account | null>(null);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const sb = supabaseBrowser();

  const load = () => authFetch('/api/account').then((r) => r.json()).then(setAcc).catch(() => {});
  useEffect(() => {
    load();
    const sub = sb?.auth.onAuthStateChange(() => load());
    return () => sub?.data.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (!sb) return;
    setBusy(true);
    setErr(null);
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/assinar` } });
    setBusy(false);
    if (error) setErr('Não foi possível enviar o link. Confira o e-mail e tente de novo.');
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

  return (
    <>
      <header className="topbar">
        <Link href="/" className="wordmark">ÁLIBI</Link>
        <span className="spacer" />
        {acc?.signedIn && <button className="linkbtn" onClick={() => sb?.auth.signOut()}>Sair</button>}
      </header>
      <main className="page">
        <div className="mono" style={{ color: 'var(--amber)', fontSize: 12, letterSpacing: '.16em' }}>ASSINATURA</div>
        <h1>Um caso novo, sempre que você quiser.</h1>
        <p className="muted">Cada investigação é escrita na hora: personagens, documentos, gravações e uma lógica diferente a cada vez. O caso de demonstração continua grátis.</p>
        {status === 'ok' && <div className="notice" style={{ margin: '18px 0' }}>Pagamento recebido. Sua assinatura é ativada assim que o Stripe confirmar — normalmente em segundos.</div>}
        {status === 'cancelado' && <div className="notice" style={{ margin: '18px 0' }}>Checkout cancelado. Nada foi cobrado.</div>}
        <div className="pitch">
          <div className="price">{acc ? brl(acc.priceCents) : '—'} <small>/ mês</small></div>
          <ul className="features">
            <li>Até {acc?.limit ?? '—'} casos novos por mês de assinatura</li>
            <li>Fácil, Médio, Difícil e Extreme</li>
            <li>Progresso salvo no seu navegador</li>
            <li>Cancele quando quiser no portal de assinatura</li>
          </ul>
          {!acc ? null : !acc.billing || !sb ? (
            <div className="notice">Assinaturas ainda não estão disponíveis neste servidor. Jogue o caso de demonstração enquanto isso.</div>
          ) : acc.subscribed ? (
            <>
              <p>Assinatura ativa{acc.email ? ` para ${acc.email}` : ''}. Você usou {acc.used} de {acc.limit} casos neste período.</p>
              <div className="row">
                <Link className="btn primary" href="/?abrir=1">Abrir um caso</Link>
                <button className="btn" disabled={busy} onClick={() => go('/api/stripe/portal')}>Gerenciar ou cancelar</button>
              </div>
            </>
          ) : acc.signedIn ? (
            <div className="row">
              <button className="btn primary big" disabled={busy} onClick={() => go('/api/stripe/checkout')}>Assinar por {brl(acc.priceCents)}/mês</button>
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
      </main>
    </>
  );
}
