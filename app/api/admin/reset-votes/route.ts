import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createServiceClient } from '@/lib/supabase';
import { isAdminAuthenticated } from '@/lib/admin';

export async function POST(req: NextRequest) {
  if (!isAdminAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { matchupId } = await req.json();
  if (!matchupId) {
    return NextResponse.json({ error: 'Missing matchupId' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const [votesRes, fpRes] = await Promise.all([
    supabase.from('votes').delete().eq('matchup_id', matchupId),
    supabase.from('vote_fingerprints').delete().eq('matchup_id', matchupId),
  ]);

  if (votesRes.error || fpRes.error) {
    return NextResponse.json({ error: 'Failed to reset votes' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
