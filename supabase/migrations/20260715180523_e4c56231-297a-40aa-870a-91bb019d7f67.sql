
-- Weekly reviews: one row per user per ISO week (Monday-start)
CREATE TABLE public.weekly_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  went_well text,
  next_focus text,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_reviews TO authenticated;
GRANT ALL ON public.weekly_reviews TO service_role;

ALTER TABLE public.weekly_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own weekly_reviews select" ON public.weekly_reviews
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own weekly_reviews insert" ON public.weekly_reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own weekly_reviews update" ON public.weekly_reviews
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own weekly_reviews delete" ON public.weekly_reviews
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER weekly_reviews_updated_at
  BEFORE UPDATE ON public.weekly_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Monthly pulses: one row per user per month (1st of month)
CREATE TABLE public.pulses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  month_start date NOT NULL,
  energy smallint NOT NULL CHECK (energy BETWEEN 1 AND 10),
  motivation smallint NOT NULL CHECK (motivation BETWEEN 1 AND 10),
  clarity smallint NOT NULL CHECK (clarity BETWEEN 1 AND 10),
  progress smallint NOT NULL CHECK (progress BETWEEN 1 AND 10),
  balance smallint NOT NULL CHECK (balance BETWEEN 1 AND 10),
  confidence smallint NOT NULL CHECK (confidence BETWEEN 1 AND 10),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, month_start)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pulses TO authenticated;
GRANT ALL ON public.pulses TO service_role;

ALTER TABLE public.pulses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own pulses select" ON public.pulses
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own pulses insert" ON public.pulses
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own pulses update" ON public.pulses
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own pulses delete" ON public.pulses
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER pulses_updated_at
  BEFORE UPDATE ON public.pulses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
