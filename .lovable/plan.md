
# Gobez — Execution Plan

A daily focus companion built around one core loop (the Focus Session), with Planner, Goals, Insights, and a rule-based Coach orbiting it. Built on React + TanStack Start + Tailwind + shadcn/ui, backed by Lovable Cloud (Supabase under the hood).

## Guiding principles (from the PRD)
- One core loop, never a library of forms. Max ~2 inputs visible per step; prefer chips, sliders, steppers.
- Plain, warm second-person copy — no "SRL", "metacognition", "pillar", "tool N".
- Warm editorial aesthetic: cream paper (#faf8f3), ink text, terracotta (#a14e33), forest green (#4d6b58), DM Sans, rounded-lg, soft shadows.
- WCAG AA contrast, keyboard reachable, `prefers-reduced-motion` respected.
- Timer is timestamp-derived (survives refresh / tab sleep).
- Every table has RLS scoped to `auth.uid()`; one active session per user enforced by a partial unique index; ≤3 active goals.

## Phase 0 — Foundation & design system
- Set up design tokens in `src/styles.css` (cream/ink/terracotta/forest/mustard, DM Sans via `<link>` in `__root.tsx`), light + dark, rounded-lg radii, soft shadows.
- App shell with 5 destinations: **Today, Planner, Goals, Insights** (bottom tab bar mobile / slim left rail desktop) + avatar menu → Settings.
- Placeholder Today screen (big "Start focus session", streak chip, dismissible coach card).
- Real head metadata + Gobez title/description in `__root.tsx`.
- AA contrast pass on all tokens.

## Phase 1 — Lovable Cloud, auth, profiles
- Enable Lovable Cloud.
- Email/password + Google auth; signed-out landing page with value prop and sign-in CTA; signed-in users land on Today.
- `profiles` table auto-populated by a trigger on `auth.users` insert; RLS user-scoped.
- Route protection using the `_authenticated` layout gate.

## Phase 2 — Focus Session core loop (the product)
Schema: `sessions`, `checkins`, `wrapup_tags` (RLS, plus partial unique index `sessions(user_id) WHERE status='active'`).

- **Setup (<30s):** one-line task input with recent-task suggestions, technique picker as cards (Pomodoro 25/5, Deep work 50/10, Active recall), duration stepper, collapsed pre-flight checklist that remembers last state. Starting inserts an `active` session.
- **Focus:** full-screen timer computed from `started_at` (accurate across refresh/tab sleep), pause/extend/end-early, interval-midpoint check-ins (confidence 1–5 slider, optional note, "I'm stuck" link). Persistent mini-bar on all other screens while active.
- **Wrap-up (<60s):** 3-card swipe flow — rating slider, worked/didn't chips + optional line, "one thing for next time". Marks session `completed`, brief celebrate animation (gated on reduced-motion), returns Today. End-early asks one chip-based "why" and stores `abandoned`.
- Wire Today to real data: streak, today's focus minutes, last `next_time_note` as seed suggestion.

## Phase 3 — Planner & Goals
- `goals` (≤3 active, mastery-phrasing hint, archive not delete). Each card shows auto-computed sessions and focus minutes tagged to it.
- `planned_blocks`: tap-and-drag week grid, "Start session" from a block (pre-fills setup, links block↔session), planned-vs-actual at end of week, ICS export.
- Session setup gains goal-tag chips; **Exam mode** toggle appears when a tagged goal deadline is within 7 days (adds one calm-and-plan step before timer).

## Phase 4 — Insights & rituals
- Insights tab: focus-minutes-per-day bars (2 weeks), avg check-in confidence trend, technique effectiveness, compact expandable session history.
- `weekly_reviews`: Sunday card pre-filled with computed stats (sessions, focus minutes, planned-vs-actual, best moment); user answers two short prompts. Stats stored as jsonb.
- `pulses`: monthly 6-slider check, trend chart in Insights. Prompted, never required.

## Phase 5 — Coach & onboarding
- 90-second onboarding: one tappable question per screen → sets `default_technique`, `default_duration`, `coach_tone`, `onboarding_completed_at`. Retake from Settings.
- Rule-based coach moments:
  - **Reframe** when check-in confidence ≤2 or wrap-up rating ≤2 (thought chips → reframe chips).
  - **Stuck** helper composes a specific question (trying / expected / happened) with copy + mailto.
  - **Evidence bank** (`evidence` table): high-rated "what worked" chips saved; surfaced on Today coach card before similar sessions.
- Optional: `coach-boost` edge function using Lovable AI Gateway (Gemini) with rule-based fallback.

## Phase 6 — Polish & launch
- Settings behind avatar: display name, appearance (light/dark/system), retake onboarding, export all data as JSON, delete account (cascades all rows).
- `events` table (insert-only RLS) logging: `session_started`, `checkin_logged`, `session_completed`, `session_abandoned`, `review_completed`, `onboarding_completed`.
- Full QA sweep: AA contrast in both themes, keyboard-only session loop, aria-live on timer, no screen with >2 stacked labeled inputs, 375px one-handed thumb-reach check.

## Technical notes
- **Routing:** TanStack Start file routes. `_authenticated` layout gate wraps Today/Planner/Goals/Insights/Settings; landing + auth are public. Session runs full-screen at `/session` with a sticky mini-bar rendered from the app shell when an active session exists.
- **Data:** TanStack Query as canonical read shape (`ensureQueryData` in loaders, `useSuspenseQuery` in components) via `requireSupabaseAuth` server functions.
- **Timer:** derive remaining time from `started_at + planned_minutes − pausedElapsed` on each animation frame; no server tick.
- **Active session invariant:** partial unique index in Postgres + optimistic UI guard.
- **Grants:** every `public.<table>` migration includes `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated; GRANT ALL ... TO service_role;` before enabling RLS and writing policies.
- **Accessibility:** focus-visible rings on all interactive elements, `aria-live="polite"` for timer state, `prefers-reduced-motion` gates celebrate/transition animations.
- **Out of scope (v2.0):** collaboration, instructor dashboards, native apps, push, Behavior Chain analyzer, offline/PWA, any Firestore migration.

## Suggested delivery order
P0 shell → P1 auth → **P2 session loop (pin)** → P3 planner+goals → P4 insights → P5 coach → P6 polish. If time-boxed, ship P0–P2 + P6 as MVP and iterate P3–P5.

## What I'd like to confirm before building
1. Confirm the app name is **Gobez** (used in title, metadata, landing).
2. OK to enable **Lovable Cloud** in Phase 1 (required for auth, DB, RLS, edge functions)?
3. Start with Phase 0 (shell + design system) on approval, one phase per turn?
