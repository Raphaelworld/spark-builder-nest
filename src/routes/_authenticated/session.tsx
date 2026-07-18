import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, X, Pause, Play, Plus, Coffee } from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/app-shell";
import { TECHNIQUES, activeElapsedMs, remainingMs, type TechniqueId } from "@/lib/techniques";
import { activeSessionQueryOptions, todaySummaryQueryOptions } from "@/lib/session-queries";
import { goalsQueryOptions } from "@/lib/planner-queries";
import { profileQueryOptions } from "@/lib/profile-queries";
import {
  abandonSession,
  addCheckin,
  completeSession,
  extendSession,
  pauseSession,
  resumeSession,
  startSession,
} from "@/lib/sessions.functions";
import { CheckinDialog, type CheckinResult } from "@/components/session/checkin-dialog";
import { ReframeMoment, StuckComposer } from "@/components/session/coach-moments";
import { AbandonDialog } from "@/components/session/abandon-dialog";
import { PreflightChecklist } from "@/components/session/preflight";
import { CalmPlanStep } from "@/components/session/calm-step";

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
    context.queryClient.ensureQueryData(profileQueryOptions());
    context.queryClient.ensureQueryData(todaySummaryQueryOptions());
  },
  head: () => ({ meta: [{ title: "Focus session — Gobez" }] }),
  errorComponent: ({ error }) => (
    <AppShell>
      <p role="alert" className="text-destructive">
        {error.message}
      </p>
    </AppShell>
  ),
  component: SessionPage,
});

type ActiveSession = {
  id: string;
  task: string;
  technique: TechniqueId;
  planned_minutes: number;
  started_at: string;
  exam_mode: boolean;
  paused_at: string | null;
  paused_ms: number;
};

