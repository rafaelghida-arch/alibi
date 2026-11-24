import { useEffect, useState } from 'react';
const query = () => new URLSearchParams((location.hash.split('?')[1] ?? ''));
export function useRouter() { return { push: (p: string) => { location.hash = p; } }; }
export function useSearchParams() {
  const [q, setQ] = useState(query);
  useEffect(() => { const h = () => setQ(query()); addEventListener('hashchange', h); return () => removeEventListener('hashchange', h); }, []);
  return q;
}
export function notFound(): never { throw new Error('404'); }
