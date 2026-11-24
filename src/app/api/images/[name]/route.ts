import { readLocalImage } from '@/lib/server';

/** Serves AI images in local development (production uses Supabase Storage). */
export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  const buf = await readLocalImage(name);
  if (!buf) return new Response('não encontrado', { status: 404 });
  return new Response(new Uint8Array(buf), { headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=31536000, immutable' } });
}
