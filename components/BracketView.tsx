'use client';

import { useState, useCallback } from 'react';
import { Matchup, ROUND_NAMES } from '@/types';
import MatchupCard from './MatchupCard';
import DesktopBracket from './DesktopBracket';
import CountdownTimer from './CountdownTimer';

interface BracketViewProps {
  initialMatchups: Matchup[];
}

export default function BracketView({ initialMatchups }: BracketViewProps) {
  const [matchups, setMatchups] = useState<Matchup[]>(initialMatchups);
  const [activeRound, setActiveRound] = useState<number>(() => {
    const openRound = initialMatchups.find((m) => m.voting_open)?.round;
    return openRound ?? 1;
  });

  const rounds = [1, 2, 3, 4, 5];

  // Find the active round's end time (all matchups in a round share the same voting_ends_at)
  const activeTimer = matchups.find((m) => m.voting_open && m.voting_ends_at) ?? null;

  const handleVoteSuccess = (matchupId: string, voteCountA: number, voteCountB: number) => {
    setMatchups((prev) =>
      prev.map((m) =>
        m.id === matchupId ? { ...m, vote_count_a: voteCountA, vote_count_b: voteCountB } : m
      )
    );
  };

  const handleTimerExpire = useCallback(async () => {
    // Tell the server to close expired rounds
    await fetch('/api/close-expired', { method: 'POST' });

    // Refresh bracket state from server
    const res = await fetch('/api/bracket');
    const data = await res.json();
    if (data.matchups) setMatchups(data.matchups);
  }, []);

  const roundMatchups = (round: number) =>
    matchups.filter((m) => m.round === round).sort((a, b) => a.slot - b.slot);

  return (
    <>
      {/* Countdown timer — shown when a round is active */}
      {activeTimer && (
        <div className="-mx-4 mb-5">
          <CountdownTimer
            endsAt={activeTimer.voting_ends_at!}
            roundName={ROUND_NAMES[activeTimer.round]}
            onExpire={handleTimerExpire}
          />
        </div>
      )}

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
