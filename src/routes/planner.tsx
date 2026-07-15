import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "Planner — Gobez" },
      {
        name: "description",
        content: "Place study blocks on your week and start sessions from them.",
      },
    ],
  }),
  component: PlannerPage,
});

function PlannerPage() {
  return (
    <AppShell>
      <div className="space-y-2">
        <h1 className="font-serif text-3xl text-foreground">Planner</h1>
        <p className="text-muted-foreground">
          Your week grid will live here. Drop blocks, start sessions, export the
          week to your calendar.
        </p>
      </div>
    </AppShell>
  );
}
