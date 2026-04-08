import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createServiceClient } from '@/lib/supabase';
import { isAdminAuthenticated } from '@/lib/admin';

export async function POST(req: NextRequest) {
  if (!isAdminAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { round, open } = await req.json();
  if (round === undefined || open === undefined) {
    return NextResponse.json({ error: 'Missing round or open' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { error } = await supabase
    .from('matchups')
    .update({ voting_open: open })
    .eq('round', round);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
