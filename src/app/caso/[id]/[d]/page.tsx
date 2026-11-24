import { notFound } from 'next/navigation';
import { Game } from '@/components/Game';
import { DIFFICULTIES, type Difficulty } from '@/lib/types';

export default async function CasePage({ params }: { params: Promise<{ id: string; d: string }> }) {
  const { id, d } = await params;
  if (!DIFFICULTIES.includes(d as Difficulty)) notFound();
  return <Game id={id} d={d as Difficulty} />;
}
