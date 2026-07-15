import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { profileQueryOptions } from "@/lib/profile-queries";
import { updateProfile } from "@/lib/profile.functions";
import { exportUserData, deleteAccount } from "@/lib/account.functions";
import { TECHNIQUES, type TechniqueId } from "@/lib/techniques";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(profileQueryOptions());
  },
  head: () => ({ meta: [{ title: "Settings — Gobez" }] }),
  errorComponent: ({ error }) => (
    <AppShell>
      <p role="alert" className="text-destructive">
        {error.message}
      </p>
    </AppShell>
  ),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile } = useQuery(profileQueryOptions());
  const save = useServerFn(updateProfile);
  const exportFn = useServerFn(exportUserData);
  const deleteFn = useServerFn(deleteAccount);

  const [name, setName] = useState("");
  const [technique, setTechnique] = useState<TechniqueId>("pomodoro");
  const [duration, setDuration] = useState(25);
  const [tone, setTone] = useState<"gentle" | "direct" | "playful">("gentle");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(profile.display_name ?? "");
    setTechnique((profile.default_technique as TechniqueId) ?? "pomodoro");
    setDuration(profile.default_duration ?? 25);
    setTone(
      (profile.coach_tone as "gentle" | "direct" | "playful") ?? "gentle",
    );
  }, [profile]);

  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          display_name: name.trim(),
          default_technique: technique,
          default_duration: duration,
          coach_tone: tone,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await exportFn();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gobez-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const [confirmDelete, setConfirmDelete] = useState("");
  const deleteMutation = useMutation({
    mutationFn: () => deleteFn(),
    onSuccess: async () => {
      await supabase.auth.signOut();
      navigate({ to: "/auth" });
    },
  });

  return (
    <AppShell>
      <div className="space-y-8">
        <header className="space-y-1">
          <p className="text-sm text-muted-foreground">Your preferences</p>
          <h1 className="font-serif text-4xl">Settings</h1>
        </header>

        <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-serif text-xl">Profile</h2>
          <label className="block space-y-1">
            <span className="text-sm text-muted-foreground">Display name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
        </section>

        <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-serif text-xl">Default rhythm</h2>
          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(TECHNIQUES) as TechniqueId[]).map((id) => {
              const t = TECHNIQUES[id];
              const active = technique === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTechnique(id)}
                  className={`rounded-xl border p-3 text-left text-sm ${
                    active
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background hover:bg-accent"
                  }`}
                >
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.hint}</p>
                </button>
              );
            })}
          </div>
          <div>
            <p className="mb-2 text-sm text-muted-foreground">Default length</p>
            <div className="flex flex-wrap gap-2">
              {[15, 20, 25, 30, 45, 50, 60, 90].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDuration(m)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    duration === m
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background hover:bg-accent"
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-serif text-xl">Coach tone</h2>
          <div className="grid gap-2 sm:grid-cols-3">
            {(["gentle", "direct", "playful"] as const).map((t) => {
              const active = tone === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTone(t)}
                  className={`rounded-xl border p-3 text-sm capitalize ${
                    active
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background hover:bg-accent"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {mutation.isPending ? "Saving…" : "Save changes"}
          </button>
          {saved && (
            <span className="text-sm text-success">Saved</span>
          )}
          {mutation.isError && (
            <span className="text-sm text-destructive">
              {(mutation.error as Error).message}
            </span>
          )}
        </div>

        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-serif text-xl">Account</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as {profile?.display_name ?? "—"}
          </p>
          <button
            onClick={signOut}
            className="mt-3 rounded-full border border-border px-4 py-2 text-sm hover:bg-accent"
          >
            Sign out
          </button>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-serif text-xl">Your data</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Download everything Gobez has stored for you as a JSON file.
          </p>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="mt-3 rounded-full border border-border px-4 py-2 text-sm hover:bg-accent disabled:opacity-50"
          >
            {exporting ? "Preparing…" : "Export my data"}
          </button>
        </section>

        <section className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
          <h2 className="font-serif text-xl text-destructive">Danger zone</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Permanently delete your account, sessions, goals, and plans. This
            cannot be undone. Type <span className="font-mono">DELETE</span> to
            confirm.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              value={confirmDelete}
              onChange={(e) => setConfirmDelete(e.target.value)}
              placeholder="DELETE"
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={confirmDelete !== "DELETE" || deleteMutation.isPending}
              className="rounded-full bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-50"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete account"}
            </button>
          </div>
          {deleteMutation.isError && (
            <p className="mt-2 text-sm text-destructive">
              {(deleteMutation.error as Error).message}
            </p>
          )}
        </section>

      </div>
    </AppShell>
  );
}
