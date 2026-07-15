import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, Sparkles, Play, X } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Today — Gobez" },
      {
        name: "description",
        content:
          "A calm focus companion. Plan a session, work through it, wrap it up — every day.",
      },
      { property: "og:title", content: "Today — Gobez" },
      {
        property: "og:description",
        content:
          "A calm focus companion. Plan a session, work through it, wrap it up — every day.",
      },
    ],
  }),
  component: TodayPage,
});

function TodayPage() {
  const [showCoach, setShowCoach] = useState(true);

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
            <span>0 day streak</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1.5 text-sm font-medium text-foreground">
            0 focus min today
          </span>
        </div>

        <Link
          to="/"
          className="group relative block overflow-hidden rounded-2xl bg-primary p-8 text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:p-10"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm opacity-80">Start a focus session</p>
              <p className="mt-1 font-serif text-2xl md:text-3xl">
                What are you working on?
              </p>
            </div>
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15 transition-transform group-hover:scale-105">
              <Play className="h-6 w-6" aria-hidden />
            </span>
          </div>
        </Link>

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
                <p className="text-sm font-medium text-foreground">
                  A gentle nudge
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Even 25 minutes of focused work is a real win. Start small —
                  momentum follows.
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
              Nothing planned yet. Head to the Planner to place a block.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Active goals
            </p>
            <p className="mt-2 text-sm text-foreground">
              No goals set. Choose up to 3 things you're working toward.
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
