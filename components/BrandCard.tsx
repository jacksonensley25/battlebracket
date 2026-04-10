'use client';

import { Brand } from '@/types';

interface BrandCardProps {
  brand: Brand | null;
  // Result display
  voteCount?: number;
  totalVotes?: number;
  isWinner?: boolean;
  isLoser?: boolean;
  hasVoted?: boolean;
  isChosen?: boolean;
  // Selection mode (pre-submit)
  isSelected?: boolean;
  onSelect?: () => void;
}

export default function BrandCard({
  brand,
  voteCount,
  totalVotes,
  isWinner,
  isLoser,
  hasVoted,
  isChosen,
  isSelected,
  onSelect,
}: BrandCardProps) {
  if (!brand) {
    return (
      <div className="flex items-center px-3 h-[43px]">
        <span className="text-muted text-xs italic">TBD</span>
      </div>
    );
  }

  const showPct = (hasVoted || isWinner || isLoser) && totalVotes && totalVotes > 0;
  const pct = showPct ? Math.round(((voteCount ?? 0) / totalVotes!) * 100) : null;

  return (
    <div
      onClick={onSelect}
      className={`flex items-center justify-between px-3 h-[43px] transition-colors
        ${onSelect ? 'cursor-pointer hover:bg-white/5 active:bg-white/10' : ''}
        ${isSelected ? 'bg-accent/15' : ''}
        ${isWinner ? 'bg-accent/15' : ''}
        ${isLoser ? 'opacity-40' : ''}
      `}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
        {/* Radio indicator in selection mode */}
        {onSelect && (
          <div
            className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 transition-colors
              ${isSelected ? 'border-accent bg-accent' : 'border-muted'}`}
          />
        )}
        {/* Icons in result mode */}
        {!onSelect && isWinner && <span className="text-accent text-xs flex-shrink-0">🏆</span>}
        {!onSelect && isChosen && !isWinner && !isLoser && (
          <span className="text-accent text-xs flex-shrink-0">✓</span>
        )}
        <span className="text-muted text-xs flex-shrink-0 tabular-nums">
          #{brand.seed}
        </span>
        <span
          className={`text-sm font-bold truncate ${
            isWinner ? 'text-accent' : isLoser ? 'text-muted' : 'text-foreground'
          }`}
        >
          {brand.name}
        </span>
      </div>

      {pct !== null && (
        <span className={`text-xs font-semibold tabular-nums ml-2 flex-shrink-0 ${isWinner ? 'text-accent' : 'text-muted'}`}>
          {pct}%
        </span>
      )}
    </div>
  );
}
