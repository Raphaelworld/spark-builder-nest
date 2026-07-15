import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { profileQueryOptions } from "@/lib/profile-queries";
import { completeOnboarding } from "@/lib/profile.functions";
import { TECHNIQUES, type TechniqueId } from "@/lib/techniques";
import { Sparkles } from "lucide-react";

const TONES = [
  { id: "gentle", label: "Gentle", hint: "Soft, encouraging voice." },
  { id: "direct", label: "Direct", hint: "Short, no-nonsense cues." },
  { id: "playful", label: "Playful", hint: "Warm with a wink." },
] as const;

export function OnboardingOverlay() {
  const { data: profile, isLoading } = useQuery(profileQueryOptions());
  const qc = useQueryClient();
  const submit = useServerFn(completeOnboarding);

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [technique, setTechnique] = useState<TechniqueId>("pomodoro");
  const [duration, setDuration] = useState(25);
  const [tone, setTone] = useState<"gentle" | "direct" | "playful">("gentle");

  const initialized = useMemo(() => {
    if (profile && !name) return profile.display_name ?? "";
    return null;
  }, [profile, name]);
  if (initialized !== null && initialized !== "") {
    // seed once
    if (name === "") setName(initialized);
  }

  const mutation = useMutation({
    mutationFn: (payload: {
      display_name: string;
      default_technique: TechniqueId;
      default_duration: number;
      coach_tone: "gentle" | "direct" | "playful";
    }) => submit({ data: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });

  if (isLoading || !profile || profile.onboarding_completed_at) return null;

  const totalSteps = 4;
  const canNext =
    (step === 0 && name.trim().length > 0) ||
    step === 1 ||
    step === 2 ||
    step === 3;

  const finish = () => {
    mutation.mutate({
      display_name: name.trim(),
      default_technique: technique,
      default_duration: duration,
      coach_tone: tone,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl md:p-8">
        <div className="mb-5 flex items-center gap-2 text-primary">
          <Sparkles className="h-4 w-4" aria-hidden />
          <span className="text-xs uppercase tracking-wider">
            Welcome — {step + 1} of {totalSteps}
          </span>
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-serif text-2xl">What should we call you?</h2>
            <p className="text-sm text-muted-foreground">
              Gobez is a quiet focus companion. First, your name.
            </p>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First name"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-serif text-2xl">Pick a default rhythm</h2>
            <p className="text-sm text-muted-foreground">
              You can switch this any time before a session.
            </p>
            <div className="space-y-2">
              {(Object.keys(TECHNIQUES) as TechniqueId[]).map((id) => {
                const t = TECHNIQUES[id];
                const active = technique === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setTechnique(id);
                      setDuration(t.defaultMinutes);
                    }}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      active
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background hover:bg-accent"
                    }`}
                  >
                    <p className="font-medium">{t.name}</p>
                    <p className="text-sm text-muted-foreground">{t.hint}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-serif text-2xl">Default session length</h2>
            <p className="text-sm text-muted-foreground">
              How long is a comfortable focus block for you?
            </p>
            <div className="flex flex-wrap gap-2">
              {[15, 20, 25, 30, 45, 50, 60, 90].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDuration(m)}
                  className={`rounded-full border px-4 py-2 text-sm ${
                    duration === m
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background hover:bg-accent"
                  }`}
                >
                  {m} min
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-serif text-2xl">How should the coach sound?</h2>
            <p className="text-sm text-muted-foreground">
              We'll tune nudges to this tone. You can change it in Settings.
            </p>
            <div className="space-y-2">
              {TONES.map((t) => {
                const active = tone === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTone(t.id)}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      active
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background hover:bg-accent"
                    }`}
                  >
                    <p className="font-medium">{t.label}</p>
                    <p className="text-sm text-muted-foreground">{t.hint}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {mutation.isError && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {(mutation.error as Error).message}
          </p>
        )}

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || mutation.isPending}
            className="text-sm text-muted-foreground disabled:opacity-40"
          >
            Back
          </button>
          {step < totalSteps - 1 ? (
            <button
              type="button"
              onClick={() => canNext && setStep((s) => s + 1)}
              disabled={!canNext}
              className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              disabled={mutation.isPending}
              className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {mutation.isPending ? "Saving…" : "Let's go"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
