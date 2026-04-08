export interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  seed: number;
  created_at: string;
}

export interface Matchup {
  id: string;
  round: number;
  slot: number;
  brand_a_id: string | null;
  brand_b_id: string | null;
  winner_id: string | null;
  voting_open: boolean;
  created_at: string;
  brand_a?: Brand | null;
  brand_b?: Brand | null;
  winner?: Brand | null;
  vote_count_a?: number;
  vote_count_b?: number;
}

export interface BracketState {
  brands: Brand[];
  matchups: Matchup[];
}

export type RoundName = 'First Round' | 'Round of 16' | 'Quarterfinals' | 'Semifinals' | 'Final';

export const ROUND_NAMES: Record<number, RoundName> = {
  1: 'First Round',
  2: 'Round of 16',
  3: 'Quarterfinals',
  4: 'Semifinals',
  5: 'Final',
};
