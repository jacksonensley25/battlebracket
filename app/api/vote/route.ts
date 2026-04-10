import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createServiceClient } from '@/lib/supabase';
import { getIpHash } from '@/lib/ip';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { matchupId, brandId } = body;

  if (!matchupId || !brandId) {
    return NextResponse.json({ error: 'Missing matchupId or brandId' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Validate matchup exists and voting is open
  const { data: matchup, error: matchupError } = await supabase
    .from('matchups')
    .select('*')
    .eq('id', matchupId)
    .single();

  if (matchupError || !matchup) {
    return NextResponse.json({ error: 'Matchup not found' }, { status: 404 });
  }

  // Check if timer has expired
  if (matchup.voting_ends_at && new Date(matchup.voting_ends_at) < new Date()) {
    await supabase
      .from('matchups')
      .update({ voting_open: false, voting_ends_at: null })
      .eq('id', matchupId);
    return NextResponse.json({ error: 'Voting time has expired' }, { status: 403 });
  }

  if (!matchup.voting_open) {
    return NextResponse.json({ error: 'Voting is closed for this matchup' }, { status: 403 });
  }

  if (brandId !== matchup.brand_a_id && brandId !== matchup.brand_b_id) {
    return NextResponse.json({ error: 'Invalid brand for this matchup' }, { status: 400 });
  }

  const ipHash = getIpHash(req);

  // Check for duplicate vote
  const { data: existing } = await supabase
    .from('vote_fingerprints')
    .select('id')
    .eq('matchup_id', matchupId)
    .eq('ip_hash', ipHash)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "You've already voted in this matchup" }, { status: 429 });
  }

  // Record the vote and fingerprint
  const [voteRes, fpRes] = await Promise.all([
    supabase.from('votes').insert({ matchup_id: matchupId, brand_id: brandId, ip_hash: ipHash }),
    supabase.from('vote_fingerprints').insert({ matchup_id: matchupId, ip_hash: ipHash }),
  ]);

  if (voteRes.error || fpRes.error) {
    return NextResponse.json({ error: 'Failed to record vote' }, { status: 500 });
  }

  // Return updated vote counts
  const { data: votes } = await supabase
    .from('votes')
    .select('brand_id')
    .eq('matchup_id', matchupId);

  const voteCountA = votes?.filter((v) => v.brand_id === matchup.brand_a_id).length ?? 0;
  const voteCountB = votes?.filter((v) => v.brand_id === matchup.brand_b_id).length ?? 0;

  return NextResponse.json({ voteCountA, voteCountB });
}
