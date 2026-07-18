-- Align the monthly pulse with the PRD's six SRL dimensions (F4):
-- planning ahead, staying focused, bouncing back from setbacks, confidence,
-- study environment, asking for help. `confidence` already matches.
ALTER TABLE public.pulses RENAME COLUMN energy TO planning;
ALTER TABLE public.pulses RENAME COLUMN motivation TO focus;
ALTER TABLE public.pulses RENAME COLUMN clarity TO resilience;
ALTER TABLE public.pulses RENAME COLUMN progress TO environment;
ALTER TABLE public.pulses RENAME COLUMN balance TO help_seeking;
