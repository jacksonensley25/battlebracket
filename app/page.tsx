import { createServiceClient } from '@/lib/supabase';
import BracketView from '@/components/BracketView';
import { Matchup, Brand } from '@/types';

export const revalidate = 30;

async function getBracket(): Promise<Matchup[]> {
  const supabase = createServiceClient();

  const [brandsRes, matchupsRes] = await Promise.all([
    supabase.from('brands').select('*').order('seed'),
    supabase.from('matchups').select('*').order('round').order('slot'),
  ]);

  const brands: Brand[] = brandsRes.data ?? [];
  const rawMatchups = matchupsRes.data ?? [];

  const matchups: Matchup[] = await Promise.all(
    rawMatchups.map(async (m) => {
      const { data: votes } = await supabase
        .from('votes')
        .select('brand_id')
        .eq('matchup_id', m.id);

      return {
        ...m,
        brand_a: brands.find((b) => b.id === m.brand_a_id) ?? null,
        brand_b: brands.find((b) => b.id === m.brand_b_id) ?? null,
        winner: brands.find((b) => b.id === m.winner_id) ?? null,
        vote_count_a: votes?.filter((v) => v.brand_id === m.brand_a_id).length ?? 0,
        vote_count_b: votes?.filter((v) => v.brand_id === m.brand_b_id).length ?? 0,
      };
    })
  );

  return matchups;
}

export default async function Home() {
  let matchups: Matchup[] = [];
  let error = false;

  try {
    matchups = await getBracket();
  } catch {
    error = true;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-surface px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-foreground tracking-tight">OUTDOOR JACKSON</h1>
            <p className="text-accent text-xs font-bold uppercase tracking-widest">
              Brand Battle Bracket
            </p>
          </div>
          <div className="text-right text-xs text-muted">
            <p>Also vote on</p>
            <p className="font-semibold text-foreground">@outdoorjackson</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {error ? (
          <div className="text-center py-20 text-muted">
            <p className="text-lg font-semibold">Failed to load bracket.</p>
            <p className="text-sm mt-1">Please refresh the page.</p>
          </div>
        ) : matchups.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-2xl font-black text-foreground mb-2">Coming Soon</p>
            <p className="text-muted">The Brand Battle bracket is being set up. Check back soon!</p>
          </div>
        ) : (
          <BracketView initialMatchups={matchups} />
        )}
      </main>

      <footer className="border-t border-border px-4 py-4 text-center text-xs text-muted">
        <p>One vote per matchup · Voting also open on Instagram Stories</p>
        <p className="mt-0.5">© Outdoor Jackson</p>
      </footer>
    </div>
  );
}
