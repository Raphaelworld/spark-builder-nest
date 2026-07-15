import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Plus, Trash2, Play, Download } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  goalsQueryOptions,
  plannedBlocksQueryOptions,
} from "@/lib/planner-queries";
import {
  createPlannedBlock,
  deletePlannedBlock,
} from "@/lib/planner.functions";
import { TECHNIQUES, type TechniqueId } from "@/lib/techniques";

export const Route = createFileRoute("/_authenticated/planner")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(plannedBlocksQueryOptions());
    context.queryClient.ensureQueryData(goalsQueryOptions());
  },
  head: () => ({
    meta: [
      { title: "Planner — Gobez" },
      {
        name: "description",
        content: "Place study blocks on your week and start sessions from them.",
      },
    ],
  }),
  errorComponent: ({ error }) => (
    <AppShell>
      <p role="alert" className="text-destructive">
        {error.message}
      </p>
    </AppShell>
  ),
  component: PlannerPage,
});

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
// Grid runs 6:00 -> 22:00 in 30 minute rows.
const START_HOUR = 6;
const END_HOUR = 22;
const ROW_MINUTES = 30;
const TOTAL_ROWS = ((END_HOUR - START_HOUR) * 60) / ROW_MINUTES;
const ROW_PX = 28;

function fmt(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? "pm" : "am";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2, "0")}${ampm}`;
}

// Map JS Date.getDay() (0=Sun) → our 0..6 Mon..Sun index
function jsDayToIdx(d: number) {
  return (d + 6) % 7;
}

function PlannerPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: blocks = [] } = useQuery(plannedBlocksQueryOptions());
  const { data: goals = [] } = useQuery(goalsQueryOptions());
  const activeGoals = goals.filter((g) => g.status === "active");
  const [draft, setDraft] = useState<{
    day: number;
    startMin: number;
  } | null>(null);

  const createFn = useServerFn(createPlannedBlock);
  const deleteFn = useServerFn(deletePlannedBlock);

  const create = useMutation({
    mutationFn: (payload: {
      title: string;
      goal_id: string | null;
      day_of_week: number;
      start_minute: number;
      end_minute: number;
      planned_minutes: number;
      technique: TechniqueId;
    }) => createFn({ data: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plannedBlocks"] });
      setDraft(null);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plannedBlocks"] }),
  });

  const todayIdx = jsDayToIdx(new Date().getDay());
  const totalPlanned = useMemo(
    () => blocks.reduce((s, b) => s + b.planned_minutes, 0),
    [blocks],
  );

  function exportIcs() {
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Gobez//Planner//EN",
    ];
    const now = new Date();
    // Start of ISO week (Mon)
    const monday = new Date(now);
    monday.setDate(now.getDate() - jsDayToIdx(now.getDay()));
    monday.setHours(0, 0, 0, 0);
    for (const b of blocks) {
      const start = new Date(monday);
      start.setDate(monday.getDate() + b.day_of_week);
      start.setMinutes(b.start_minute);
      const end = new Date(start);
      end.setMinutes(start.getMinutes() + b.planned_minutes);
      const fmtDt = (d: Date) =>
        d
          .toISOString()
          .replace(/[-:]/g, "")
          .replace(/\.\d{3}/, "");
      lines.push(
        "BEGIN:VEVENT",
        `UID:${b.id}@gobez`,
        `DTSTAMP:${fmtDt(now)}`,
        `DTSTART:${fmtDt(start)}`,
        `DTEND:${fmtDt(end)}`,
        `SUMMARY:${b.title.replace(/[,;\n]/g, " ")}`,
        "END:VEVENT",
      );
    }
    lines.push("END:VCALENDAR");
    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gobez-week.ics";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl md:text-4xl">Planner</h1>
            <p className="text-sm text-muted-foreground">
              Tap a slot to plan a block. Start a session from it when the time
              comes.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">
              {totalPlanned} min planned this week
            </span>
            <button
              onClick={exportIcs}
              disabled={blocks.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Download className="h-3.5 w-3.5" aria-hidden /> Export .ics
            </button>
          </div>
        </header>

        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <div className="min-w-[720px]">
            {/* Day headers */}
            <div className="grid grid-cols-[3rem_repeat(7,minmax(0,1fr))] border-b border-border">
              <div />
              {DAYS.map((d, i) => (
                <div
                  key={d}
                  className={`px-2 py-2 text-center text-xs font-medium ${
                    i === todayIdx ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Grid body */}
            <div className="relative grid grid-cols-[3rem_repeat(7,minmax(0,1fr))]">
              {/* time labels */}
              <div>
                {Array.from({ length: END_HOUR - START_HOUR }).map((_, h) => (
                  <div
                    key={h}
                    style={{ height: ROW_PX * 2 }}
                    className="border-b border-border pr-1 pt-0.5 text-right text-[10px] text-muted-foreground"
                  >
                    {fmt((START_HOUR + h) * 60)}
                  </div>
                ))}
              </div>

              {DAYS.map((_, dayIdx) => (
                <div
                  key={dayIdx}
                  className="relative border-l border-border"
                  style={{ height: ROW_PX * TOTAL_ROWS }}
                >
                  {/* row grid lines and click targets */}
                  {Array.from({ length: TOTAL_ROWS }).map((_, r) => {
                    const startMin = START_HOUR * 60 + r * ROW_MINUTES;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() =>
                          setDraft({ day: dayIdx, startMin })
                        }
                        aria-label={`Add block on ${DAYS[dayIdx]} at ${fmt(startMin)}`}
                        className={`block w-full border-b border-border/60 transition-colors hover:bg-primary/5 ${
                          r % 2 === 1 ? "border-border" : "border-border/50"
                        }`}
                        style={{ height: ROW_PX }}
                      />
                    );
                  })}

                  {/* rendered blocks */}
                  {blocks
                    .filter((b) => b.day_of_week === dayIdx)
                    .map((b) => {
                      const top =
                        ((b.start_minute - START_HOUR * 60) / ROW_MINUTES) *
                        ROW_PX;
                      const height = Math.max(
                        ROW_PX - 2,
                        (b.planned_minutes / ROW_MINUTES) * ROW_PX - 2,
                      );
                      const goal = goals.find((g) => g.id === b.goal_id);
                      return (
                        <div
                          key={b.id}
                          style={{ top, height }}
                          className="absolute inset-x-1 rounded-md border border-primary/40 bg-primary/10 p-1.5 text-[11px] shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <p className="line-clamp-2 font-medium text-foreground">
                              {b.title}
                            </p>
                            <div className="flex shrink-0 gap-0.5">
                              <button
                                onClick={() =>
                                  navigate({
                                    to: "/session",
                                    search: {
                                      task: b.title,
                                      technique: b.technique as TechniqueId,
                                      minutes: b.planned_minutes,
                                      goal_id: b.goal_id ?? undefined,
                                    } as never,
                                  })
                                }
                                aria-label="Start session"
                                className="rounded p-0.5 text-primary hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                              >
                                <Play className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => remove.mutate(b.id)}
                                aria-label="Delete block"
                                className="rounded p-0.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                          {goal && (
                            <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                              {goal.title}
                            </p>
                          )}
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {fmt(b.start_minute)} · {b.planned_minutes}m
                          </p>
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {draft && (
          <BlockForm
            day={draft.day}
            startMin={draft.startMin}
            goals={activeGoals}
            onCancel={() => setDraft(null)}
            pending={create.isPending}
            error={create.error ? (create.error as Error).message : null}
            onSubmit={(v) =>
              create.mutate({
                title: v.title,
                goal_id: v.goal_id,
                day_of_week: draft.day,
                start_minute: draft.startMin,
                end_minute: draft.startMin + v.planned_minutes,
                planned_minutes: v.planned_minutes,
                technique: v.technique,
              })
            }
          />
        )}
      </div>
    </AppShell>
  );
}

