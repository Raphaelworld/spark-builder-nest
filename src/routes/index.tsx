import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/today" });
  },
  head: () => ({
    meta: [
      { title: "Gobez — a calm focus companion" },
      {
        name: "description",
        content:
          "Gobez is a warm, editorial focus companion. Plan a session, work through it, wrap it up — every day.",
      },
      { property: "og:title", content: "Gobez — a calm focus companion" },
      {
        property: "og:description",
        content:
          "Plan a session, work through it, wrap it up — every day. No forms, no jargon.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <span className="font-serif text-2xl text-primary">Gobez</span>
        <Link
          to="/auth"
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Sign in
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <p className="text-sm uppercase tracking-widest text-muted-foreground">
          A calm focus companion
        </p>
        <h1 className="mt-4 font-serif text-5xl leading-tight text-foreground md:text-6xl">
          Plan a session. Focus. Wrap it up.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Gobez is a warm, editorial daily companion for the way you actually
          study. Taps, timers, and one-line prompts — never another worksheet.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            to="/auth"
            className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Start focusing
          </Link>
          <Link
            to="/auth"
            className="rounded-lg border border-border bg-card px-6 py-3 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Sign in
          </Link>
        </div>

        <div className="mt-20 grid gap-6 sm:grid-cols-3">
          {[
            {
              title: "A 30-second setup",
              body: "One line, one technique, one duration. Then you're focusing.",
            },
            {
              title: "Gentle check-ins",
              body: "A quick pulse mid-session — how confident, one line if you want.",
            },
            {
              title: "A story, not a scoreboard",
              body: "Streaks, focus minutes, and a weekly review that reads like a note.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-5">
              <p className="font-serif text-lg">{f.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
