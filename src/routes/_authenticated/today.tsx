import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Flame, Sparkles, Play, X } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import {
  activeSessionQueryOptions,
  todaySummaryQueryOptions,
} from "@/lib/session-queries";
import {
  goalsQueryOptions,
  plannedBlocksQueryOptions,
} from "@/lib/planner-queries";

export const Route = createFileRoute("/_authenticated/today")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(activeSessionQueryOptions());
    context.queryClient.ensureQueryData(todaySummaryQueryOptions());
    context.queryClient.ensureQueryData(goalsQueryOptions());
    context.queryClient.ensureQueryData(plannedBlocksQueryOptions());
  },
  head: () => ({
    meta: [{ title: "Today — Gobez" }],
  }),
  errorComponent: ({ error }) => (
    <AppShell>
      <p role="alert" className="text-destructive">
        {error.message}
      </p>
    </AppShell>
  ),
  component: TodayPage,
});

function TodayPage() {
  const [showCoach, setShowCoach] = useState(true);
  const navigate = useNavigate();
  const { data: active } = useQuery(activeSessionQueryOptions());
  const { data: summary } = useQuery(todaySummaryQueryOptions());
  const { data: goals = [] } = useQuery(goalsQueryOptions());
  const { data: blocks = [] } = useQuery(plannedBlocksQueryOptions());
  const activeGoals = goals.filter((g) => g.status === "active");
  const todayIdx = (new Date().getDay() + 6) % 7;
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const nextBlock =
    blocks
      .filter((b) => b.day_of_week === todayIdx && b.start_minute >= nowMin)
      .sort((a, b) => a.start_minute - b.start_minute)[0] ??
    blocks
      .filter((b) => b.day_of_week > todayIdx)
      .sort(
        (a, b) =>
          a.day_of_week - b.day_of_week || a.start_minute - b.start_minute,
      )[0];

  return (
    <AppShell>
      <div className="space-y-8">
        <header className="space-y-1">
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          <h1 className="font-serif text-4xl leading-tight text-foreground md:text-5xl">
            Ready to focus?
          </h1>
        </header>

        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/20 px-3 py-1.5 text-sm font-medium text-foreground">
            <Flame className="h-4 w-4 text-warning" aria-hidden />
            {summary?.streak ?? 0} day streak
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1.5 text-sm font-medium text-foreground">
            {summary?.todayMinutes ?? 0} focus min today
          </span>
        </div>

        <button
          onClick={() => navigate({ to: "/session" })}
          className="group relative block w-full overflow-hidden rounded-2xl bg-primary p-8 text-left text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:p-10"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm opacity-80">
                {active ? "Session in progress" : "Start a focus session"}
              </p>
              <p className="mt-1 font-serif text-2xl md:text-3xl">
                {active ? active.task : "What are you working on?"}
              </p>
            </div>
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15 transition-transform group-hover:scale-105">
              <Play className="h-6 w-6" aria-hidden />
            </span>
          </div>
        </button>

        {showCoach && (
          <div className="relative rounded-2xl border border-border bg-card p-5 shadow-sm">
            <button
              onClick={() => setShowCoach(false)}
              aria-label="Dismiss"
              className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-start gap-3 pr-6">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                <Sparkles className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">A gentle nudge</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {summary?.lastNote
                    ? `Last time you noted: "${summary.lastNote}"`
                    : "Even 25 minutes of focused work is a real win. Start small — momentum follows."}
                </p>
              </div>
            </div>
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Next planned block
            </p>
            <p className="mt-2 text-sm text-foreground">
              Nothing planned yet.{" "}
              <Link to="/planner" className="text-primary hover:underline">
                Open the planner
              </Link>
              .
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Active goals
            </p>
            <p className="mt-2 text-sm text-foreground">
              No goals set.{" "}
              <Link to="/goals" className="text-primary hover:underline">
                Choose up to three
              </Link>
              .
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
