'use client';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';

let sb: SupabaseClient | null | undefined;
export function supabaseBrowser(): SupabaseClient | null {
  if (sb !== undefined) return sb;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  sb = url && key ? createClient(url, key) : null;
  return sb;
}

export async function authFetch(input: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json');
  const client = supabaseBrowser();
  if (client) {
    const { data } = await client.auth.getSession();
    if (data.session) headers.set('authorization', `Bearer ${data.session.access_token}`);
  }
  return fetch(input, { ...init, headers });
}

export const store = {
  get<T>(key: string): T | null {
    try {
      const v = localStorage.getItem(key);
      return v ? (JSON.parse(v) as T) : null;
    } catch {
      return null;
    }
  },
  set(key: string, v: unknown) {
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {
      /* armazenamento indisponível */
    }
  },
  del(key: string) {
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};

/** State persisted to localStorage. `ready` is false until the saved value is loaded. */
export function useSaved<T>(key: string, initial: () => T) {
  const [state, setState] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  const keyRef = useRef(key);
  useEffect(() => {
    keyRef.current = key;
    const saved = store.get<T>(key);
    if (saved) setState({ ...initial(), ...saved });
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    if (ready) store.set(keyRef.current, state);
  }, [state, ready]);
  const update = useCallback((fn: (s: T) => T) => setState(fn), []);
  return [state, update, ready] as const;
}

export function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    setR(m.matches);
    const h = () => setR(m.matches);
    m.addEventListener('change', h);
    return () => m.removeEventListener('change', h);
  }, []);
  return r;
}

export function useIsNarrow(px = 760) {
  const [n, setN] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(`(max-width: ${px}px)`);
    setN(m.matches);
    const h = () => setN(m.matches);
    m.addEventListener('change', h);
    return () => m.removeEventListener('change', h);
  }, [px]);
  return n;
}

export const brl = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const uid = () => Math.random().toString(36).slice(2, 10);

export interface SavedIndexItem {
  id: string;
  d: string;
  title: string;
  number: string;
  isDemo: boolean;
  updatedAt: number;
  finished: boolean;
}
export const INDEX_KEY = 'alibi:index';
export function touchIndex(item: SavedIndexItem) {
  const list = (store.get<SavedIndexItem[]>(INDEX_KEY) ?? []).filter((x) => !(x.id === item.id && x.d === item.d));
  store.set(INDEX_KEY, [item, ...list].slice(0, 12));
}
