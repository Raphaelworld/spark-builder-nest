export const TECHNIQUES = {
  pomodoro: {
    id: "pomodoro" as const,
    name: "Pomodoro",
    hint: "25 min focus, short breaks",
    defaultMinutes: 25,
    intervalMinutes: 25,
    breakMinutes: 5,
    chips: ["clear plan", "no distractions", "small chunks", "took a break"],
  },
  deep_work: {
    id: "deep_work" as const,
    name: "Deep work",
    hint: "50 min stretch, deeper cadence",
    defaultMinutes: 50,
    intervalMinutes: 50,
    breakMinutes: 10,
    chips: ["one big thing", "flow state", "phone away", "quiet space"],
  },
  active_recall: {
    id: "active_recall" as const,
    name: "Active recall",
    hint: "Test yourself as you learn",
    defaultMinutes: 30,
    intervalMinutes: 30,
    breakMinutes: 5,
    chips: ["retrieval practice", "flashcards", "explain aloud", "wrote from memory"],
  },
};

export type TechniqueId = keyof typeof TECHNIQUES;

export type SessionTimerFields = {
  started_at: string;
  planned_minutes: number;
  paused_at?: string | null;
  paused_ms?: number | null;
};

/**
 * Active (non-paused) elapsed milliseconds for a session, derived purely from
 * persisted timestamps so it survives refresh and tab sleep.
 */
export function activeElapsedMs(s: SessionTimerFields, now: number): number {
  const start = new Date(s.started_at).getTime();
  const frozen = s.paused_at ? new Date(s.paused_at).getTime() : now;
  return Math.max(0, frozen - start - (s.paused_ms ?? 0));
}

export function remainingMs(s: SessionTimerFields, now: number): number {
  return Math.max(0, s.planned_minutes * 60_000 - activeElapsedMs(s, now));
}
