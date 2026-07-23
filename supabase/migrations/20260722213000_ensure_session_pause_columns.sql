-- Ensure pause columns exist on sessions.
-- The original 20260718200000_session_pause migration is in-repo but was not
-- applied on the hosted Supabase project (REST: column sessions.paused_at does
-- not exist), which made Pause/Resume fail on every client.
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paused_ms BIGINT NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sessions_paused_ms_check'
      AND conrelid = 'public.sessions'::regclass
  ) THEN
    ALTER TABLE public.sessions
      ADD CONSTRAINT sessions_paused_ms_check CHECK (paused_ms >= 0);
  END IF;
END $$;
