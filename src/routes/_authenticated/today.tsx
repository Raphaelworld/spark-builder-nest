import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Flame, Play } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CoachCard } from "@/components/coach-card";
import { EvidenceCard } from "@/components/evidence-card";
import { OnboardingOverlay } from "@/components/onboarding-overlay";
import {
  activeSessionQueryOptions,
  todaySummaryQueryOptions,
} from "@/lib/session-queries";
import {
  goalsQueryOptions,
  plannedBlocksQueryOptions,
} from "@/lib/planner-queries";
import { profileQueryOptions } from "@/lib/profile-queries";
import { insightsQueryOptions } from "@/lib/insights-queries";
import { evidenceQueryOptions } from "@/lib/evidence-queries";

export const Route = createFileRoute("/_authenticated/today")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(activeSessionQueryOptions());
    context.queryClient.ensureQueryData(todaySummaryQueryOptions());
    context.queryClient.ensureQueryData(goalsQueryOptions());
    context.queryClient.ensureQueryData(plannedBlocksQueryOptions());
    context.queryClient.ensureQueryData(profileQueryOptions());
    context.queryClient.ensureQueryData(insightsQueryOptions(30));
    context.queryClient.ensureQueryData(evidenceQueryOptions());
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
  const navigate = useNavigate();
  const { data: active } = useQuery(activeSessionQueryOptions());
  const { data: summary } = useQuery(todaySummaryQueryOptions());
  const { data: profile } = useQuery(profileQueryOptions());
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
  const firstName = profile?.display_name?.split(" ")[0]?.trim();


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
            {firstName ? `Ready to focus, ${firstName}?` : "Ready to focus?"}
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
          data-track="cta_start_session_click"
          data-track-payload={JSON.stringify({ active: !!active, location: "today_hero" })}
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

        <CoachCard />

        <EvidenceCard />




        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Next planned block
            </p>
            {nextBlock ? (
              <div className="mt-2 space-y-1">
                <p className="font-serif text-lg text-foreground">
                  {nextBlock.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][
                    nextBlock.day_of_week
                  ]}{" "}
                  ·{" "}
                  {`${Math.floor(nextBlock.start_minute / 60)}:${String(
                    nextBlock.start_minute % 60,
                  ).padStart(2, "0")}`}{" "}
                  · {nextBlock.planned_minutes}m
                </p>
                <Link
                  to="/planner"
                  className="mt-1 inline-block text-xs text-primary hover:underline"
                >
                  Open planner
                </Link>
              </div>
            ) : (
              <p className="mt-2 text-sm text-foreground">
                Nothing planned yet.{" "}
                <Link to="/planner" className="text-primary hover:underline">
                  Open the planner
                </Link>
                .
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Active goals
            </p>
            {activeGoals.length > 0 ? (
              <ul className="mt-2 space-y-1 text-sm text-foreground">
                {activeGoals.slice(0, 3).map((g) => (
                  <li key={g.id} className="truncate">
                    · {g.title}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-foreground">
                No goals set.{" "}
                <Link to="/goals" className="text-primary hover:underline">
                  Choose up to three
                </Link>
                .
              </p>
            )}
          </div>
        </section>
      </div>
      <OnboardingOverlay />
    </AppShell>
  );

}
