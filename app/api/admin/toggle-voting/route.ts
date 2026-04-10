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

  const updates = open
    ? {
        voting_open: true,
        voting_ends_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }
    : {
        voting_open: false,
        voting_ends_at: null,
      };

  const { error } = await supabase
    .from('matchups')
    .update(updates)
    .eq('round', round);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
