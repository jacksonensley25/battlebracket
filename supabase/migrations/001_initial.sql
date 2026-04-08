-- Brands
create table if not exists brands (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  logo_url    text,
  seed        integer,
  created_at  timestamp with time zone default now()
);

-- Matchups
create table if not exists matchups (
  id            uuid primary key default gen_random_uuid(),
  round         integer not null,  -- 1=R16, 2=QF, 3=SF, 4=Final
  slot          integer not null,  -- position within round (1-8 for R16, 1-4 QF, etc.)
  brand_a_id    uuid references brands(id),
  brand_b_id    uuid references brands(id),
  winner_id     uuid references brands(id),
  voting_open   boolean not null default false,
  created_at    timestamp with time zone default now()
);

-- Votes
create table if not exists votes (
  id            uuid primary key default gen_random_uuid(),
  matchup_id    uuid not null references matchups(id),
  brand_id      uuid not null references brands(id),
  ip_hash       text not null,
  created_at    timestamp with time zone default now()
);

-- Vote fingerprints (duplicate prevention)
create table if not exists vote_fingerprints (
  id            uuid primary key default gen_random_uuid(),
  matchup_id    uuid not null references matchups(id),
  ip_hash       text not null,
  created_at    timestamp with time zone default now(),
  unique (matchup_id, ip_hash)
);

-- Indexes for performance
create index if not exists votes_matchup_id_idx on votes(matchup_id);
create index if not exists votes_brand_id_idx on votes(brand_id);
create index if not exists fp_matchup_ip_idx on vote_fingerprints(matchup_id, ip_hash);
create index if not exists matchups_round_slot_idx on matchups(round, slot);

-- Seed the bracket structure: 8 matchups in R16, 4 in QF, 2 in SF, 1 Final
-- Round 1 (Round of 16) — slots 1-8
insert into matchups (round, slot) values
  (1, 1), (1, 2), (1, 3), (1, 4),
  (1, 5), (1, 6), (1, 7), (1, 8);

-- Round 2 (Quarterfinals) — slots 1-4
insert into matchups (round, slot) values
  (2, 1), (2, 2), (2, 3), (2, 4);

-- Round 3 (Semifinals) — slots 1-2
insert into matchups (round, slot) values
  (3, 1), (3, 2);

-- Round 4 (Final) — slot 1
insert into matchups (round, slot) values
  (4, 1);

-- RLS: enable row-level security and allow public reads
alter table brands enable row level security;
alter table matchups enable row level security;
alter table votes enable row level security;
alter table vote_fingerprints enable row level security;

-- Public read access
create policy "Public read brands" on brands for select using (true);
create policy "Public read matchups" on matchups for select using (true);
create policy "Public read votes" on votes for select using (true);

-- Writes go through service role only (API routes use service role key)
-- No insert/update policies for anon role needed since we use service role in API routes
