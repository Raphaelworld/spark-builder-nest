# Gobez — Roadmap & Requirements Implementation Audit

**Audited against:** `REQUIREMENTS.md` (PRD, 2026-07-15) and `ROADMAP.md` (phased build plan)
**Audit date:** 2026-07-18
**Codebase state:** `main` @ `0ce3f4a` ("Added #563ACC secondary color")

## Verdict at a glance

All six roadmap phases are represented in the codebase at MVP depth: the plan → focus →
wrap-up loop works end to end, data lands in the right tables, RLS is on everywhere, and the
supporting features (planner, goals, insights, coach, onboarding, settings) all exist. However,
several **core-flow requirements from PRD §4 are missing** (pause/extend, automatic check-ins,
the stuck/reframe flows, pre-flight checklist, suggestions), the **design direction has drifted
hard away from the PRD §7 palette** (teal + violet instead of terracotta/cream, with AA contrast
failures), and there are **data-rights gaps** (export/delete miss three tables; two tables can
orphan rows after account deletion).

| Phase | Scope | Status |
|---|---|---|
| P0 | Shell, theme, dark mode | ⚠️ Built, but palette contradicts PRD §7 |
| P1 | Supabase, auth, profiles, RLS | ✅ Complete |
| P2 | Focus session core loop | ⚠️ Loop works; several §4 requirements missing |
| P3 | Planner & Goals | ⚠️ Strong build; block↔session link + planned-vs-actual missing |
| P4 | Insights & rituals | ⚠️ Built; session history + confidence trend missing |
| P5 | Coach & onboarding | ⚠️ Coach/evidence/onboarding built; reframe & stuck flows missing |
| P6 | Polish & launch | ⚠️ Settings/export/delete built; gaps in coverage, a11y, events |

---

## Phase 0 — Foundation & design system

**Done:** App shell with the five destinations (Today, Planner, Goals, Insights; Settings behind
the avatar — `src/components/app-shell.tsx`), bottom tab bar on mobile, dark mode toggle with
persistence, global `prefers-reduced-motion` override (`src/styles.css:284`), DM Sans + serif
display type, rounded-2xl/soft-shadow editorial styling.

**Deviations / issues:**

1. **Palette drift (contradicts PRD §7 and §1.2).** The token named `--terracotta` is defined as
   **teal `#07A081`** and a **violet `#563ACC`** secondary was added (`src/styles.css:124-129`).
   The PRD requires cream `#faf8f3`-family backgrounds, terracotta primary darkened to
   `#a14e33`-class, forest green success, and explicitly says *"Never indigo/generic-SaaS
   blue."* A violet/indigo secondary and teal primary are exactly the SaaS look §1.2 warns
   against. The light background is plain `#FFFFFF`, not the cream paper family.
