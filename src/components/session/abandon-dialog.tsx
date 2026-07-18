const REASONS = [
  { id: "lost_focus", label: "Lost focus" },
  { id: "interrupted", label: "Got interrupted" },
  { id: "too_tired", label: "Too tired" },
  { id: "wrong_task", label: "Wrong task for now" },
  { id: "done_early", label: "Finished early" },
] as const;

/**
 * End-early flow (PRD §4.2): one chip-based "why" question, then the session
 * is stored with status 'abandoned'. Ending early still counts as a session.
 */
export function AbandonDialog({
  pending,
  onPick,
  onClose,
}: {
  pending: boolean;
  onPick: (reason: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 p-4 backdrop-blur md:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="End session early"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-serif text-lg">Ending early — what happened?</p>
        <p className="mt-1 text-xs text-muted-foreground">
          One tap. It still counts — knowing why helps next time.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <button
              key={r.id}
              disabled={pending}
              onClick={() => onPick(r.id)}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-sm hover:border-primary hover:bg-primary/5 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {r.label}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          disabled={pending}
          className="mt-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-accent disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Keep going
        </button>
      </div>
    </div>
  );
}