function BlockForm({
  day,
  startMin,
  goals,
  onCancel,
  onSubmit,
  pending,
  error,
}: {
  day: number;
  startMin: number;
  goals: Array<{ id: string; title: string; color: string }>;
  onCancel: () => void;
  onSubmit: (v: {
    title: string;
    goal_id: string | null;
    planned_minutes: number;
    technique: TechniqueId;
  }) => void;
  pending: boolean;
  error: string | null;
}) {
  const [title, setTitle] = useState("");
  const [goalId, setGoalId] = useState<string | "">("");
  const [technique, setTechnique] = useState<TechniqueId>("pomodoro");
  const [minutes, setMinutes] = useState(TECHNIQUES.pomodoro.defaultMinutes);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 p-4 backdrop-blur md:items-center"
      role="dialog"
      aria-label="Plan a block"
      onClick={onCancel}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          onSubmit({
            title: title.trim(),
            goal_id: goalId || null,
            planned_minutes: minutes,
            technique,
          });
        }}
        className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-5 shadow-lg"
      >
        <div>
          <p className="font-serif text-xl">Plan a block</p>
          <p className="text-xs text-muted-foreground">
            {DAYS[day]} · {fmt(startMin)}
          </p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">What</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Problem set 4"
            maxLength={120}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {goals.length > 0 && (
          <div>
            <label className="mb-1 block text-sm font-medium">
              Goal (optional)
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setGoalId("")}
                className={`rounded-full border px-3 py-1 text-xs ${
                  !goalId
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background hover:bg-accent"
                }`}
              >
                None
              </button>
              {goals.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGoalId(g.id)}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    goalId === g.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background hover:bg-accent"
                  }`}
                >
                  {g.title}
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium">Technique</label>
          <div className="grid grid-cols-3 gap-2">
            {Object.values(TECHNIQUES).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTechnique(t.id);
                  setMinutes(t.defaultMinutes);
                }}
                className={`rounded-lg border px-2 py-2 text-xs ${
                  technique === t.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background hover:bg-accent"
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-sm font-medium">Duration</span>
            <span className="text-sm text-muted-foreground">{minutes} min</span>
          </div>
          <input
            type="range"
            min={15}
            max={120}
            step={5}
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className="w-full accent-[color:var(--primary)]"
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim() || pending}
            className="flex-[2] inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="h-4 w-4" aria-hidden />
            {pending ? "Adding…" : "Add to week"}
          </button>
        </div>
      </form>
    </div>
  );
}
