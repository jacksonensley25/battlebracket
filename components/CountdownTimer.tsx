'use client';

import { useState, useEffect, useCallback } from 'react';

interface CountdownTimerProps {
  endsAt: string;
  roundName: string;
  onExpire: () => void;
}

export default function CountdownTimer({ endsAt, roundName, onExpire }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [done, setDone] = useState(false);

  const handleExpire = useCallback(() => {
    setDone(true);
    onExpire();
  }, [onExpire]);

  useEffect(() => {
    const calc = () => Math.max(0, new Date(endsAt).getTime() - Date.now());

    const initial = calc();
    setTimeLeft(initial);
    if (initial === 0) {
      handleExpire();
      return;
    }

    const interval = setInterval(() => {
      const remaining = calc();
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        handleExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endsAt, handleExpire]);

  if (done) return null;

  const totalSeconds = Math.floor(timeLeft / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const isUrgent = timeLeft < 60 * 60 * 1000; // under 1 hour
  const isCritical = timeLeft < 10 * 60 * 1000; // under 10 minutes

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div
      className={`w-full flex items-center justify-center gap-3 py-2.5 px-4 text-sm border-b
        ${isCritical
          ? 'bg-accent/20 border-accent/30'
          : isUrgent
          ? 'bg-accent/10 border-accent/20'
          : 'bg-surface border-border'
        }`}
    >
      <span className="text-muted text-xs font-semibold uppercase tracking-wide">
        {roundName} voting closes in
      </span>
      <span
        className={`font-black tabular-nums text-lg tracking-tight ${
          isCritical ? 'text-accent' : isUrgent ? 'text-accent/80' : 'text-foreground'
        }`}
      >
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
      {isCritical && (
        <span className="text-accent text-xs font-bold animate-pulse">CLOSING SOON</span>
      )}
    </div>
  );
}
