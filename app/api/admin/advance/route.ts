import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createServiceClient } from '@/lib/supabase';
import { isAdminAuthenticated } from '@/lib/admin';

export async function POST(req: NextRequest) {
  if (!isAdminAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { matchupId, winnerId } = await req.json();
  if (!matchupId || !winnerId) {
    return NextResponse.json({ error: 'Missing matchupId or winnerId' }, { status: 400 });
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

  // Mark winner and close voting
  const { error: updateError } = await supabase
    .from('matchups')
    .update({ winner_id: winnerId, voting_open: false })
    .eq('id', matchupId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const nextRound = matchup.round + 1;
  if (nextRound <= 5) {
    let nextSlot: number;
    let field: 'brand_a_id' | 'brand_b_id';

    if (matchup.round === 1) {
      // Round 1 → Round 2: 1:1 mapping. Top seed is brand_a (pre-seeded),
      // R1 winner fills brand_b.
      nextSlot = matchup.slot;
      field = 'brand_b_id';
    } else {
      // Round 2+ → standard bracket: pairs of slots collapse into one slot
      // slots 1&2 → slot 1, slots 3&4 → slot 2, etc.
      nextSlot = Math.ceil(matchup.slot / 2);
      field = matchup.slot % 2 !== 0 ? 'brand_a_id' : 'brand_b_id';
    }

    const { data: nextMatchup } = await supabase
      .from('matchups')
      .select('id')
      .eq('round', nextRound)
      .eq('slot', nextSlot)
      .maybeSingle();

    if (nextMatchup) {
      await supabase
        .from('matchups')
        .update({ [field]: winnerId })
        .eq('id', nextMatchup.id);
    }
  }

  return NextResponse.json({ success: true });
}