function useTicker(session: ActiveSession | null) {
  const [now, setNow] = useState(() => Date.now());
  const paused = !!session?.paused_at;
  useEffect(() => {
    if (!session || paused) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [session, paused]);
  return useMemo(() => {
    if (!session) return { mmss: "00:00", pct: 0, done: false, elapsedMin: 0 };
    const total = session.planned_minutes * 60_000;
    const elapsed = Math.min(total, activeElapsedMs(session, now));
    const remaining = remainingMs(session, now);
    const totalSec = Math.floor(remaining / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return {
      mmss: `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
      pct: total > 0 ? (elapsed / total) * 100 : 0,
      done: remaining === 0,
      elapsedMin: elapsed / 60_000,
    };
  }, [now, session]);
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
        paused_at: active.paused_at ?? null,
        paused_ms: active.paused_ms ?? 0,
      }}
    />
  );
}

function SetupView() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const search = Route.useSearch();
  const { data: goals = [] } = useQuery(goalsQueryOptions());
  const { data: profile } = useQuery(profileQueryOptions());
  const { data: summary } = useQuery(todaySummaryQueryOptions());
  const activeGoals = goals.filter((g) => g.status === "active");
  const start = useServerFn(startSession);

  const profileTechnique =
    profile?.default_technique && profile.default_technique in TECHNIQUES
      ? (profile.default_technique as TechniqueId)
      : "pomodoro";

  const [task, setTask] = useState(search.task ?? "");
  const [technique, setTechnique] = useState<TechniqueId>(search.technique ?? profileTechnique);
  const [minutes, setMinutes] = useState(
    search.minutes ?? profile?.default_duration ?? TECHNIQUES.pomodoro.defaultMinutes,
  );
  // Apply onboarding defaults once the profile arrives, unless the user (or a
  // planner block via URL params) already chose.
  const touched = useRef({ technique: !!search.technique, minutes: !!search.minutes });
  useEffect(() => {
    if (!profile) return;
    if (!touched.current.technique) setTechnique(profileTechnique);
    if (!touched.current.minutes && profile.default_duration) {
      setMinutes(profile.default_duration);
    }
  }, [profile, profileTechnique]);

  const [goalId, setGoalId] = useState<string | "">(search.goal_id ?? "");
  const selectedGoal = activeGoals.find((g) => g.id === goalId);
  const deadlineSoon =
    !!selectedGoal?.deadline &&
    (new Date(selectedGoal.deadline).getTime() - Date.now()) / (24 * 60 * 60 * 1000) <= 7;
  const [examMode, setExamMode] = useState(false);
  useEffect(() => {
    setExamMode(deadlineSoon);
  }, [deadlineSoon]);

  const [stage, setStage] = useState<"setup" | "calm">("setup");

  const recentTasks = (summary?.recentTasks ?? []).filter(
    (t) => t.toLowerCase() !== task.trim().toLowerCase(),
  );

  const m = useMutation({
    mutationFn: () =>
      start({
        data: {
          task: task.trim(),
          technique,
          planned_minutes: minutes,
          exam_mode: examMode,
          goal_id: goalId || null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activeSession"] });
    },
  });

  const begin = () => {
    if (examMode) setStage("calm");
    else m.mutate();
  };

  if (stage === "calm") {
    return (
      <AppShell>
        <CalmPlanStep
          task={task.trim()}
          pending={m.isPending}
          onStart={() => m.mutate()}
          onBack={() => setStage("setup")}
        />
        {m.error ? (
          <p role="alert" className="mt-4 text-center text-sm text-destructive">
            {(m.error as Error).message}
          </p>
        ) : null}
      </AppShell>
    );
  }

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
            {recentTasks.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {recentTasks.slice(0, 4).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTask(t)}
                    className="max-w-full truncate rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {summary?.lastNote && (
            <div className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-primary">From your last wrap-up</p>
              <p className="mt-0.5 text-sm text-foreground">"{summary.lastNote}"</p>
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-medium">Technique</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {Object.values(TECHNIQUES).map((t) => {
                const selected = technique === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      touched.current.technique = true;
                      touched.current.minutes = true;
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

          {activeGoals.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium">
                Goal <span className="text-muted-foreground">(optional)</span>
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setGoalId("")}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    !goalId
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card hover:bg-accent"
                  }`}
                >
                  None
                </button>
                {activeGoals.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGoalId(g.id)}
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      goalId === g.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card hover:bg-accent"
                    }`}
                  >
                    {g.title}
                  </button>
                ))}
              </div>
            </div>
          )}

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
              onChange={(e) => {
                touched.current.minutes = true;
                setMinutes(Number(e.target.value));
              }}
              className="w-full accent-[color:var(--primary)]"
              aria-label="Session duration in minutes"
            />
          </div>

          <PreflightChecklist />

          {deadlineSoon && (
            <label className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              <input
                type="checkbox"
                checked={examMode}
                onChange={(e) => setExamMode(e.target.checked)}
                className="h-4 w-4 accent-[color:var(--primary)]"
              />
              <span className="text-sm">
                <span className="font-medium">Exam mode</span>
                <span className="ml-2 text-muted-foreground">
                  A brief calm-and-plan step before the timer starts
                </span>
                <span className="mt-1 block text-xs text-primary">
                  Your deadline is within a week — we turned this on for you.
                </span>
              </span>
            </label>
          )}

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
              onClick={begin}
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

// ---- prompt bookkeeping (survives refresh; auto check-ins fire once each) ----

type PromptLog = { checkins: number[]; breaks: number[] };

function loadPromptLog(sessionId: string): PromptLog {
  try {
    const raw = localStorage.getItem(`gobez-prompts-${sessionId}`);
    if (raw) return JSON.parse(raw) as PromptLog;
  } catch {
    // fall through
  }
  return { checkins: [], breaks: [] };
}

function savePromptLog(sessionId: string, log: PromptLog) {
  try {
    localStorage.setItem(`gobez-prompts-${sessionId}`, JSON.stringify(log));
  } catch {
    // storage unavailable — prompts may repeat after refresh, which is fine
  }
}

function FocusView({ session }: { session: ActiveSession }) {
  const qc = useQueryClient();
  const { mmss, pct, done, elapsedMin } = useTicker(session);
  const paused = !!session.paused_at;
  const [stage, setStage] = useState<"focus" | "wrap">("focus");
  const [checkinOpen, setCheckinOpen] = useState<null | { auto: boolean }>(null);
  const [showStuck, setShowStuck] = useState(false);
  const [showReframe, setShowReframe] = useState(false);
  const [showAbandon, setShowAbandon] = useState(false);
  const [breakUntilMin, setBreakUntilMin] = useState<number | null>(null);

  const checkinFn = useServerFn(addCheckin);
  const pauseFn = useServerFn(pauseSession);
  const resumeFn = useServerFn(resumeSession);
  const extendFn = useServerFn(extendSession);
  const abandonFn = useServerFn(abandonSession);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["activeSession"] });

  const checkin = useMutation({
    mutationFn: (payload: CheckinResult) =>
      checkinFn({ data: { session_id: session.id, ...payload } }),
  });
  const pause = useMutation({
    mutationFn: () => pauseFn({ data: { session_id: session.id } }),
    onSuccess: invalidate,
  });
  const resume = useMutation({
    mutationFn: () => resumeFn({ data: { session_id: session.id } }),
    onSuccess: invalidate,
  });
  const extend = useMutation({
    mutationFn: () => extendFn({ data: { session_id: session.id, minutes: 5 } }),
    onSuccess: invalidate,
  });

  useEffect(() => {
    if (done && stage === "focus") setStage("wrap");
  }, [done, stage]);

  // Auto check-ins at interval midpoints; break prompts at interval boundaries
  // (PRD §4.2). Prompt history is persisted per session so refresh doesn't re-ask.
  const technique = TECHNIQUES[session.technique] ?? TECHNIQUES.pomodoro;
  const dialogOpen =
    !!checkinOpen || showStuck || showReframe || showAbandon || breakUntilMin !== null;
  useEffect(() => {
    if (stage !== "focus" || paused || done || dialogOpen) return;
    const interval = technique.intervalMinutes;
    const log = loadPromptLog(session.id);

    for (let k = 0; k * interval + interval / 2 < session.planned_minutes; k++) {
      const midpoint = k * interval + interval / 2;
      if (elapsedMin >= midpoint && !log.checkins.includes(midpoint)) {
        savePromptLog(session.id, { ...log, checkins: [...log.checkins, midpoint] });
        setCheckinOpen({ auto: true });
        return;
      }
    }
    for (let k = 1; k * interval < session.planned_minutes; k++) {
      const boundary = k * interval;
      if (elapsedMin >= boundary && !log.breaks.includes(boundary)) {
        savePromptLog(session.id, { ...log, breaks: [...log.breaks, boundary] });
        setBreakUntilMin(boundary);
        return;
      }
    }
  }, [
    elapsedMin,
    stage,
    paused,
    done,
    dialogOpen,
    session.id,
    session.planned_minutes,
    technique.intervalMinutes,
  ]);

  const submitCheckin = (r: CheckinResult) => {
    checkin.mutate(r, {
      onSettled: () => {
        setCheckinOpen(null);
        if (r.kind !== "stuck" && r.confidence <= 2) setShowReframe(true);
      },
    });
  };

  const goStuck = () => {
    checkin.mutate({ confidence: 1, kind: "stuck" });
    setCheckinOpen(null);
    setShowStuck(true);
  };

  const abandon = useMutation({
    mutationFn: (reason: string) => abandonFn({ data: { session_id: session.id, reason } }),
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["todaySummary"] });
    },
  });
  const navigate = useNavigate();

  if (stage === "wrap") return <WrapupView session={session} />;

  const minutesLeft = Math.ceil(remainingMs(session, Date.now()) / 60_000);

  return (
    <AppShell>
      <div className="mx-auto flex max-w-lg flex-col items-center gap-8 py-8">
        <p aria-live="polite" className="sr-only">
          {paused
            ? "Timer paused"
            : `${minutesLeft} minute${minutesLeft === 1 ? "" : "s"} remaining`}
        </p>
        <div className="text-center">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{technique.name}</p>
          <h1 className="mt-1 font-serif text-2xl md:text-3xl">{session.task}</h1>
        </div>

        <div className="relative flex h-64 w-64 items-center justify-center md:h-80 md:w-80">
          <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
            <circle cx="50" cy="50" r="45" fill="none" stroke="var(--muted)" strokeWidth="4" />
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
              {paused ? "paused" : "remaining"}
            </p>
          </div>
        </div>

        <div className="flex w-full items-center justify-center gap-3">
          <button
            onClick={() => (paused ? resume.mutate() : pause.mutate())}
            disabled={pause.isPending || resume.isPending}
            className="flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {paused ? (
              <>
                <Play className="h-4 w-4" aria-hidden />
                Resume
              </>
            ) : (
              <>
                <Pause className="h-4 w-4" aria-hidden />
                Pause
              </>
            )}
          </button>
          <button
            onClick={() => extend.mutate()}
            disabled={extend.isPending}
            className="flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="h-4 w-4" aria-hidden />5 min
          </button>
        </div>

        <div className="flex w-full flex-col gap-3">
          <button
            onClick={() => setCheckinOpen({ auto: false })}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Quick check-in
          </button>
          <button
            onClick={() => setStage("wrap")}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Check className="mr-1 inline h-4 w-4" aria-hidden />
            Finish & wrap up
          </button>
          <button
            onClick={() => setShowAbandon(true)}
            className="w-full rounded-xl px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="mr-1 inline h-3.5 w-3.5" aria-hidden />
            End early
          </button>
        </div>

        {checkinOpen && (
          <CheckinDialog
            auto={checkinOpen.auto}
            pending={checkin.isPending}
            onSubmit={submitCheckin}
            onStuck={goStuck}
            onClose={() => setCheckinOpen(null)}
          />
        )}
        {showStuck && <StuckComposer task={session.task} onClose={() => setShowStuck(false)} />}
        {showReframe && <ReframeMoment onClose={() => setShowReframe(false)} />}
        {showAbandon && (
          <AbandonDialog
            pending={abandon.isPending}
            onPick={(reason) =>
              abandon.mutate(reason, {
                onSuccess: () => navigate({ to: "/today" }),
              })
            }
            onClose={() => setShowAbandon(false)}
          />
        )}
        {breakUntilMin !== null && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 p-4 backdrop-blur md:items-center"
            role="dialog"
            aria-modal="true"
            aria-label="Break time"
            onClick={() => setBreakUntilMin(null)}
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <Coffee className="mx-auto h-6 w-6 text-primary" aria-hidden />
              <p className="mt-2 font-serif text-lg">Break time</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {technique.breakMinutes} minutes away from the screen. Stand up, stretch, sip some
                water.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => {
                    pause.mutate();
                    setBreakUntilMin(null);
                  }}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Pause for break
                </button>
                <button
                  onClick={() => setBreakUntilMin(null)}
                  className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Keep going
                </button>
              </div>
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
  const [showAbandon, setShowAbandon] = useState(false);
  const [showReframe, setShowReframe] = useState(false);
  const chips = TECHNIQUES[session.technique]?.chips ?? [];

  const toggle = (arr: string[], setArr: (v: string[]) => void, tag: string) => {
    setArr(arr.includes(tag) ? arr.filter((t) => t !== tag) : [...arr, tag]);
  };

  const finish = () => {
    qc.invalidateQueries({ queryKey: ["activeSession"] });
    qc.invalidateQueries({ queryKey: ["todaySummary"] });
    navigate({ to: "/today" });
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
      // A rough session earns a reframe offer before heading home (PRD F5).
      if ((rating ?? 3) <= 2) setShowReframe(true);
      else finish();
    },
  });

  const abandon = useMutation({
    mutationFn: (reason: string) => abandonFn({ data: { session_id: session.id, reason } }),
    onSuccess: finish,
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
            onClick={() => setShowAbandon(true)}
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

      {showAbandon && (
        <AbandonDialog
          pending={abandon.isPending}
          onPick={(reason) => abandon.mutate(reason)}
          onClose={() => setShowAbandon(false)}
        />
      )}
      {showReframe && (
        <ReframeMoment
          onClose={() => {
            setShowReframe(false);
            finish();
          }}
        />
      )}
    </AppShell>
  );
}
