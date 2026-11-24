import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Home } from '../src/components/Home';
import { Game } from '../src/components/Game';
import { Subscribe } from '../src/components/Subscribe';
import { DEMO_CASE } from '../src/lib/demo-case';
import { publicView, checkEasyStage, checkLink, confront, judgeAccusation } from '../src/lib/case-logic';
import type { Difficulty } from '../src/lib/types';

// Prévia estática: as rotas /api do servidor rodam aqui no navegador, só com o caso de demonstração.
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } });
const realFetch = window.fetch.bind(window);
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(String(input), 'http://x');
  const p = url.pathname;
  if (!p.startsWith('/api/')) return realFetch(input, init);
  if (p === '/api/account') return json({ signedIn: false, subscribed: false, canGenerate: false, used: 0, limit: 30, priceCents: 2990, billing: false, dev: false, email: null });
  if (p === '/api/cases/demo') return json(publicView(DEMO_CASE, url.searchParams.get('d') as Difficulty));
  if (p === '/api/cases/demo/action') {
    const b = JSON.parse(String(init?.body ?? '{}'));
    if (b.type === 'stage') return json(checkEasyStage(DEMO_CASE, b.stageId, b.optionId));
    if (b.type === 'link') return json(checkLink(DEMO_CASE, b.a, b.b, b.claimId, b.available));
    if (b.type === 'confront') return json(confront(DEMO_CASE, b.characterId, b.clueId));
    if (b.type === 'accuse') return json(judgeAccusation(DEMO_CASE, b.d, { answers: b.answers, citedClueIds: b.citedClueIds, timelineOrder: b.timelineOrder }));
  }
  return json({ error: 'Indisponível na prévia. Casos novos funcionam no site publicado.' }, 503);
};

function App() {
  const [h, setH] = useState(location.hash.slice(1) || '/');
  useEffect(() => { const f = () => { setH(location.hash.slice(1) || '/'); scrollTo(0, 0); }; addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  const path = h.split('?')[0];
  const m = path.match(/^\/caso\/([^/]+)\/(facil|medio|dificil|extreme)$/);
  if (m) return <Game key={path} id={m[1]} d={m[2] as Difficulty} />;
  if (path === '/assinar') return <Subscribe />;
  return <Home />;
}
createRoot(document.getElementById('root')!).render(<App />);
