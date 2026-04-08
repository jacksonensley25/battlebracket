# Brand Battle Bracket — Project Spec
**For:** Outdoor Jackson (outdoorjackson.com)  
**Deploy target:** Vercel  
**Subdomain:** bracket.outdoorjackson.com  
**Stack:** Next.js 14 (App Router) + Supabase + Vercel

---

## Overview

A public bracket voting website for the Outdoor Jackson "Brand Battle" series. Followers can visit the site, vote on head-to-head brand matchups each round, and track live standings. No accounts or logins required. Voting also happens in parallel on Instagram Stories; the site owner will manually combine both tallies at the end of each round and update the declared winner.

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 14 (App Router) | TypeScript |
| Hosting | Vercel | Free tier |
| Database | Supabase (Postgres) | Free tier |
| Styling | Tailwind CSS | |
| Anti-double-vote | IP rate limiting + browser cookie/localStorage | See detail below |

---

## Core Features

### 1. Bracket Display
- 16-brand single-elimination bracket (4 rounds: Round of 16, Quarterfinals, Semifinals, Final)
- Visual bracket tree showing all matchups, winners advancing, and the champion
- Each brand displayed with:
  - Brand name
  - Brand logo (image URL, stored in config)
  - Vote count for the current round (shown after user has voted, or always — see UX note below)
- Completed matchups show the winner highlighted
- Current active matchup(s) highlighted and voteable
- Future matchups shown as TBD until bracket advances

### 2. Voting
- Each active matchup shows two brand cards with a "Vote" button on each
- One vote allowed per matchup per user (see anti-double-voting section)
- After voting, the vote count for both brands in that matchup is revealed to the voter
- Voting closes when the admin marks a round as complete (see Admin section)
- A user can vote on all active matchups in the current round (there may be multiple simultaneous matchups)

### 3. Live Vote Counts
- Vote totals update in near real-time (poll every 30 seconds, or use Supabase Realtime)
- Show vote counts as both raw numbers and percentages

### 4. Round & Bracket State
- The bracket state (who is in each slot, who has won) is stored in Supabase
- Admin can advance winners to the next round manually via a simple admin panel (see below)
- Bracket state is readable by all visitors, writable only by admin

---

## Anti-Double-Voting (No Accounts)

Use a two-layer approach:

### Layer 1: Server-side IP Rate Limiting
- On each vote submission, record the voter's IP address + matchup ID in a `vote_fingerprints` table
- Before accepting a vote, check if that IP has already voted on that matchup
- If already voted: return a 429 response with a message ("You've already voted in this matchup")
- Implement via Next.js API route / middleware

### Layer 2: Client-side localStorage Token
- On successful vote, write a token to localStorage: `voted_matchup_{matchupId}: true`
- On page load, check localStorage and disable the Vote button for already-voted matchups
- This provides instant UI feedback without a server round-trip
- Fallback: if localStorage is cleared, the server IP check is the backstop

### Notes
- Do not use FingerprintJS (adds complexity and a third-party dependency for marginal gain)
- IP-based limiting is acknowledged as imperfect (VPNs, shared IPs) but appropriate for a creator audience
- Clearly communicate to users that one vote per matchup is enforced

---

## Admin Panel

Simple password-protected admin panel at `/admin` (password stored as an environment variable — no full auth system needed).

Admin can:
- **Advance the bracket**: Select the winner of a completed matchup and advance them to the next round slot
- **Open/close voting**: Toggle voting open or closed for the current round
- **Reset votes**: Clear votes for a specific matchup (in case of a redo)
- **Edit brand info**: Update brand names and logo URLs
- **View vote totals**: See full vote counts for any matchup

Admin authentication: simple password check against `ADMIN_PASSWORD` env var, stored in a cookie on success. Not a full auth system — just enough to prevent casual tampering.

---

## Data Model (Supabase)

### `brands`
```
id          uuid primary key
name        text not null
logo_url    text
seed        integer  -- original seeding (1-16)
created_at  timestamp
```

