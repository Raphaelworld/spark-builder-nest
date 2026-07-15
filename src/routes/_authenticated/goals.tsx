import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/goals")({
  head: () => ({
    meta: [
      { title: "Goals — Gobez" },
      {
        name: "description",
        content: "Up to three things you're working toward, with progress that tracks itself.",
      },
    ],
  }),
  component: GoalsPage,
});

function GoalsPage() {
  return (
    <AppShell>
      <div className="space-y-2">
        <h1 className="font-serif text-3xl text-foreground">Goals</h1>
        <p className="text-muted-foreground">
          Choose up to three things you're working toward. Sessions you tag will
          count toward them automatically.
        </p>
      </div>
    </AppShell>
  );
}
