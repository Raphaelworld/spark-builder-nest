import { useState } from "react";
import { LifeBuoy } from "lucide-react";

export type CheckinResult = {
  confidence: number;
  note?: string;
  kind: "auto" | "manual" | "stuck";
};

export function CheckinDialog({
  auto,
  pending,
  onSubmit,
  onStuck,
  onClose,
}: {
  auto: boolean;
  pending: boolean;
  onSubmit: (r: CheckinResult) => void;
  onStuck: () => void;
  onClose: () => void;
}) {
  const [confidence, setConfidence] = useState<number | null>(null);
  const [note, setNote] = useState("");

  const submit = (c: number) => {
    onSubmit({
      confidence: c,
      note: note.trim() || undefined,
      kind: auto ? "auto" : "manual",
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 p-4 backdrop-blur md:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Quick check-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-serif text-lg">{auto ? "Still with it?" : "How's it going?"}</p>
        <p className="mt-1 text-xs text-muted-foreground">Tap to rate your focus</p>
        <div className="mt-4 flex justify-between">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setConfidence(n)}
              aria-pressed={confidence === n}
              className={`flex h-11 w-11 items-center justify-center rounded-full border text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                confidence === n
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background hover:border-primary hover:bg-primary/5"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={140}
          placeholder="One-line note (optional)"
          className="mt-4 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={() => confidence !== null && submit(confidence)}
          disabled={confidence === null || pending}
          className="mt-3 w-full rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {pending ? "Saving…" : "Log it"}
        </button>
        <button
          onClick={onStuck}
          className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LifeBuoy className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          I'm stuck
        </button>
      </div>
    </div>
  );
}