2. **WCAG AA failures (PRD §6, success criterion §9).**
   - `--primary` `#07A081` as *text* on white = **3.30:1** — fails AA (4.5:1) for normal text.
     `text-primary` is used at body size across the app (links, chips, hints, goal deadline
     labels, coach actions).
   - `--warning` mustard `#B8943E` on white = **2.86:1** — fails even the 3:1 large-text bar
     where used as icon/text color (e.g. streak flame on Today).
   - Button fills pass (ink-on-teal 5.31:1; dark mode 5.14:1).
   This repeats the exact v1 failure mode the PRD calls out ("dashboard labels and primary
   buttons").
3. Desktop nav is a top bar, not the "slim left icon rail" in §3 — minor.

## Phase 1 — Supabase, auth, profiles

**Done:** Email/password + Google OAuth (`src/routes/auth.tsx`), `profiles` auto-created via
`handle_new_user` trigger, signed-out landing page (`src/routes/index.tsx`), signed-in users land
on Today. Every table has RLS enabled with `auth.uid() = user_id` policies for
select/insert/update/delete; helper functions have `search_path` pinned and EXECUTE revoked;
`events` is select+insert only for clients. The one-active-session partial unique index and the
≤3-active-goals trigger are both present. This phase matches the PRD closely.

**Minor:** `weekly_reviews.user_id` and `pulses.user_id` have **no FK to `auth.users`** (all
other tables do, with `ON DELETE CASCADE`). RLS still isolates rows, but deleting the auth user
orphans these rows forever — see Phase 6.

## Phase 2 — Focus Session core loop (the heart)

**Done:** Setup → focus → wrap-up in `src/routes/_authenticated/session.tsx`; timestamp-derived
countdown (accurate across refresh/tab sleep, per §6); one-tap 1–5 check-ins saved to
`checkins`; wrap-up saves `focus_rating`, `next_time_note`, and `wrapup_tags`; abandon path
stores `status='abandoned'`; persistent session mini-bar with live timer on all other screens
(`app-shell.tsx:59`); `session_started/completed/abandoned` events logged server-side. Starting
a new session auto-abandons a lingering active one (reason `replaced`) — a sensible guard.

**Missing vs PRD §4:**

1. **No pause/extend controls** (§4.2 requires both). The `Pause` icon is imported but only
   decorates the "I'm stuck" button.
2. **No automatic check-in prompts** at technique interval midpoints, and **no break prompts**
   (Pomodoro intervals). Check-ins are on-demand only; the `auto` check-in kind exists in the
   enum but is never used.
3. **Check-in note missing** — the schema and server fn accept an optional 140-char note, but
   the check-in dialog offers only the 1–5 rating.
4. **"I'm stuck" is a stub.** It logs a `kind='stuck'` check-in with confidence 1. The PRD's
   escape hatch (→ help composer with copy/mailto, or reframe moment) does not exist anywhere
   in the codebase.
5. **Abandon "why" missing** — §4.2 requires one chip-based question; the reason is hardcoded
   `"user_ended"`. There is also no explicit "End early" on the focus screen; the only abandon
   path is "Discard" inside wrap-up.
6. **No pre-flight checklist** in setup (optional toggle list that remembers last state — §4.1).
7. **No recent-task suggestions** in setup, and the **"one thing for next time" note never seeds
   the next setup** (§4.3). Ironically `getTodaySummary` already computes `recentTasks` and
   `lastNote` — the data is there, the setup UI just never renders it. `lastNote` surfaces only
   as a low-priority coach nudge.
8. **Setup ignores onboarding defaults.** `default_technique` / `default_duration` from the
   profile are never read; setup always starts at Pomodoro/25 unless URL params override.
9. **Exam mode semantics are inverted.** PRD: a toggle that *appears only* when a tagged goal's
   deadline is ≤7 days and *adds* a brief calm/plan step before the timer. Implementation: an
   always-visible toggle that *suppresses* check-ins (it does auto-enable when a deadline is
   near). No calm/plan step exists.
10. **No completion celebration** (streak/garden animation, §4.3) and **no `aria-live`
    announcements** for timer state anywhere (§6, Prompt 6.2).

**Acceptable simplifications:** wrap-up is one scrollable screen rather than 3 swipeable cards
(still ~≤60s; each screen keeps to ≤2 labeled text inputs, so the §1.3 anti-goal holds);
duration is a slider rather than a stepper.

## Phase 3 — Planner & Goals

**Done:** Planner is the most polished surface — drag-and-drop week grid (dnd-kit), task tray,
⌘K quick-add palette, block editor, duplicate/resize/move, "Start session" pre-fills setup via
URL params, `.ics` export, planner analytics events. Goals: ≤3 active enforced in UI *and* DB
trigger, mastery-phrasing nudge ("Phrase it as mastery, not a task"), optional deadline, archive
(not delete) flow, per-goal auto-computed sessions/minutes, goal chips in session setup, deadline
≤7 days highlighted.

**Gaps:**

1. **Block → session link never persisted.** `planned_blocks.session_id` exists per the schema,
   but `startBlock()` only passes URL params; no code ever sets `session_id` on the block. This
   breaks the data foundation for planned-vs-actual.
2. **No planned-vs-actual view** at the end of the week (PRD F2, Prompt 3.2) — not in Planner,
   not in the weekly review stats.
3. **Blocks are weekly-recurring templates** (`day_of_week` + minutes) rather than dated
   `starts_at/ends_at` timestamps per §5.2. Workable as a product choice, but it makes historical
   planned-vs-actual impossible and the ICS export can only ever emit "this week."
4. Goals schema deviations: `target` column replaced by a free-text `description` ("Why"),
   `archived_at` replaced by a status enum. Minor, functionally equivalent.

## Phase 4 — Insights & rituals

**Done:** Insights tab with KPI cards (minutes, sessions, avg rating, completion rate — the §9
loop-completion metric is visible), daily focus line chart with 7/30/90-day ranges, best-hour
window with hour histogram, minutes-by-technique bars, top worked/didn't tags, "notes to future
you." Weekly review (`weekly_reviews`, one per ISO week) pre-filled with computed stats
(sessions, minutes, abandoned, avg focus) + the two short answers. Monthly pulse (`pulses`, one
per month) with six sliders and a small trend across pulses. Warm editorial styling throughout —
no dense analytics grids.

**Gaps:**

1. **No session history list** (reverse-chronological, compact expandable rows — PRD F4,
   Prompt 4.1).
2. **No check-in confidence trend** — Insights never queries `checkins` at all (Prompt 4.1 asks
   for an average-confidence trend line).
3. **Technique effectiveness** shows minutes/sessions per technique but not "which techniques
   get the best wrap-up ratings."
4. **Pulse dimensions diverge from the PRD's instrument** (planning ahead, staying focused,
   bouncing back, confidence, environment, asking for help → implemented as energy, motivation,
   clarity, progress, balance, confidence, on 1–10). The SRL-snapshot intent of F4 is partially
   lost.
