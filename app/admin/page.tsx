'use client';

import { useState, useEffect, useCallback } from 'react';
import { Matchup, Brand, ROUND_NAMES } from '@/types';

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [matchups, setMatchups] = useState<Matchup[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchBracket = useCallback(async () => {
    const res = await fetch('/api/bracket');
    const data = await res.json();
    if (data.matchups) setMatchups(data.matchups);
    if (data.brands) setBrands(data.brands);
  }, []);

  useEffect(() => {
    if (authed) fetchBracket();
  }, [authed, fetchBracket]);

  const login = async () => {
    setLoginError('');
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setAuthed(true);
    } else {
      setLoginError('Invalid password');
    }
  };

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const advanceWinner = async (matchupId: string, winnerId: string) => {
    setLoading(true);
    const res = await fetch('/api/admin/advance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchupId, winnerId }),
    });
    if (res.ok) {
      showMessage('Winner advanced!');
      await fetchBracket();
    } else {
      const d = await res.json();
      showMessage(`Error: ${d.error}`);
    }
    setLoading(false);
  };

  const toggleVoting = async (round: number, open: boolean) => {
    setLoading(true);
    const res = await fetch('/api/admin/toggle-voting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ round, open }),
    });
    const data = await res.json();
    if (res.ok) {
      showMessage(`Voting ${open ? 'opened' : 'closed'} for ${ROUND_NAMES[round]}`);
      await fetchBracket();
    } else {
      showMessage(`Error: ${data.error ?? res.status}`);
    }
    setLoading(false);
  };

  const resetVotes = async (matchupId: string) => {
    if (!confirm('Reset all votes for this matchup?')) return;
    setLoading(true);
    const res = await fetch('/api/admin/reset-votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchupId }),
    });
    const data = await res.json();
    if (res.ok) {
      showMessage('Votes reset');
      await fetchBracket();
    } else {
      showMessage(`Error: ${data.error ?? res.status}`);
    }
    setLoading(false);
  };

  const updateBrand = async (id: string, name: string, logo_url: string) => {
    const res = await fetch('/api/admin/brands', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name, logo_url }),
    });
    if (res.ok) {
      showMessage('Brand updated');
      await fetchBracket();
    }
  };

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm bg-surface border border-border rounded-xl p-8">
          <h1 className="text-xl font-black text-foreground mb-1">Admin</h1>
          <p className="text-muted text-sm mb-6">Outdoor Jackson Brand Battle</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && login()}
            placeholder="Password"
            className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-accent"
          />
          {loginError && <p className="text-accent text-sm mb-3">{loginError}</p>}
          <button
            onClick={login}
            className="w-full bg-accent hover:bg-accent-hover text-white font-bold py-2.5 rounded-lg transition-colors"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  const rounds = [1, 2, 3, 4, 5];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black">Admin Panel</h1>
          <p className="text-muted text-xs">Outdoor Jackson Brand Battle</p>
        </div>
        {message && (
          <div className="bg-accent/20 text-accent border border-accent/30 px-4 py-2 rounded-lg text-sm font-semibold">
            {message}
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        {/* Voting Controls */}
        <section>
          <h2 className="text-base font-black uppercase tracking-widest text-muted mb-4">
            Voting Controls
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {rounds.map((r) => {
              const roundMatchups = matchups.filter((m) => m.round === r);
              const allOpen = roundMatchups.every((m) => m.voting_open);
              const allClosed = roundMatchups.every((m) => !m.voting_open);
              return (
                <div key={r} className="bg-surface border border-border rounded-lg p-4">
                  <p className="text-xs font-bold text-muted mb-3 uppercase tracking-wide">
                    {ROUND_NAMES[r]}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleVoting(r, true)}
                      disabled={loading || allOpen}
                      className="flex-1 py-1.5 text-xs font-bold bg-accent hover:bg-accent-hover text-white rounded disabled:opacity-40 transition-colors"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => toggleVoting(r, false)}
                      disabled={loading || allClosed}
                      className="flex-1 py-1.5 text-xs font-bold bg-border hover:bg-[#444] text-foreground rounded disabled:opacity-40 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Matchup Management */}
        <section>
          <h2 className="text-base font-black uppercase tracking-widest text-muted mb-4">
            Matchups
          </h2>
          {rounds.map((r) => {
            const roundMatchups = matchups
              .filter((m) => m.round === r)
              .sort((a, b) => a.slot - b.slot);
            if (roundMatchups.length === 0) return null;
            return (
              <div key={r} className="mb-6">
                <h3 className="text-sm font-bold text-foreground mb-3">{ROUND_NAMES[r]}</h3>
                <div className="space-y-3">
                  {roundMatchups.map((m) => {
                    const totalVotes = (m.vote_count_a ?? 0) + (m.vote_count_b ?? 0);
                    return (
                      <div
                        key={m.id}
                        className="bg-surface border border-border rounded-lg p-4 flex flex-wrap items-center gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold">
                              {m.brand_a?.name ?? 'TBD'} vs {m.brand_b?.name ?? 'TBD'}
                            </span>
                            {m.winner_id && (
                              <span className="text-xs text-accent font-bold">
                                Winner: {m.winner?.name}
                              </span>
                            )}
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                m.voting_open
                                  ? 'bg-accent/20 text-accent'
                                  : 'bg-border text-muted'
                              }`}
                            >
                              {m.voting_open ? 'Voting Open' : 'Closed'}
                            </span>
                          </div>
                          <p className="text-xs text-muted mt-1">
                            {m.brand_a?.name ?? 'TBD'}: {m.vote_count_a ?? 0} votes ·{' '}
                            {m.brand_b?.name ?? 'TBD'}: {m.vote_count_b ?? 0} votes · Total:{' '}
                            {totalVotes}
                          </p>
                        </div>

                        <div className="flex gap-2 flex-wrap">
                          {!m.winner_id && m.brand_a && (
                            <button
                              onClick={() => advanceWinner(m.id, m.brand_a_id!)}
                              disabled={loading}
                              className="text-xs px-3 py-1.5 bg-accent hover:bg-accent-hover text-white font-bold rounded disabled:opacity-40 transition-colors"
                            >
                              {m.brand_a.name} wins
                            </button>
                          )}
                          {!m.winner_id && m.brand_b && (
                            <button
                              onClick={() => advanceWinner(m.id, m.brand_b_id!)}
                              disabled={loading}
                              className="text-xs px-3 py-1.5 bg-accent hover:bg-accent-hover text-white font-bold rounded disabled:opacity-40 transition-colors"
                            >
                              {m.brand_b.name} wins
                            </button>
                          )}
                          <button
                            onClick={() => resetVotes(m.id)}
                            disabled={loading}
                            className="text-xs px-3 py-1.5 bg-border hover:bg-[#444] text-foreground font-bold rounded disabled:opacity-40 transition-colors"
                          >
                            Reset votes
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>

        {/* Brand Editor */}
        <section>
          <h2 className="text-base font-black uppercase tracking-widest text-muted mb-4">
            Brands
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {brands.map((brand) => (
              <BrandEditor key={brand.id} brand={brand} onSave={updateBrand} />
            ))}
          </div>
          {brands.length === 0 && (
            <p className="text-muted text-sm">
              No brands yet. Add them directly in Supabase or set up the bracket first.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

function BrandEditor({
  brand,
  onSave,
}: {
  brand: Brand;
  onSave: (id: string, name: string, logo_url: string) => void;
}) {
  const [name, setName] = useState(brand.name);
  const [logoUrl, setLogoUrl] = useState(brand.logo_url ?? '');
  const [saved, setSaved] = useState(false);

  const save = () => {
    onSave(brand.id, name, logoUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-surface border border-border rounded-lg p-4 space-y-2">
      <p className="text-xs text-muted font-semibold">Seed #{brand.seed}</p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        placeholder="Brand name"
      />
      <input
        value={logoUrl}
        onChange={(e) => setLogoUrl(e.target.value)}
        className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        placeholder="Logo URL"
      />
      <button
        onClick={save}
        className="w-full py-1.5 text-xs font-bold bg-accent hover:bg-accent-hover text-white rounded transition-colors"
      >
        {saved ? 'Saved!' : 'Save'}
      </button>
    </div>
  );
}
