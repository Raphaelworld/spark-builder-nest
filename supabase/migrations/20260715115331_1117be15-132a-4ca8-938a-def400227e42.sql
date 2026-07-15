
-- Goals
CREATE TYPE public.goal_status AS ENUM ('active','archived','completed');

CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  deadline date,
  color text NOT NULL DEFAULT 'terracotta',
  status public.goal_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own goals select" ON public.goals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own goals insert" ON public.goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own goals update" ON public.goals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own goals delete" ON public.goals FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER goals_set_updated_at BEFORE UPDATE ON public.goals
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enforce ≤3 active goals per user via trigger (CHECK can't do subqueries)
CREATE OR REPLACE FUNCTION public.enforce_active_goal_limit()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE cnt integer;
BEGIN
  IF NEW.status = 'active' THEN
    SELECT count(*) INTO cnt FROM public.goals
      WHERE user_id = NEW.user_id AND status = 'active' AND id <> NEW.id;
    IF cnt >= 3 THEN
      RAISE EXCEPTION 'You can have at most 3 active goals. Archive one first.';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER goals_active_limit
BEFORE INSERT OR UPDATE ON public.goals
FOR EACH ROW EXECUTE FUNCTION public.enforce_active_goal_limit();

-- Sessions: link to a goal (optional)
ALTER TABLE public.sessions
  ADD COLUMN goal_id uuid REFERENCES public.goals(id) ON DELETE SET NULL;

-- Planned blocks (weekly grid)
CREATE TABLE public.planned_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id uuid REFERENCES public.goals(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  title text NOT NULL,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_minute smallint NOT NULL CHECK (start_minute BETWEEN 0 AND 1439),
  end_minute smallint NOT NULL CHECK (end_minute BETWEEN 1 AND 1440),
  planned_minutes integer NOT NULL DEFAULT 25 CHECK (planned_minutes BETWEEN 5 AND 240),
  technique text NOT NULL DEFAULT 'pomodoro',
  CHECK (end_minute > start_minute),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.planned_blocks TO authenticated;
GRANT ALL ON public.planned_blocks TO service_role;
ALTER TABLE public.planned_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own blocks select" ON public.planned_blocks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own blocks insert" ON public.planned_blocks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own blocks update" ON public.planned_blocks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own blocks delete" ON public.planned_blocks FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER planned_blocks_set_updated_at BEFORE UPDATE ON public.planned_blocks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX planned_blocks_user_day_idx ON public.planned_blocks(user_id, day_of_week);
CREATE INDEX sessions_user_goal_idx ON public.sessions(user_id, goal_id);
