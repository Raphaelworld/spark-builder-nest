CREATE TABLE public.unscheduled_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  technique TEXT NOT NULL DEFAULT 'pomodoro',
  planned_minutes INTEGER NOT NULL DEFAULT 25,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.unscheduled_tasks TO authenticated;
GRANT ALL ON public.unscheduled_tasks TO service_role;

ALTER TABLE public.unscheduled_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own unscheduled tasks"
  ON public.unscheduled_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own unscheduled tasks"
  ON public.unscheduled_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own unscheduled tasks"
  ON public.unscheduled_tasks FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own unscheduled tasks"
  ON public.unscheduled_tasks FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER unscheduled_tasks_updated_at
  BEFORE UPDATE ON public.unscheduled_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX unscheduled_tasks_user_position_idx
  ON public.unscheduled_tasks(user_id, position);