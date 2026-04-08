'use client';

import { useState } from 'react';
import { Matchup, ROUND_NAMES } from '@/types';
import MatchupCard from './MatchupCard';
import DesktopBracket from './DesktopBracket';

interface BracketViewProps {
  initialMatchups: Matchup[];
}

export default function BracketView({ initialMatchups }: BracketViewProps) {
  const [matchups, setMatchups] = useState<Matchup[]>(initialMatchups);
  const [activeRound, setActiveRound] = useState<number>(() => {
    const openRound = initialMatchups.find((m) => m.voting_open)?.round;
    if (openRound) return openRound;
    const populated = initialMatchups.filter((m) => m.brand_a_id || m.brand_b_id);
    return populated.length > 0 ? Math.max(...populated.map((m) => m.round)) : 1;
  });

  const rounds = [1, 2, 3, 4, 5];

  const handleVoteSuccess = (matchupId: string, voteCountA: number, voteCountB: number) => {
    setMatchups((prev) =>
      prev.map((m) =>
        m.id === matchupId ? { ...m, vote_count_a: voteCountA, vote_count_b: voteCountB } : m
      )
    );
  };

  const roundMatchups = (round: number) =>
    matchups.filter((m) => m.round === round).sort((a, b) => a.slot - b.slot);

  return (
    <>
      {/* Mobile: round tabs + stacked cards */}
      <div className="md:hidden">
        <div className="flex overflow-x-auto gap-1 mb-5 pb-1">
          {rounds.map((r) => {
            const hasActive = roundMatchups(r).some((m) => m.voting_open);
            return (
              <button
                key={r}
                onClick={() => setActiveRound(r)}
                className={`
                  flex-shrink-0 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap
                  ${activeRound === r ? 'bg-accent text-white' : 'bg-surface text-muted hover:text-foreground border border-border'}
                `}
              >
                {ROUND_NAMES[r]}
                {hasActive && (
                  <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-accent align-middle" />
                )}
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-3">
          {roundMatchups(activeRound).map((matchup) => (
            <MatchupCard key={matchup.id} matchup={matchup} onVoteSuccess={handleVoteSuccess} />
          ))}
        </div>
      </div>

      {/* Desktop: full bracket with connector lines */}
      <div className="hidden md:block">
        <DesktopBracket matchups={matchups} onVoteSuccess={handleVoteSuccess} />
      </div>
    </>
  );
}