5. Weekly review pre-fill omits planned-vs-actual and "best moment (highest-rated session)".

## Phase 5 — Coach & onboarding

**Done:** Rule-based coach (`src/lib/coach.ts`) with 10 prioritized nudge types (streak
celebrate/save, day start, best-hour window, abandon pattern, weekly delta, recurring "didn't"
tag, untried technique, last-note callback), personalized by the three onboarding coach tones;
dismissible cards on Today. Evidence bank: DB trigger copies every "worked" wrap-up tag into
`evidence`; Today surfaces recent evidence with pin/dismiss. Onboarding overlay: 4 one-question
screens (name, technique, duration, tone) → writes profile defaults + `onboarding_completed_at`.

**Gaps:**

1. **Reframe moment does not exist** (trigger on check-in confidence ≤2 or wrap-up rating ≤2 →
   catch-the-thought chips → reframe). Nothing in the codebase implements it.
2. **Stuck helper/composer does not exist** (compose a specific question with copy/mailto).
   Together with #1 this means v1 tools 5 and 8 are effectively *cut*, not absorbed as the
   consolidation map requires.
3. **Retake onboarding from Settings is missing** (required by F6 and Prompt 5.1/6.1).
4. Onboarding is a preferences picker, not the 90-second diagnostic quiz (how they plan, focus,
   handle setbacks); the name step is a text field (PRD: tappable answers, no text fields).
   Defensible simplification, but the profile defaults it sets are then never used by session
   setup (see Phase 2 gap #8), so the personalization loop is broken end-to-end.
5. Evidence subtleties: captured for *all* worked tags (PRD: with high-rated sessions), no
   `surfaced_count`, surfacing is by recency rather than "before a similar session (same goal or
   technique)."
6. `coach-boost` edge function not built — explicitly optional in PRD §5.4, fine to skip.
7. Coach-card dismissals are in-memory only; dismissed nudges return on every reload.

## Phase 6 — Polish & launch

**Done:** Settings behind the avatar with display name, default rhythm/length, coach tone, sign
out, **JSON export**, and **delete account** (typed-DELETE confirmation, wipes user rows, then
deletes the auth user via admin client). Client analytics pipeline batches to the `events` table
(app_loaded, route_change, client_error, auth events, data-track click delegation) with no
third-party analytics.

