import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
import { createServiceClient } from '@/lib/supabase';
import { isAdminAuthenticated } from '@/lib/admin';

// Recursively clear a brand from all future rounds after a reset
async function cascadeClear(
  supabase: SupabaseClient,
  brandId: string,
  fromRound: number,
  fromSlot: number
) {
  const nextRound = fromRound + 1;
  if (nextRound > 5) return;

  // Determine where this brand was placed in the next round
  let nextSlot: number;
  let field: 'brand_a_id' | 'brand_b_id';

  if (fromRound === 1) {
    // R1 → R2: 1:1, winner goes to brand_b of same slot
    nextSlot = fromSlot;
    field = 'brand_b_id';
  } else {
    // R2+ → pairs collapse: slots 1&2 → slot 1, etc.
    nextSlot = Math.ceil(fromSlot / 2);
    field = fromSlot % 2 !== 0 ? 'brand_a_id' : 'brand_b_id';
  }

  const { data: nextMatchup } = await supabase
    .from('matchups')
    .select('*')
    .eq('round', nextRound)
    .eq('slot', nextSlot)
    .maybeSingle();

  if (!nextMatchup || nextMatchup[field] !== brandId) return;

  const nextWinnerId = nextMatchup.winner_id;

  // Clear the brand reference and winner from the next matchup
  await supabase
    .from('matchups')
    .update({ [field]: null, winner_id: null })
    .eq('id', nextMatchup.id);

  // Clear votes and fingerprints for the next matchup too
  await Promise.all([
    supabase.from('votes').delete().eq('matchup_id', nextMatchup.id),
    supabase.from('vote_fingerprints').delete().eq('matchup_id', nextMatchup.id),
  ]);

  // If the next matchup also had a winner, keep cascading
  if (nextWinnerId) {
    await cascadeClear(supabase, nextWinnerId, nextRound, nextSlot);
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { matchupId } = await req.json();
  if (!matchupId) {
    return NextResponse.json({ error: 'Missing matchupId' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: matchup, error: matchupError } = await supabase
    .from('matchups')
    .select('*')
    .eq('id', matchupId)
    .single();

  if (matchupError || !matchup) {
    return NextResponse.json({ error: 'Matchup not found' }, { status: 404 });
  }

  const winnerId = matchup.winner_id;

  // Clear votes, fingerprints, and winner for this matchup
  const [votesRes, fpRes, matchupRes] = await Promise.all([
    supabase.from('votes').delete().eq('matchup_id', matchupId),
    supabase.from('vote_fingerprints').delete().eq('matchup_id', matchupId),
    supabase.from('matchups').update({ winner_id: null }).eq('id', matchupId),
  ]);

  if (votesRes.error || fpRes.error || matchupRes.error) {
    return NextResponse.json({ error: 'Failed to reset votes' }, { status: 500 });
  }

  // Cascade: remove winner from all future rounds
  if (winnerId) {
    await cascadeClear(supabase, winnerId, matchup.round, matchup.slot);
  }

  return NextResponse.json({ success: true });
}
