import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Gobez" },
      { name: "description", content: "Account, appearance, and data controls." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <AppShell>
      <div className="space-y-2">
        <h1 className="font-serif text-3xl text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Account, appearance, notifications, and data controls will live here.
        </p>
      </div>
    </AppShell>
  );
}
