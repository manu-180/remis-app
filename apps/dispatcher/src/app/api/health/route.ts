import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    if (error) throw error;

    return NextResponse.json({
      status: 'ok',
      supabase: 'ok',
      ts: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json(
      { status: 'error', supabase: 'unreachable', error: String(e) },
      { status: 503 },
    );
  }
}
