import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Insights — Gobez" },
      {
        name: "description",
        content: "How your focus is trending — sessions, minutes, and weekly reviews.",
      },
    ],
  }),
  component: InsightsPage,
});

function InsightsPage() {
  return (
    <AppShell>
      <div className="space-y-2">
        <h1 className="font-serif text-3xl text-foreground">Insights</h1>
        <p className="text-muted-foreground">
          Trends, session history, weekly review, and a monthly pulse will appear
          here as you use Gobez.
        </p>
      </div>
    </AppShell>
  );
}
