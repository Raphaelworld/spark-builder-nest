import { useState } from "react";
import { Copy, Mail, Check } from "lucide-react";

/**
 * Reframe moment (PRD F5): offered when a check-in confidence is ≤2 or a
 * wrap-up rating is ≤2. Catch the thought → tap a matching reframe.
 */
const REFRAMES = [
  {
    thought: "I'm just not getting this",
    reframe: "Not yet. Understanding is built one small piece at a time — pick the next piece.",
  },
  {
    thought: "I'm too slow",
    reframe: "Speed comes from reps. Going slowly now is exactly how fast gets built.",
  },
  {
    thought: "I keep getting distracted",
    reframe: "Noticing the drift is the skill. Come back once — that's a rep, not a failure.",
  },
  {
    thought: "This is too much",
    reframe: "Shrink it. What's the version that fits in the next five minutes?",
  },
  {
    thought: "Everyone else finds this easier",
    reframe: "You only see their finished work. Compare yourself with yesterday-you instead.",
  },
] as const;

export function ReframeMoment({ onClose }: { onClose: () => void }) {
  const [picked, setPicked] = useState<number | null>(null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 p-4 backdrop-blur md:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Catch the thought"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {picked === null ? (
          <>
            <p className="font-serif text-lg">Rough patch. Catch the thought?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Tap the one that sounds closest — or skip.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {REFRAMES.map((r, i) => (
                <button
                  key={r.thought}
                  onClick={() => setPicked(i)}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-sm hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  "{r.thought}"
                </button>
              ))}
            </div>
            <button
              onClick={onClose}
              className="mt-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Skip
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">"{REFRAMES[picked].thought}"</p>
            <p className="mt-3 font-serif text-lg leading-snug">{REFRAMES[picked].reframe}</p>
            <button
              onClick={onClose}
              className="mt-5 w-full rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Back to it
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * "I'm stuck" helper (PRD F5): composes a specific question — what I'm trying,
 * what I expected, what happened — with copy and mailto actions.
 */
export function StuckComposer({ task, onClose }: { task: string; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [trying, setTrying] = useState("");
  const [expected, setExpected] = useState("");
  const [happened, setHappened] = useState("");
  const [copied, setCopied] = useState(false);

  const question = [
    `Hi — I'm stuck while working on "${task}" and could use a pointer.`,
    trying.trim() && `What I'm trying to do: ${trying.trim()}`,
    expected.trim() && `What I expected: ${expected.trim()}`,
    happened.trim() && `What's actually happening: ${happened.trim()}`,
    "Any nudge in the right direction would help. Thanks!",
  ]
    .filter(Boolean)
    .join("\n\n");

  const steps = [
    { label: "What are you trying to do?", value: trying, set: setTrying },
    { label: "What did you expect?", value: expected, set: setExpected },
    { label: "What's actually happening?", value: happened, set: setHappened },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(question);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — the mailto path still works
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 p-4 backdrop-blur md:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Ask for help"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {step < steps.length ? (
          <>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Ask for help · {step + 1} of {steps.length}
            </p>
            <p className="mt-2 font-serif text-lg">{steps[step].label}</p>
            <input
              autoFocus
              value={steps[step].value}
              onChange={(e) => steps[step].set(e.target.value)}
              maxLength={200}
              placeholder="One line is plenty"
              className="mt-3 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => (step === 0 ? onClose() : setStep((s) => s - 1))}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {step === 0 ? "Cancel" : "Back"}
              </button>
              <button
                onClick={() => setStep((s) => s + 1)}
                className="flex-[2] rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {step === steps.length - 1 ? "Compose" : "Next"}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="font-serif text-lg">Your question, ready to send</p>
            <pre className="mt-3 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm text-foreground">
              {question}
            </pre>
            <div className="mt-4 flex gap-2">
              <button
                onClick={copy}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {copied ? (
                  <>
                    <Check className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                    Copy
                  </>
                )}
              </button>
              <a
                href={`mailto:?subject=${encodeURIComponent(`Stuck on: ${task}`)}&body=${encodeURIComponent(question)}`}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-center text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Mail className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                Email it
              </a>
            </div>
            <button
              onClick={onClose}
              className="mt-2 w-full rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Back to the session
            </button>
          </>
        )}
      </div>
    </div>
  );
}
