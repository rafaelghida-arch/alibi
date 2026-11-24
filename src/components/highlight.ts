'use client';
import { useEffect } from 'react';

export const HL_COLORS: { id: string; label: string; css: string }[] = [
  { id: 'amarelo', label: 'Amarelo', css: 'rgba(255, 214, 10, .55)' },
  { id: 'rosa', label: 'Rosa', css: 'rgba(255, 105, 150, .45)' },
  { id: 'verde', label: 'Verde', css: 'rgba(80, 220, 140, .45)' },
];

const registry = new Map<string, Map<string, Range[]>>(); // pane -> color -> ranges

function supported() {
  return typeof CSS !== 'undefined' && 'highlights' in CSS && typeof (window as unknown as { Highlight?: unknown }).Highlight === 'function';
}

function rebuild() {
  if (!supported()) return;
  const H = (window as unknown as { Highlight: new (...r: Range[]) => unknown }).Highlight;
  const reg = (CSS as unknown as { highlights: Map<string, unknown> }).highlights;
  for (const c of HL_COLORS) {
    const all: Range[] = [];
    registry.forEach((m) => all.push(...(m.get(c.id) ?? [])));
    reg.set(`hl-${c.id}`, new H(...all));
  }
}

/** Finds `needle` in the visible text of `root` (across text nodes) and returns a Range. */
function findRange(root: HTMLElement, needle: string): Range | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let full = '';
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    nodes.push(n as Text);
    full += n.nodeValue ?? '';
  }
  const norm = (s: string) => s.replace(/\s+/g, ' ');
  // map normalised index -> raw index
  const map: number[] = [];
  let out = '';
  for (let i = 0; i < full.length; i++) {
    const ch = /\s/.test(full[i]) ? ' ' : full[i];
    if (ch === ' ' && out.endsWith(' ')) continue;
    out += ch;
    map.push(i);
  }
  const idx = out.indexOf(norm(needle).trim());
  if (idx < 0) return null;
  const startRaw = map[idx];
  const endRaw = map[idx + norm(needle).trim().length - 1] + 1;
  const range = document.createRange();
  let pos = 0;
  let started = false;
  for (const n of nodes) {
    const len = n.nodeValue?.length ?? 0;
    if (!started && startRaw < pos + len) {
      range.setStart(n, startRaw - pos);
      started = true;
    }
    if (started && endRaw <= pos + len) {
      range.setEnd(n, endRaw - pos);
      return range;
    }
    pos += len;
  }
  return null;
}

export function useHighlights(paneKey: string, root: React.RefObject<HTMLElement | null>, items: { text: string; color: string }[]) {
  const sig = items.map((i) => i.color + ':' + i.text).join('|');
  useEffect(() => {
    const el = root.current;
    if (!el || !supported()) return;
    const apply = () => {
      const m = new Map<string, Range[]>();
      for (const it of items) {
        const r = findRange(el, it.text);
        if (r) m.set(it.color, [...(m.get(it.color) ?? []), r]);
      }
      registry.set(paneKey, m);
      rebuild();
    };
    apply();
    const mo = new MutationObserver(() => apply());
    mo.observe(el, { childList: true, subtree: true, characterData: true });
    return () => {
      mo.disconnect();
      registry.delete(paneKey);
      rebuild();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paneKey, sig]);
}
