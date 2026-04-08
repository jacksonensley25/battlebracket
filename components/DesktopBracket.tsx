'use client';

import { Matchup, ROUND_NAMES } from '@/types';
import MatchupCard, { CARD_H } from './MatchupCard';

// Layout constants
const UNIT = 152;       // px per bracket slot unit — must be > CARD_H to avoid overlap
const CARD_W = 220;     // px, card column width
const CONN_W = 56;      // px, connector SVG width between columns
const TOTAL_H = 8 * UNIT;
const LABEL_H = 28;     // px for round label above bracket

// Each round's slot count and how many units each slot spans
const ROUNDS_CFG = [
  { round: 1, slots: 8, unitsPerSlot: 1 },
  { round: 2, slots: 8, unitsPerSlot: 1 },
  { round: 3, slots: 4, unitsPerSlot: 2 },
  { round: 4, slots: 2, unitsPerSlot: 4 },
  { round: 5, slots: 1, unitsPerSlot: 8 },
] as const;

/** Vertical center (px) of a matchup card, relative to bracket top */
function cardCenterY(round: number, slot: number): number {
  const cfg = ROUNDS_CFG.find((c) => c.round === round)!;
  return ((slot - 1) * cfg.unitsPerSlot + cfg.unitsPerSlot / 2) * UNIT;
}

/** Top offset (px) for a card so it's centered at cardCenterY */
function cardTop(round: number, slot: number): number {
  return cardCenterY(round, slot) - CARD_H / 2;
}

interface ConnectorProps {
  fromRound: number;
  toRound: number;
}

function BracketConnector({ fromRound, toRound }: ConnectorProps) {
  const MIDX = CONN_W / 2;
  const strokeProps = { stroke: '#3a3a3a', strokeWidth: 1.5, fill: 'none' };

  if (fromRound === 1) {
    // R1 → R2 is a 1:1 passthrough — straight horizontal lines
    return (
      <svg
        width={CONN_W}
        height={TOTAL_H + LABEL_H}
        style={{ flexShrink: 0, marginTop: 0 }}
      >
        <g transform={`translate(0, ${LABEL_H})`}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((slot) => {
            const y = cardCenterY(1, slot);
            return (
              <line key={slot} x1={0} y1={y} x2={CONN_W} y2={y} {...strokeProps} />
            );
          })}
        </g>
      </svg>
    );
  }

  // R2→R3, R3→R4, R4→R5: pairs of slots converge into one
  const toCfg = ROUNDS_CFG.find((c) => c.round === toRound)!;

  return (
    <svg
      width={CONN_W}
      height={TOTAL_H + LABEL_H}
      style={{ flexShrink: 0 }}
    >
      <g transform={`translate(0, ${LABEL_H})`}>
        {Array.from({ length: toCfg.slots }, (_, i) => {
          const s1 = i * 2 + 1;
          const s2 = i * 2 + 2;
          const t = i + 1;
          const y1 = cardCenterY(fromRound, s1);
          const y2 = cardCenterY(fromRound, s2);
          const yt = cardCenterY(toRound, t);
          return (
            <g key={i}>
              {/* Horizontal from s1 card right edge to midpoint */}
              <line x1={0} y1={y1} x2={MIDX} y2={y1} {...strokeProps} />
              {/* Horizontal from s2 card right edge to midpoint */}
              <line x1={0} y1={y2} x2={MIDX} y2={y2} {...strokeProps} />
              {/* Vertical connecting s1 and s2 */}
              <line x1={MIDX} y1={y1} x2={MIDX} y2={y2} {...strokeProps} />
              {/* Horizontal from midpoint to target card */}
              <line x1={MIDX} y1={yt} x2={CONN_W} y2={yt} {...strokeProps} />
            </g>
          );
        })}
      </g>
    </svg>
  );
}

interface RoundColumnProps {
  round: number;
  matchups: Matchup[];
  onVoteSuccess: (matchupId: string, countA: number, countB: number) => void;
}

function RoundColumn({ round, matchups, onVoteSuccess }: RoundColumnProps) {
  const roundMatchups = matchups
    .filter((m) => m.round === round)
    .sort((a, b) => a.slot - b.slot);

  const hasActiveVoting = roundMatchups.some((m) => m.voting_open);

  return (
    <div style={{ width: CARD_W, flexShrink: 0 }}>
      {/* Round label */}
      <div
        style={{ height: LABEL_H }}
        className="flex items-center justify-center gap-1.5"
      >
        <span className="text-xs font-black uppercase tracking-widest text-muted whitespace-nowrap">
          {ROUND_NAMES[round]}
        </span>
        {hasActiveVoting && (
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
        )}
      </div>

      {/* Cards — absolutely positioned within bracket area */}
      <div style={{ position: 'relative', height: TOTAL_H }}>
        {roundMatchups.map((m) => (
          <div
            key={m.id}
            style={{
              position: 'absolute',
              top: cardTop(round, m.slot),
              left: 0,
              width: CARD_W,
            }}
          >
            <MatchupCard matchup={m} onVoteSuccess={onVoteSuccess} />
          </div>
        ))}
      </div>
    </div>
  );
}

interface DesktopBracketProps {
  matchups: Matchup[];
  onVoteSuccess: (matchupId: string, countA: number, countB: number) => void;
}

export default function DesktopBracket({ matchups, onVoteSuccess }: DesktopBracketProps) {
  const rounds = [1, 2, 3, 4, 5];

  return (
    <div className="overflow-x-auto pb-4">
      <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: 'max-content' }}>
        {rounds.map((round, i) => (
          <>
            <RoundColumn
              key={round}
              round={round}
              matchups={matchups}
              onVoteSuccess={onVoteSuccess}
            />
            {i < rounds.length - 1 && (
              <BracketConnector
                key={`conn-${round}`}
                fromRound={round}
                toRound={round + 1}
              />
            )}
          </>
        ))}
      </div>
    </div>
  );
}
