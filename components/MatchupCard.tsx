'use client';

import { useState, useEffect } from 'react';
import { Matchup } from '@/types';
import BrandCard from './BrandCard';

// Fixed card height: 2 brand rows (43px each) + 2 dividers (1px each) + button row (40px) = 128px
// The button row is always rendered (for stable height in bracket layout) but hidden when not voting.
export const CARD_H = 128;

interface MatchupCardProps {
  matchup: Matchup;
  onVoteSuccess?: (matchupId: string, voteCountA: number, voteCountB: number) => void;
}

export default function MatchupCard({ matchup, onVoteSuccess }: MatchupCardProps) {
  const [votedBrandId, setVotedBrandId] = useState<string | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [localCountA, setLocalCountA] = useState(matchup.vote_count_a ?? 0);
  const [localCountB, setLocalCountB] = useState(matchup.vote_count_b ?? 0);

  useEffect(() => {
    const raw = localStorage.getItem(`voted_matchup_${matchup.id}`);
    if (!raw) return;
    try {
      const { brandId, timestamp } = JSON.parse(raw);
      // Invalidate if votes were reset after this vote was cast
      if (matchup.votes_reset_at && new Date(timestamp) < new Date(matchup.votes_reset_at)) {
        localStorage.removeItem(`voted_matchup_${matchup.id}`);
        return;
      }
      setVotedBrandId(brandId);
    } catch {
      // Legacy plain string format — treat as valid (no reset timestamp to compare)
      setVotedBrandId(raw);
    }
  }, [matchup.id, matchup.votes_reset_at]);

  useEffect(() => {
    setLocalCountA(matchup.vote_count_a ?? 0);
    setLocalCountB(matchup.vote_count_b ?? 0);
  }, [matchup.vote_count_a, matchup.vote_count_b]);

  const showVoting = matchup.voting_open && !votedBrandId;

  const handleSubmit = async () => {
    if (!selectedBrandId || submitting) return;
    setSubmitting(true);

    const isVotingForA = selectedBrandId === matchup.brand_a_id;
    console.log('[vote] submitting', {
      selectedBrandId,
      brand_a_id: matchup.brand_a_id,
      brand_b_id: matchup.brand_b_id,
      brand_a_name: matchup.brand_a?.name,
      brand_b_name: matchup.brand_b?.name,
      votingFor: isVotingForA ? matchup.brand_a?.name : matchup.brand_b?.name,
    });

    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchupId: matchup.id, brandId: selectedBrandId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) {
          localStorage.setItem(`voted_matchup_${matchup.id}`, JSON.stringify({ brandId: selectedBrandId, timestamp: new Date().toISOString() }));
          setVotedBrandId(selectedBrandId);
        } else {
          alert(data.error ?? 'Failed to vote. Please try again.');
        }
        return;
      }
      localStorage.setItem(`voted_matchup_${matchup.id}`, JSON.stringify({ brandId: selectedBrandId, timestamp: new Date().toISOString() }));
      setVotedBrandId(selectedBrandId);
      setLocalCountA(data.voteCountA);
      setLocalCountB(data.voteCountB);
      onVoteSuccess?.(matchup.id, data.voteCountA, data.voteCountB);
    } finally {
      setSubmitting(false);
    }
  };

  const isTBD = !matchup.brand_a && !matchup.brand_b;
  const totalVotes = localCountA + localCountB;
  const selectedBrand =
    selectedBrandId === matchup.brand_a_id
      ? matchup.brand_a
      : selectedBrandId === matchup.brand_b_id
      ? matchup.brand_b
      : null;

  if (isTBD) {
    return (
      <div
        className="rounded-lg border border-dashed border-border bg-surface/40 flex items-center justify-center"
        style={{ height: CARD_H }}
      >
        <span className="text-muted text-xs font-semibold">TBD</span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border bg-surface overflow-hidden flex flex-col
        ${matchup.voting_open && !votedBrandId ? 'border-accent/40' : 'border-border'}
      `}
      style={{ height: CARD_H }}
    >
      {/* Brand A */}
      <BrandCard
        brand={matchup.brand_a ?? null}
        voteCount={localCountA}
        totalVotes={totalVotes}
        isWinner={matchup.winner_id === matchup.brand_a_id}
        isLoser={!!matchup.winner_id && matchup.winner_id !== matchup.brand_a_id}
        hasVoted={!!votedBrandId}
        isChosen={votedBrandId === matchup.brand_a_id}
        isSelected={selectedBrandId === matchup.brand_a_id}
        onSelect={showVoting && matchup.brand_a ? () => setSelectedBrandId(matchup.brand_a_id!) : undefined}
      />

      <div className="border-t border-border flex-shrink-0" />

      {/* Brand B */}
      <BrandCard
        brand={matchup.brand_b ?? null}
        voteCount={localCountB}
        totalVotes={totalVotes}
        isWinner={matchup.winner_id === matchup.brand_b_id}
        isLoser={!!matchup.winner_id && matchup.winner_id !== matchup.brand_b_id}
        hasVoted={!!votedBrandId}
        isChosen={votedBrandId === matchup.brand_b_id}
        isSelected={selectedBrandId === matchup.brand_b_id}
        onSelect={showVoting && matchup.brand_b ? () => setSelectedBrandId(matchup.brand_b_id!) : undefined}
      />

      {/* Submit row — always rendered for fixed height, hidden when not in voting mode */}
      <div className="border-t border-border flex-shrink-0" style={{ visibility: showVoting ? 'visible' : 'hidden' }}>
        <div className="h-[40px] flex items-center px-3">
          <button
            onClick={handleSubmit}
            disabled={!selectedBrandId || submitting}
            className="w-full h-7 text-xs font-bold bg-accent hover:bg-accent-hover text-white rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting
            ? 'Submitting…'
            : selectedBrand
            ? `Vote for ${selectedBrand.name}`
            : 'Select a brand above'}
          </button>
        </div>
      </div>
    </div>
  );
}
