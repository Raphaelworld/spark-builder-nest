import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useHydrated } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset password — Gobez" },
      { name: "description", content: "Choose a new password for your Gobez account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const hydrated = useHydrated();
  if (!hydrated) return null;
  return <ResetPasswordBody />;
}

function ResetPasswordBody() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase parses the recovery hash and fires PASSWORD_RECOVERY on load.
    // Also treat an existing session as ready (user landed with a valid link).
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError(
        /pwned|leaked|breach|weak/i.test(error.message)
          ? "That password has appeared in a known data breach. Please choose a different one."
          : error.message,
      );
      return;
    }
    setInfo("Password updated. Redirecting…");
    setTimeout(() => navigate({ to: "/today", replace: true }), 800);
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <p className="font-serif text-3xl text-primary">Gobez</p>
          <h1 className="mt-6 font-serif text-3xl text-foreground">Set a new password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {ready
              ? "Choose a strong password you don't use elsewhere."
              : "Verifying your reset link…"}
          </p>
        </div>

        {ready ? (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium">
                New password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                At least 8 characters. We check against known leaks.
              </p>
            </div>
            <div>
              <label htmlFor="confirm" className="block text-sm font-medium">
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            {info && (
              <p
                className="rounded-md border border-border bg-accent/50 px-3 py-2 text-sm text-foreground"
                role="status"
              >
                {info}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {busy ? "…" : "Update password"}
            </button>
          </form>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            If this page doesn't unlock, request a new reset link from the sign-in page.
          </p>
        )}
      </div>
    </div>
  );
}
