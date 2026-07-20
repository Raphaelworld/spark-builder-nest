import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Flame, Info, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { profileQueryOptions } from "@/lib/profile-queries";
import { activeSessionQueryOptions, todaySummaryQueryOptions } from "@/lib/session-queries";
import { insightsQueryOptions } from "@/lib/insights-queries";
import { computeCoachNudges, type CoachNudge } from "@/lib/coach";

const ICONS = {
  celebrate: Flame,
  encourage: Sparkles,
  info: Info,
  warn: AlertTriangle,
} as const;

const STYLES: Record<CoachNudge["tone"], string> = {
  celebrate: "bg-warning/15 text-warning",
  encourage: "bg-primary/15 text-primary",
  info: "bg-muted text-muted-foreground",
  warn: "bg-destructive/15 text-destructive",
};

export function CoachCard() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const { data: profile } = useQuery(profileQueryOptions());
  const { data: today } = useQuery(todaySummaryQueryOptions());
  const { data: insights } = useQuery(insightsQueryOptions(30));
  const { data: active } = useQuery(activeSessionQueryOptions());

  const nudges = computeCoachNudges({
    profile: profile ?? null,
    today: today ?? undefined,
    insights: insights ?? undefined,
    activeSession: active ?? null,
  }).filter((n) => !dismissed.has(n.id));

  if (nudges.length === 0) return null;
  const top = nudges.slice(0, 2);

  return (
    <div className="space-y-3">
      {top.map((n) => {
        const Icon = ICONS[n.tone];
        return (
          <div
            key={n.id}
            className="relative rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            <button
              onClick={() =>
                setDismissed((s) => {
                  const next = new Set(s);
                  next.add(n.id);
                  return next;
                })
              }
              aria-label="Dismiss"
              className="absolute right-3 top-3 rounded-md px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Dismiss
            </button>
            <div className="flex items-start gap-3 pr-16">
              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${STYLES[n.tone]}`}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{n.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                {n.action && (
                  <Link
                    to={n.action.to}
                    className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
                  >
                    {n.action.label} →
                  </Link>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
