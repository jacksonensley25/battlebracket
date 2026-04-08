import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createServiceClient } from '@/lib/supabase';

export async function GET() {
  const supabase = createServiceClient();

  const [brandsRes, matchupsRes] = await Promise.all([
    supabase.from('brands').select('*').order('seed'),
    supabase.from('matchups').select('*').order('round').order('slot'),
  ]);

  if (brandsRes.error) {
    return NextResponse.json({ error: brandsRes.error.message }, { status: 500 });
  }
  if (matchupsRes.error) {
    return NextResponse.json({ error: matchupsRes.error.message }, { status: 500 });
  }

  // Attach vote counts
  const matchupsWithCounts = await Promise.all(
    (matchupsRes.data ?? []).map(async (matchup) => {
      const { data: votes } = await supabase
        .from('votes')
        .select('brand_id')
        .eq('matchup_id', matchup.id);

      const voteCountA = votes?.filter((v) => v.brand_id === matchup.brand_a_id).length ?? 0;
      const voteCountB = votes?.filter((v) => v.brand_id === matchup.brand_b_id).length ?? 0;

      const brands = brandsRes.data ?? [];
      return {
        ...matchup,
        brand_a: brands.find((b) => b.id === matchup.brand_a_id) ?? null,
        brand_b: brands.find((b) => b.id === matchup.brand_b_id) ?? null,
        winner: brands.find((b) => b.id === matchup.winner_id) ?? null,
        vote_count_a: voteCountA,
        vote_count_b: voteCountB,
      };
    })
  );

  return NextResponse.json({
    brands: brandsRes.data,
    matchups: matchupsWithCounts,
  });
}