**Gaps:**

1. **Export/delete miss three tables.** `exportUserData` and `deleteAccount`
   (`src/lib/account.functions.ts`) cover profiles, sessions, checkins, wrapup_tags, goals,
   planned_blocks, evidence, events — but **not `weekly_reviews`, `pulses`, or
   `unscheduled_tasks`**. Export is therefore incomplete (§6 privacy requirement), and because
   `weekly_reviews`/`pulses` have **no FK cascade to `auth.users`**, deleting an account
   **permanently orphans those rows** in the database. This is the most concrete
   privacy/data-rights defect in the audit.
2. **Event taxonomy incomplete** (Prompt 6.3): `session_started/completed/abandoned` and the
   planner events exist, but `checkin_logged`, `review_completed`, and `onboarding_completed`
   are never emitted (onboarding completion is only inferable from the profile timestamp).
3. **Appearance setting** (light/dark/**system**) is not in Settings — only a header toggle with
   no "system" option.
4. **Accessibility QA items outstanding** (Prompt 6.2): no `aria-live` timer announcements;
   AA contrast failures from Phase 0; keyboard reachability is otherwise good (consistent
   `focus-visible` rings, `aria-pressed`/`aria-current`/`role="alert"` usage).

## Out-of-scope check (PRD §8) — clean

No collaboration/social features, no instructor dashboards, no push notifications, no PWA/offline,
no Firestore migration, no Behavior Chain analyzer. No scope creep detected. The only addition
beyond the PRD is the planner's `unscheduled_tasks` tray + command palette — in the planner's
spirit, though it adds a third schema-divergent table.

## Success criteria (PRD §9)

| Criterion | Status |
|---|---|
| Onboarding → first full session < 10 min | ✅ Plausible — flow is short and unblocked |
| Loop completion rate measurable from `events` day one | ✅ started/completed/abandoned all logged |
| Zero screens that read as a form (>2 stacked labeled inputs) | ✅ Holds on every screen audited |
| All AA contrast checks pass; keyboard-only loop succeeds | ❌ `text-primary` 3.30:1 and warning 2.86:1 fail; no `aria-live` |

## Prioritized fix list

**P1 — correctness, privacy, a11y**
1. Add `weekly_reviews`, `pulses`, `unscheduled_tasks` to export **and** delete; add
   `REFERENCES auth.users(id) ON DELETE CASCADE` to `weekly_reviews.user_id` / `pulses.user_id`.
2. Fix AA contrast: darken the primary token for text use (or split text-vs-fill tokens) and the
   warning foreground; re-run a contrast pass in both themes (Prompt 0.2/6.2).
3. Decide the palette question deliberately: the current teal+violet look violates PRD §7/§1.2
   as written — either restore terracotta/cream or amend the PRD.
4. Add `aria-live` announcements for timer start/checkpoint/end.

**P2 — core-loop completeness (PRD §4)**
5. Pause/extend controls; auto check-in prompts at interval midpoints (+ optional note); break
   prompts per technique.
6. Stuck flow (help composer with copy/mailto) and reframe moment (confidence ≤2 / rating ≤2).
7. Abandon "why" chips; an explicit End-early path from the focus screen.
8. Wire setup to profile defaults, recent-task suggestions, and last `next_time_note` seed
   (data already computed in `getTodaySummary`).
9. Align exam mode with the PRD (gated visibility, calm/plan pre-step) or amend the PRD.

**P3 — feature completeness**
10. Set `planned_blocks.session_id` when a block launches a session; build planned-vs-actual
    (week footer + weekly-review stat).
11. Session history list and check-in confidence trend in Insights; wrap-up-rating-by-technique.
12. Retake onboarding + appearance (system option) in Settings; pre-flight checklist in setup.
13. Emit `checkin_logged`, `review_completed`, `onboarding_completed` events.
