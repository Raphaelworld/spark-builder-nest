
-- evidence
CREATE TABLE public.evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  tag text NOT NULL,
  task text,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidence TO authenticated;
GRANT ALL ON public.evidence TO service_role;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evidence_select_own" ON public.evidence FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "evidence_insert_own" ON public.evidence FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "evidence_update_own" ON public.evidence FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "evidence_delete_own" ON public.evidence FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX evidence_user_created_idx ON public.evidence (user_id, created_at DESC);

-- Auto-populate evidence from "worked" wrapup_tags
CREATE OR REPLACE FUNCTION public.evidence_from_wrapup_tag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE t text;
BEGIN
  IF NEW.polarity = 'worked' THEN
    SELECT task INTO t FROM public.sessions WHERE id = NEW.session_id;
    INSERT INTO public.evidence (user_id, session_id, tag, task)
    VALUES (NEW.user_id, NEW.session_id, NEW.tag, t);
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER wrapup_tag_to_evidence
AFTER INSERT ON public.wrapup_tags
FOR EACH ROW EXECUTE FUNCTION public.evidence_from_wrapup_tag();

-- events (append-only analytics log)
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_select_own" ON public.events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "events_insert_own" ON public.events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX events_user_created_idx ON public.events (user_id, created_at DESC);
CREATE INDEX events_user_name_idx ON public.events (user_id, name);