### `matchups`
```
id            uuid primary key
round         integer  -- 1=R16, 2=QF, 3=SF, 4=Final
slot          integer  -- position within the round (1-8 for R16, etc.)
brand_a_id    uuid references brands
brand_b_id    uuid references brands (nullable — TBD until bracket advances)
winner_id     uuid references brands (nullable until decided)
voting_open   boolean default false
created_at    timestamp
```

### `votes`
```
id            uuid primary key
matchup_id    uuid references matchups
brand_id      uuid references brands  -- which brand was voted for
ip_hash       text  -- SHA-256 hash of voter IP (not raw IP for privacy)
created_at    timestamp
```

### `vote_fingerprints`
```
id            uuid primary key
matchup_id    uuid references matchups
ip_hash       text
created_at    timestamp
unique (matchup_id, ip_hash)
```

---

## API Routes (Next.js)

### `POST /api/vote`
**Body:** `{ matchupId: string, brandId: string }`  
**Logic:**
1. Validate matchup exists and voting is open
2. Hash the requester's IP
3. Check `vote_fingerprints` for duplicate — return 429 if found
4. Insert into `votes` and `vote_fingerprints`
5. Return updated vote counts for both brands in the matchup

### `GET /api/matchups`
Returns all matchups with current vote counts and brand info. Public.

### `GET /api/bracket`
Returns full bracket state including all matchups, brands, winners. Public.

### `POST /api/admin/advance`
**Auth:** Admin cookie  
**Body:** `{ matchupId: string, winnerId: string }`  
Marks winner, populates the next round's matchup slot.

### `POST /api/admin/toggle-voting`
**Auth:** Admin cookie  
**Body:** `{ round: number, open: boolean }`  
Opens or closes voting for all matchups in a round.

---

## UI / Design Notes

- **Color palette:** Dark background. Use Outdoor Jackson brand colors if provided, otherwise a dark charcoal (`#1a1a1a`) background with white text and a bold accent color (suggest burnt orange `#E8612A` or forest green `#2D6A4F` — confirm with owner)
- **Mobile-first:** Most visitors will come from Instagram on mobile. The bracket must be usable on a phone screen. Consider a vertical scrollable bracket or card-based round view for mobile, with a full horizontal bracket tree on desktop
- **Typography:** Bold, athletic feel. Suggest Inter or a similar grotesque sans-serif
- **Brand cards:** Each brand in a matchup should display logo + name prominently. Logo images should be square, consistent size
- **Voted state:** After voting, show a checkmark or highlight on the chosen brand. Show vote percentages for both
- **Winner state:** Completed matchups show the winner with a trophy or highlight, loser is visually de-emphasized (greyed out)

---

## Bracket Seeding / Initial Data

The bracket will be seeded manually by the admin before launch. The admin panel should include a setup flow for:
1. Entering all 16 brand names and logo URLs
2. Arranging the Round of 16 matchup pairings (slot 1 vs 2, 3 vs 4, etc.)
3. Publishing the bracket (making it visible)

Alternatively, this can be done directly via Supabase table editor — whichever is simpler to implement.

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PASSWORD=
```

---

## Out of Scope (for now)

- User accounts or authentication
- Email/SMS notifications
- Embedded bracket widget for other sites
- Historical bracket archive (Season 1, Season 2, etc.) — can be added later
- Comments or social features
- Automated bracket advancement (admin always confirms winners manually)

---

## Deployment Notes

- Deploy to Vercel via GitHub integration (push to main = auto-deploy)
- Add custom domain `bracket.outdoorjackson.com` in Vercel project settings
- In Namecheap DNS: add CNAME record `bracket` → Vercel's provided value
- All environment variables set in Vercel project settings (not committed to repo)

---

## Definition of Done

- [ ] Bracket displays correctly on mobile and desktop
- [ ] Voting works and is persisted to Supabase
- [ ] Double-vote prevention works (IP + localStorage)
- [ ] Vote counts update without full page refresh
- [ ] Admin can advance bracket and toggle voting
- [ ] Deployed to Vercel with custom subdomain
- [ ] Works correctly when coming from an Instagram link on mobile Safari/Chrome
