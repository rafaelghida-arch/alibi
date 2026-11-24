import { NextResponse } from 'next/server';
import { supabaseAdmin, userFromRequest } from '@/lib/server';

export async function GET(req: Request) {
  const user = await userFromRequest(req);
  const sb = supabaseAdmin();
  if (!user || !sb) return NextResponse.json([]);
  const { data } = await sb.from('cases').select('id, title, difficulty, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30);
  return NextResponse.json(data ?? []);
}
