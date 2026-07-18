import { useEffect, useState } from "react";

/**
 * Exam-mode calm-and-plan step (PRD F5 / roadmap 3.3): a brief breathing cue
 * plus a "first move" prompt shown before the timer starts. Purely a moment —
 * nothing here is persisted.
 */
export function CalmPlanStep({
  task,
  pending,
  onStart,
  onBack,
}: {
  task: string;
  pending: boolean;
  onStart: () => void;
  onBack: () => void;
}) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;
    const id = setInterval(() => {
      setPhase((p) => (p === "in" ? "hold" : p === "hold" ? "out" : "in"));
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const cue = phase === "in" ? "Breathe in…" : phase === "hold" ? "Hold…" : "Breathe out…";

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-8 py-10 text-center">
      <div>
        <p className="text-xs uppercase tracking-wide text-primary">Exam mode</p>
        <h1 className="mt-1 font-serif text-2xl md:text-3xl">One calm minute first.</h1>
      </div>

      <div className="flex h-40 w-40 items-center justify-center">
        <div
          aria-hidden
          className={`flex h-28 w-28 items-center justify-center rounded-full bg-primary/10 transition-transform duration-[3500ms] ease-in-out motion-reduce:transition-none ${
            phase === "in" ? "scale-125" : phase === "hold" ? "scale-125" : "scale-90"
          }`}
        >
          <span className="h-3 w-3 rounded-full bg-primary" />
        </div>
      </div>
      <p aria-live="polite" className="text-lg text-muted-foreground">
        {cue}
      </p>

      <div className="rounded-xl border border-border bg-card px-5 py-4">
        <p className="text-sm text-muted-foreground">When you start, your first move on</p>
        <p className="mt-0.5 font-serif text-lg">"{task}"</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Hold it in mind. Small and concrete beats big and vague.
        </p>
      </div>

      <div className="flex w-full gap-3">
        <button
          onClick={onBack}
          disabled={pending}
          className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium hover:bg-accent disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Back
        </button>
        <button
          onClick={onStart}
          disabled={pending}
          className="flex-[2] rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {pending ? "Starting…" : "I'm ready — start"}
        </button>
      </div>
    </div>
  );
}
