import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus, Archive, Trash2, Target } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { goalsQueryOptions } from "@/lib/planner-queries";
import {
  createGoal,
  deleteGoal,
  updateGoal,
} from "@/lib/goals.functions";

export const Route = createFileRoute("/_authenticated/goals")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(goalsQueryOptions());
  },
  head: () => ({
    meta: [
      { title: "Goals — Gobez" },
      {
        name: "description",
        content:
          "Up to three things you're working toward, with progress that tracks itself.",
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
  component: GoalsPage,
});

const COLORS = [
  { id: "terracotta", swatch: "bg-primary" },
  { id: "forest", swatch: "bg-success" },
  { id: "mustard", swatch: "bg-warning" },
] as const;

function GoalsPage() {
  const qc = useQueryClient();
  const { data: goals = [] } = useQuery(goalsQueryOptions());
  const [showForm, setShowForm] = useState(false);

  const createFn = useServerFn(createGoal);
  const updateFn = useServerFn(updateGoal);
  const deleteFn = useServerFn(deleteGoal);

  const active = goals.filter((g) => g.status === "active");
  const archived = goals.filter((g) => g.status !== "active");

  const create = useMutation({
    mutationFn: (payload: {
      title: string;
      description?: string;
      deadline?: string | null;
      color: string;
    }) => createFn({ data: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      setShowForm(false);
    },
  });

  const archive = useMutation({
    mutationFn: (id: string) =>
      updateFn({ data: { id, patch: { status: "archived" } } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });

  const restore = useMutation({
    mutationFn: (id: string) =>
      updateFn({ data: { id, patch: { status: "active" } } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });

  return (
    <AppShell>
      <div className="space-y-8">
        <header className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-serif text-3xl md:text-4xl text-foreground">Goals</h1>
            <p className="text-sm text-muted-foreground">
              Pick up to three things you're working toward. Sessions you tag
              will count toward them automatically.
            </p>
          </div>
          <button
            onClick={() => setShowForm((s) => !s)}
            disabled={active.length >= 3 && !showForm}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="h-4 w-4" aria-hidden />
            New goal
          </button>
        </header>

        {active.length >= 3 && (
          <p className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            You've got three active goals — the sweet spot. Archive one to add
            another.
          </p>
        )}

        {showForm && (
          <GoalForm
            onCancel={() => setShowForm(false)}
            onSubmit={(v) => create.mutate(v)}
            pending={create.isPending}
            error={create.error ? (create.error as Error).message : null}
          />
        )}

        {active.length === 0 && !showForm && (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center">
            <Target className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
            <p className="mt-3 font-serif text-lg">No goals yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Something like "understand transformers" or "read Middlemarch."
            </p>
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2">
          {active.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              onArchive={() => archive.mutate(g.id)}
              onDelete={() => remove.mutate(g.id)}
            />
          ))}
        </section>

        {archived.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Archived
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {archived.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-card/60 p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{g.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {g.stats.sessions} sessions · {g.stats.minutes} min
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => restore.mutate(g.id)}
                      className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => remove.mutate(g.id)}
                      aria-label="Delete goal"
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function GoalCard({
  goal,
  onArchive,
  onDelete,
}: {
  goal: {
    id: string;
    title: string;
    description: string | null;
    deadline: string | null;
    color: string;
    stats: { sessions: number; minutes: number };
  };
  onArchive: () => void;
  onDelete: () => void;
}) {
  const daysLeft = goal.deadline
    ? Math.ceil(
        (new Date(goal.deadline).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
      )
    : null;
  const swatch =
    COLORS.find((c) => c.id === goal.color)?.swatch ?? "bg-primary";

  return (
    <article className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm">
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-1 ${swatch}`}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-serif text-xl leading-snug">{goal.title}</h3>
          {goal.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {goal.description}
            </p>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={onArchive}
            aria-label="Archive goal"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Archive className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            aria-label="Delete goal"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>{goal.stats.sessions} sessions</span>
        <span>{goal.stats.minutes} focus min</span>
        {daysLeft !== null && (
          <span
            className={
              daysLeft <= 7 && daysLeft >= 0
                ? "font-medium text-primary"
                : ""
            }
          >
            {daysLeft < 0
              ? `${-daysLeft}d past deadline`
              : daysLeft === 0
                ? "due today"
                : `${daysLeft}d left`}
          </span>
        )}
      </div>
    </article>
  );
}

function GoalForm({
  onCancel,
  onSubmit,
  pending,
  error,
}: {
  onCancel: () => void;
  onSubmit: (v: {
    title: string;
    description?: string;
    deadline?: string | null;
    color: string;
  }) => void;
  pending: boolean;
  error: string | null;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [color, setColor] = useState<string>("terracotta");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onSubmit({
          title: title.trim(),
          description: description.trim() || undefined,
          deadline: deadline || null,
          color,
        });
      }}
      className="space-y-4 rounded-2xl border border-border bg-card p-5"
    >
      <div>
        <label className="mb-1 block text-sm font-medium">Goal</label>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Understand linear algebra"
          maxLength={120}
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Phrase it as mastery, not a task. "Understand X" beats "finish X."
        </p>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">
          Why (optional)
        </label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Deadline (optional)
          </label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Color</label>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-label={c.id}
                aria-pressed={color === c.id}
                onClick={() => setColor(c.id)}
                className={`h-9 w-9 rounded-full ${c.swatch} ring-offset-2 ring-offset-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  color === c.id ? "ring-2 ring-ring" : ""
                }`}
              />
            ))}
          </div>
        </div>
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
          className="flex-[2] rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {pending ? "Saving…" : "Add goal"}
        </button>
      </div>
    </form>
  );
}
