export const TECHNIQUES = {
  pomodoro: {
    id: "pomodoro" as const,
    name: "Pomodoro",
    hint: "25 min focus, short breaks",
    defaultMinutes: 25,
    chips: ["clear plan", "no distractions", "small chunks", "took a break"],
  },
  deep_work: {
    id: "deep_work" as const,
    name: "Deep work",
    hint: "50 min stretch, deeper cadence",
    defaultMinutes: 50,
    chips: ["one big thing", "flow state", "phone away", "quiet space"],
  },
  active_recall: {
    id: "active_recall" as const,
    name: "Active recall",
    hint: "Test yourself as you learn",
    defaultMinutes: 30,
    chips: ["retrieval practice", "flashcards", "explain aloud", "wrote from memory"],
  },
};

export type TechniqueId = keyof typeof TECHNIQUES;
