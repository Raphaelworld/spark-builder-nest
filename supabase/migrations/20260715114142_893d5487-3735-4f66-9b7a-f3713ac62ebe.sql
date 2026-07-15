
-- Enums
CREATE TYPE public.session_status AS ENUM ('active', 'completed', 'abandoned');
CREATE TYPE public.checkin_kind AS ENUM ('auto', 'manual', 'stuck');
CREATE TYPE public.wrapup_polarity AS ENUM ('worked', 'didnt');

-- ============ profiles ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  default_technique TEXT NOT NULL DEFAULT 'pomodoro',
  default_duration SMALLINT NOT NULL DEFAULT 25,
  coach_tone TEXT NOT NULL DEFAULT 'warm',
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can delete own profile" ON public.profiles
  FOR DELETE TO authenticated USING (auth.uid() = id);

-- Auto-create a profile row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Shared updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ sessions ============
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task TEXT NOT NULL,
  technique TEXT NOT NULL DEFAULT 'pomodoro',
  planned_minutes SMALLINT NOT NULL DEFAULT 25,
  exam_mode BOOLEAN NOT NULL DEFAULT FALSE,
  status public.session_status NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  focus_rating SMALLINT,
  next_time_note TEXT,
  abandon_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;
GRANT ALL ON public.sessions TO service_role;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own sessions (select)" ON public.sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users manage own sessions (insert)" ON public.sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own sessions (update)" ON public.sessions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own sessions (delete)" ON public.sessions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- One active session per user
CREATE UNIQUE INDEX sessions_one_active_per_user
  ON public.sessions (user_id) WHERE status = 'active';

CREATE INDEX sessions_user_started_idx ON public.sessions (user_id, started_at DESC);

CREATE TRIGGER sessions_set_updated_at BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ checkins ============
CREATE TABLE public.checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  confidence SMALLINT NOT NULL,
  note TEXT,
  kind public.checkin_kind NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkins TO authenticated;
GRANT ALL ON public.checkins TO service_role;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own checkins (select)" ON public.checkins
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users manage own checkins (insert)" ON public.checkins
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own checkins (update)" ON public.checkins
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own checkins (delete)" ON public.checkins
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX checkins_session_idx ON public.checkins (session_id, created_at);

-- ============ wrapup_tags ============
CREATE TABLE public.wrapup_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  polarity public.wrapup_polarity NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wrapup_tags TO authenticated;
GRANT ALL ON public.wrapup_tags TO service_role;
ALTER TABLE public.wrapup_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own wrapup_tags (select)" ON public.wrapup_tags
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users manage own wrapup_tags (insert)" ON public.wrapup_tags
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own wrapup_tags (delete)" ON public.wrapup_tags
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX wrapup_tags_session_idx ON public.wrapup_tags (session_id);
