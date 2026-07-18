-- Pause/extend support for focus sessions (PRD §4.2).
-- paused_at: set while the session is paused; NULL while running.
-- paused_ms: total milliseconds spent paused so far (accumulated on resume).
ALTER TABLE public.sessions
  ADD COLUMN paused_at TIMESTAMPTZ,
  ADD COLUMN paused_ms BIGINT NOT NULL DEFAULT 0 CHECK (paused_ms >= 0);
