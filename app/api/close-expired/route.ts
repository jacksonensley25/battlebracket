import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createServiceClient } from '@/lib/supabase';

export async function POST() {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from('matchups')
    .update({ voting_open: false, voting_ends_at: null })
    .eq('voting_open', true)
    .lt('voting_ends_at', new Date().toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
