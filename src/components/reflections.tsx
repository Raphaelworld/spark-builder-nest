import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, PencilLine } from "lucide-react";
import { pulsesQueryOptions, weeklyReviewQueryOptions } from "@/lib/reflections-queries";
import { savePulse, saveWeeklyReview } from "@/lib/reflections.functions";

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-muted/50 p-2">
      <p className="font-serif text-lg text-foreground">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function formatWeek(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const end = new Date(d);
  end.setDate(end.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${d.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, opts)}`;
}

function formatMonth(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function WeeklyReviewCard() {
  const { data } = useQuery(weeklyReviewQueryOptions());
  const qc = useQueryClient();
  const save = useServerFn(saveWeeklyReview);
  const mutation = useMutation({
    mutationFn: (input: { wentWell: string; nextFocus: string }) => save({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["weeklyReview"] }),
  });

  const existing = data?.current;
  const [editing, setEditing] = useState(false);
  const [wentWell, setWentWell] = useState("");
  const [nextFocus, setNextFocus] = useState("");

  useEffect(() => {
    setWentWell(existing?.went_well ?? "");
    setNextFocus(existing?.next_focus ?? "");
  }, [existing?.went_well, existing?.next_focus, existing?.id]);

  if (!data) return null;
  const stats = data.liveStats;
  const showForm = editing || !existing;

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl">Weekly review</h2>
          <p className="text-xs text-muted-foreground">Week of {formatWeek(data.weekStart)}</p>
        </div>
        {existing && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <PencilLine className="h-3 w-3" aria-hidden /> Edit
          </button>
        )}
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 text-center">
        <MiniStat label="Sessions" value={stats.sessions} />
        <MiniStat label="Minutes" value={stats.minutes} />
        <MiniStat label="Avg focus" value={stats.avgFocus ? `${stats.avgFocus}` : "—"} />
      </div>

      {showForm ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate({ wentWell, nextFocus }, { onSuccess: () => setEditing(false) });
          }}
        >
          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">What went well?</span>
            <textarea
              value={wentWell}
              onChange={(e) => setWentWell(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="One thing worth remembering…"
              className="w-full rounded-lg border border-border bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">
              What's your focus for next week?
            </span>
            <textarea
              value={nextFocus}
              onChange={(e) => setNextFocus(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="One thing to move forward…"
              className="w-full rounded-lg border border-border bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              <Check className="h-4 w-4" aria-hidden />
              {mutation.isPending ? "Saving…" : existing ? "Update" : "Save review"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="space-y-3 text-sm">
          {existing.went_well && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Went well</p>
              <p className="mt-1 text-foreground">{existing.went_well}</p>
            </div>
          )}
          {existing.next_focus && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Next focus</p>
              <p className="mt-1 text-foreground">{existing.next_focus}</p>
            </div>
          )}
        </div>
      )}

      {data.history.length > 1 && (
        <details className="mt-4 border-t border-border pt-3 text-sm">
          <summary className="cursor-pointer text-xs uppercase tracking-wide text-muted-foreground">
            Past reviews
          </summary>
          <ul className="mt-3 space-y-3">
            {data.history
              .filter((h) => h.week_start !== data.weekStart)
              .map((h) => (
                <li key={h.id} className="border-l-2 border-primary/30 pl-3">
                  <p className="text-xs text-muted-foreground">{formatWeek(h.week_start)}</p>
                  {h.went_well && <p className="mt-1 text-foreground">{h.went_well}</p>}
                  {h.next_focus && <p className="mt-1 text-muted-foreground">→ {h.next_focus}</p>}
                </li>
              ))}
          </ul>
        </details>
      )}
    </section>
  );
}

const PULSE_FIELDS = [
  { key: "energy", label: "Energy" },
  { key: "motivation", label: "Motivation" },
  { key: "clarity", label: "Clarity" },
  { key: "progress", label: "Progress" },
  { key: "balance", label: "Balance" },
  { key: "confidence", label: "Confidence" },
] as const;

type PulseKey = (typeof PULSE_FIELDS)[number]["key"];
type PulseValues = Record<PulseKey, number>;

const DEFAULT_PULSE: PulseValues = {
  energy: 5,
  motivation: 5,
  clarity: 5,
  progress: 5,
  balance: 5,
  confidence: 5,
};

export function MonthlyPulseCard() {
  const { data } = useQuery(pulsesQueryOptions());
  const qc = useQueryClient();
  const save = useServerFn(savePulse);
  const mutation = useMutation({
    mutationFn: (input: PulseValues & { note: string }) => save({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pulses"] }),
  });

  const existing = data?.current;
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<PulseValues>(DEFAULT_PULSE);
  const [note, setNote] = useState("");
  // Re-sync form state only when the pulse identity changes, not on every
  // refetch — a background refetch must not clobber in-progress edits.
  const syncedPulseId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (syncedPulseId.current === (existing?.id ?? null)) return;
    syncedPulseId.current = existing?.id ?? null;
    if (existing) {
      setValues({
        energy: existing.energy,
        motivation: existing.motivation,
        clarity: existing.clarity,
        progress: existing.progress,
        balance: existing.balance,
        confidence: existing.confidence,
      });
      setNote(existing.note ?? "");
    } else {
      setValues(DEFAULT_PULSE);
      setNote("");
    }
  }, [existing]);

  const trend = useMemo(() => {
    if (!data) return [];
    return data.history.map((p) => ({
      month: p.month_start,
      avg:
        Math.round(
          ((p.energy + p.motivation + p.clarity + p.progress + p.balance + p.confidence) / 6) * 10,
        ) / 10,
    }));
  }, [data]);

  if (!data) return null;
  const showForm = editing || !existing;

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl">Monthly pulse</h2>
          <p className="text-xs text-muted-foreground">{formatMonth(data.monthStart)}</p>
        </div>
        {existing && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <PencilLine className="h-3 w-3" aria-hidden /> Edit
          </button>
        )}
      </div>

      {showForm ? (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate({ ...values, note }, { onSuccess: () => setEditing(false) });
          }}
        >
          {PULSE_FIELDS.map((f) => (
            <label key={f.key} className="block text-sm">
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-foreground">{f.label}</span>
                <span className="tabular-nums text-muted-foreground">{values[f.key]} / 10</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={values[f.key]}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: Number(e.target.value) }))}
                className="w-full accent-[color:var(--primary)]"
                aria-label={f.label}
              />
            </label>
          ))}
          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">
              Anything on your mind? (optional)
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={2}
              className="w-full rounded-lg border border-border bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              <Check className="h-4 w-4" aria-hidden />
              {mutation.isPending ? "Saving…" : existing ? "Update pulse" : "Save pulse"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="space-y-2">
          {PULSE_FIELDS.map((f) => {
            const v = (existing as unknown as PulseValues)[f.key];
            const pct = (v / 10) * 100;
            return (
              <div key={f.key}>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span className="text-foreground">{f.label}</span>
                  <span className="tabular-nums text-muted-foreground">{v}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
          {existing.note && <p className="pt-2 text-sm text-muted-foreground">"{existing.note}"</p>}
        </div>
      )}

      {trend.length > 1 && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
            Trend (avg / 10)
          </p>
          <div className="flex items-end gap-1.5">
            {trend.map((t) => (
              <div key={t.month} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-16 w-full items-end">
                  <div
                    className="w-full rounded-t bg-primary/70"
                    style={{ height: `${(t.avg / 10) * 100}%` }}
                    title={`${formatMonth(t.month)}: ${t.avg}`}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(t.month + "T00:00:00").toLocaleDateString(undefined, {
                    month: "short",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
