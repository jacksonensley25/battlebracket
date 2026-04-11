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
      const [{ count: voteCountA }, { count: voteCountB }] = await Promise.all([
        supabase.from('votes').select('*', { count: 'exact', head: true }).eq('matchup_id', matchup.id).eq('brand_id', matchup.brand_a_id),
        supabase.from('votes').select('*', { count: 'exact', head: true }).eq('matchup_id', matchup.id).eq('brand_id', matchup.brand_b_id),
      ]);

      const brands = brandsRes.data ?? [];
      return {
        ...matchup,
        brand_a: brands.find((b) => b.id === matchup.brand_a_id) ?? null,
        brand_b: brands.find((b) => b.id === matchup.brand_b_id) ?? null,
        winner: brands.find((b) => b.id === matchup.winner_id) ?? null,
        vote_count_a: voteCountA ?? 0,
        vote_count_b: voteCountB ?? 0,
      };
    })
  );

  return NextResponse.json({
    brands: brandsRes.data,
    matchups: matchupsWithCounts,
  });
}
