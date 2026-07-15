import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Check, X, Pause } from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/app-shell";
import { TECHNIQUES, type TechniqueId } from "@/lib/techniques";
import { activeSessionQueryOptions } from "@/lib/session-queries";
import { goalsQueryOptions } from "@/lib/planner-queries";
import {
  abandonSession,
  addCheckin,
  completeSession,
  startSession,
} from "@/lib/sessions.functions";

const sessionSearch = z.object({
  task: z.string().optional(),
  technique: z.enum(["pomodoro", "deep_work", "active_recall"]).optional(),
  minutes: z.coerce.number().int().min(5).max(240).optional(),
  goal_id: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/session")({
  validateSearch: (s) => sessionSearch.parse(s),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(activeSessionQueryOptions());
    context.queryClient.ensureQueryData(goalsQueryOptions());
  },
  head: () => ({ meta: [{ title: "Focus session — Gobez" }] }),
  errorComponent: ({ error }) => (
    <AppShell>
      <p role="alert" className="text-destructive">{error.message}</p>
    </AppShell>
  ),
  component: SessionPage,
});

function useTicker(startedAt: string | null | undefined, plannedMinutes: number | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return useMemo(() => {
    if (!startedAt || !plannedMinutes) return { mmss: "00:00", pct: 0, done: false };
    const start = new Date(startedAt).getTime();
    const end = start + plannedMinutes * 60_000;
    const total = end - start;
    const elapsed = Math.min(total, Math.max(0, now - start));
    const remaining = Math.max(0, end - now);
    const totalSec = Math.floor(remaining / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return {
      mmss: `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
      pct: total > 0 ? (elapsed / total) * 100 : 0,
      done: remaining === 0,
    };
  }, [now, startedAt, plannedMinutes]);
}

function SessionPage() {
  const { data: active, isLoading } = useQuery(activeSessionQueryOptions());
  if (isLoading) {
    return (
      <AppShell>
        <p className="text-muted-foreground">Loading…</p>
      </AppShell>
    );
  }
  if (!active) return <SetupView />;
  return (
    <FocusView
      session={{
        id: active.id,
        task: active.task,
        technique: active.technique as TechniqueId,
        planned_minutes: active.planned_minutes,
        started_at: active.started_at,
        exam_mode: active.exam_mode,
      }}
    />
  );
}

function SetupView() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const start = useServerFn(startSession);
  const [task, setTask] = useState("");
  const [technique, setTechnique] = useState<TechniqueId>("pomodoro");
  const [minutes, setMinutes] = useState(TECHNIQUES.pomodoro.defaultMinutes);
  const [examMode, setExamMode] = useState(false);

  const m = useMutation({
    mutationFn: () =>
      start({ data: { task: task.trim(), technique, planned_minutes: minutes, exam_mode: examMode } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activeSession"] });
    },
  });

  return (
    <AppShell>
      <div className="space-y-8">
        <header>
          <h1 className="font-serif text-3xl md:text-4xl">Set an intention</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One thing at a time. Keep it small enough to actually start.
          </p>
        </header>

        <div className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium">What are you working on?</label>
            <input
              autoFocus
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="e.g. Draft the intro of chapter 3"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-ring"
              maxLength={200}
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Technique</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {(Object.values(TECHNIQUES)).map((t) => {
                const selected = technique === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTechnique(t.id);
                      setMinutes(t.defaultMinutes);
                    }}
                    className={`rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      selected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border bg-card hover:bg-accent"
                    }`}
                  >
                    <p className="font-serif text-lg">{t.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{t.hint}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <p className="text-sm font-medium">Duration</p>
              <p className="text-sm text-muted-foreground">{minutes} min</p>
            </div>
            <input
              type="range"
              min={5}
              max={90}
              step={5}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className="w-full accent-[color:var(--primary)]"
              aria-label="Session duration in minutes"
            />
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <input
              type="checkbox"
              checked={examMode}
              onChange={(e) => setExamMode(e.target.checked)}
              className="h-4 w-4 accent-[color:var(--primary)]"
            />
            <span className="text-sm">
              <span className="font-medium">Exam mode</span>
              <span className="ml-2 text-muted-foreground">Suppress check-ins and nudges</span>
            </span>
          </label>

          {m.error ? (
            <p role="alert" className="text-sm text-destructive">
              {(m.error as Error).message}
            </p>
          ) : null}

          <div className="flex gap-3">
            <button
              onClick={() => navigate({ to: "/today" })}
              className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Cancel
            </button>
            <button
              onClick={() => m.mutate()}
              disabled={!task.trim() || m.isPending}
              className="flex-[2] rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {m.isPending ? "Starting…" : "Begin focus"}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

type ActiveSession = {
  id: string;
  task: string;
  technique: TechniqueId;
  planned_minutes: number;
  started_at: string;
  exam_mode: boolean;
};

function FocusView({ session }: { session: ActiveSession }) {
  const { mmss, pct, done } = useTicker(session.started_at, session.planned_minutes);
  const [stage, setStage] = useState<"focus" | "wrap">("focus");
  const [showCheckin, setShowCheckin] = useState(false);
  const checkinFn = useServerFn(addCheckin);
  const checkin = useMutation({
    mutationFn: (payload: { confidence: number; note?: string; kind: "manual" | "stuck" }) =>
      checkinFn({ data: { session_id: session.id, ...payload } }),
  });

  useEffect(() => {
    if (done && stage === "focus") setStage("wrap");
  }, [done, stage]);

  if (stage === "wrap") return <WrapupView session={session} />;

  return (
    <AppShell>
      <div className="mx-auto flex max-w-lg flex-col items-center gap-8 py-8">
        <div className="text-center">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {TECHNIQUES[session.technique]?.name ?? "Focus"}
          </p>
          <h1 className="mt-1 font-serif text-2xl md:text-3xl">{session.task}</h1>
        </div>

        <div className="relative flex h-64 w-64 items-center justify-center md:h-80 md:w-80">
          <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="var(--muted)"
              strokeWidth="4"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${(pct / 100) * 2 * Math.PI * 45} ${2 * Math.PI * 45}`}
              className="transition-[stroke-dasharray] duration-1000 ease-linear"
            />
          </svg>
          <div className="text-center">
            <p className="font-serif text-5xl tabular-nums md:text-6xl">{mmss}</p>
            <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
              remaining
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3">
          {!session.exam_mode && (
            <button
              onClick={() => setShowCheckin(true)}
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Quick check-in
            </button>
          )}
          <button
            onClick={() => setStage("wrap")}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Check className="mr-1 inline h-4 w-4" aria-hidden />
            End & wrap up
          </button>
        </div>

        {showCheckin && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 p-4 backdrop-blur md:items-center"
            role="dialog"
            aria-label="Quick check-in"
            onClick={() => setShowCheckin(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-border bg-card p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="font-serif text-lg">How's it going?</p>
              <p className="mt-1 text-xs text-muted-foreground">Tap to rate your focus</p>
              <div className="mt-4 flex justify-between">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => {
                      checkin.mutate(
                        { confidence: n, kind: "manual" },
                        { onSettled: () => setShowCheckin(false) },
                      );
                    }}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-base font-medium hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  checkin.mutate(
                    { confidence: 1, kind: "stuck" },
                    { onSettled: () => setShowCheckin(false) },
                  );
                }}
                className="mt-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Pause className="mr-1 inline h-3.5 w-3.5" aria-hidden />I'm stuck
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function WrapupView({ session }: { session: ActiveSession }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const completeFn = useServerFn(completeSession);
  const abandonFn = useServerFn(abandonSession);
  const [rating, setRating] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [worked, setWorked] = useState<string[]>([]);
  const [didnt, setDidnt] = useState<string[]>([]);
  const chips = TECHNIQUES[session.technique]?.chips ?? [];

  const toggle = (arr: string[], setArr: (v: string[]) => void, tag: string) => {
    setArr(arr.includes(tag) ? arr.filter((t) => t !== tag) : [...arr, tag]);
  };

  const complete = useMutation({
    mutationFn: () =>
      completeFn({
        data: {
          session_id: session.id,
          focus_rating: rating ?? 3,
          next_time_note: note.trim() || undefined,
          worked,
          didnt,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activeSession"] });
      qc.invalidateQueries({ queryKey: ["todaySummary"] });
      navigate({ to: "/today" });
    },
  });

  const abandon = useMutation({
    mutationFn: () => abandonFn({ data: { session_id: session.id, reason: "user_ended" } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activeSession"] });
      navigate({ to: "/today" });
    },
  });

  return (
    <AppShell>
      <div className="space-y-8">
        <header>
          <p className="text-sm text-muted-foreground">Wrap-up</p>
          <h1 className="mt-1 font-serif text-3xl md:text-4xl">Nice work.</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A few seconds now makes next time easier.
          </p>
        </header>

        <section>
          <p className="mb-3 text-sm font-medium">How focused did you feel?</p>
          <div className="flex justify-between gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                aria-pressed={rating === n}
                className={`flex-1 rounded-xl border py-4 text-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  rating === n
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card hover:bg-accent"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </section>

        {chips.length > 0 && (
          <>
            <section>
              <p className="mb-3 text-sm font-medium">What worked?</p>
              <div className="flex flex-wrap gap-2">
                {chips.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggle(worked, setWorked, tag)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      worked.includes(tag)
                        ? "border-success bg-success/15 text-foreground"
                        : "border-border bg-card hover:bg-accent"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <p className="mb-3 text-sm font-medium">What got in the way?</p>
              <div className="flex flex-wrap gap-2">
                {chips.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggle(didnt, setDidnt, tag)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      didnt.includes(tag)
                        ? "border-destructive bg-destructive/10 text-foreground"
                        : "border-border bg-card hover:bg-accent"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        <section>
          <label className="mb-2 block text-sm font-medium">Note for next time</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="One small thing you'd change…"
            maxLength={200}
            rows={3}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </section>

        {complete.error ? (
          <p role="alert" className="text-sm text-destructive">
            {(complete.error as Error).message}
          </p>
        ) : null}

        <div className="flex gap-3">
          <button
            onClick={() => abandon.mutate()}
            disabled={abandon.isPending || complete.isPending}
            className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="mr-1 inline h-4 w-4" aria-hidden />
            Discard
          </button>
          <button
            onClick={() => complete.mutate()}
            disabled={rating === null || complete.isPending}
            className="flex-[2] rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {complete.isPending ? "Saving…" : "Save & finish"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
