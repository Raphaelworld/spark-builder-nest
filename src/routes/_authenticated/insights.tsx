import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { MonthlyPulseCard, WeeklyReviewCard } from "@/components/reflections";
import { insightsQueryOptions } from "@/lib/insights-queries";
import {
  pulsesQueryOptions,
  weeklyReviewQueryOptions,
} from "@/lib/reflections-queries";
import { TECHNIQUES } from "@/lib/techniques";

export const Route = createFileRoute("/_authenticated/insights")({
  head: () => ({
    meta: [
      { title: "Insights — Gobez" },
      {
        name: "description",
        content:
          "How your focus is trending — sessions, minutes, and weekly reviews.",
      },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(insightsQueryOptions(30));
    context.queryClient.ensureQueryData(weeklyReviewQueryOptions());
    context.queryClient.ensureQueryData(pulsesQueryOptions());
  },
  component: InsightsPage,
});

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

function formatHour(h: number): string {
  if (h === 0) return "12a";
  if (h === 12) return "12p";
  return h < 12 ? `${h}a` : `${h - 12}p`;
}

function formatDay(iso: string, compact = true): string {
  const d = new Date(iso);
  return compact
    ? `${d.getMonth() + 1}/${d.getDate()}`
    : d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function InsightsPage() {
  const [days, setDays] = useState(30);
  const { data } = useSuspenseQuery(insightsQueryOptions(days));

  const bestHourEnd = (data.bestHour + 3) % 24;
  const delta = data.weekly.deltaPct;
  const deltaLabel =
    data.weekly.prevWeekMinutes === 0
      ? data.weekly.lastWeekMinutes > 0
        ? "First tracked week — nice start."
        : "No sessions yet this window."
      : `${delta > 0 ? "+" : ""}${delta}% vs previous week`;

  return (
    <AppShell>
      <div className="space-y-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl text-foreground">Insights</h1>
            <p className="text-muted-foreground">
              A quiet look at how your focus is trending.
            </p>
          </div>
          <div className="flex gap-1 rounded-full border border-border bg-card p-1">
            {RANGES.map((r) => (
              <button
                key={r.days}
                type="button"
                onClick={() => setDays(r.days)}
                className={`rounded-full px-3 py-1 text-sm transition ${
                  days === r.days
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </header>

        {/* KPI cards */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard label="Focus minutes" value={data.totals.minutes.toLocaleString()} />
          <KpiCard label="Completed sessions" value={data.totals.sessions} />
          <KpiCard
            label="Avg focus rating"
            value={data.totals.avgFocus ? `${data.totals.avgFocus} / 5` : "—"}
          />
          <KpiCard label="Completion rate" value={`${data.totals.completionRate}%`} />
        </section>

        {/* Trend */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-serif text-xl">Daily focus</h2>
            <span className="text-xs text-muted-foreground">
              minutes per day, last {days}
            </span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.daily} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="day"
                  tickFormatter={(v) => formatDay(v)}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={20}
                />
                <YAxis
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  labelFormatter={(v) => formatDay(String(v), false)}
                  formatter={(v: number) => [`${v} min`, "Focus"]}
                />
                <Line
                  type="monotone"
                  dataKey="minutes"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Weekly review + best time */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 font-serif text-xl">Weekly review</h2>
            <p className="text-3xl font-medium text-foreground">
              {data.weekly.lastWeekMinutes}
              <span className="ml-1 text-base font-normal text-muted-foreground">min</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              across {data.weekly.sessions} session{data.weekly.sessions === 1 ? "" : "s"}
            </p>
            <p
              className={`mt-3 text-sm ${
                delta > 0
                  ? "text-primary"
                  : delta < 0
                    ? "text-destructive"
                    : "text-muted-foreground"
              }`}
            >
              {deltaLabel}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 font-serif text-xl">Your best window</h2>
            {data.totals.sessions === 0 ? (
              <p className="text-sm text-muted-foreground">
                Complete a few sessions to see when you focus best.
              </p>
            ) : (
              <>
                <p className="text-3xl font-medium text-foreground">
                  {formatHour(data.bestHour)}
                  <span className="mx-1 text-muted-foreground">–</span>
                  {formatHour(bestHourEnd)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  The 3-hour block where you log the most focus.
                </p>
              </>
            )}
            <div className="mt-4 h-24 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byHour} margin={{ left: -30, right: 0, top: 4, bottom: 0 }}>
                  <XAxis
                    dataKey="hour"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    interval={3}
                    tickFormatter={(h) => formatHour(Number(h))}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    labelFormatter={(h) => `${formatHour(Number(h))}`}
                    formatter={(v: number) => [`${v} min`, "Focus"]}
                  />
                  <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
                    {data.byHour.map((entry) => {
                      const inWindow =
                        data.bestHour <= bestHourEnd
                          ? entry.hour >= data.bestHour && entry.hour < data.bestHour + 3
                          : entry.hour >= data.bestHour || entry.hour < bestHourEnd;
                      return (
                        <Cell
                          key={entry.hour}
                          fill={
                            inWindow && data.totals.sessions > 0
                              ? "var(--primary)"
                              : "var(--muted)"
                          }
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Techniques + tags */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 font-serif text-xl">By technique</h2>
            {data.byTechnique.length === 0 ? (
              <p className="text-sm text-muted-foreground">No completed sessions yet.</p>
            ) : (
              <ul className="space-y-3">
                {data.byTechnique.map((t) => {
                  const name =
                    TECHNIQUES[t.technique as keyof typeof TECHNIQUES]?.name ?? t.technique;
                  const max = Math.max(...data.byTechnique.map((x) => x.minutes), 1);
                  const pct = Math.round((t.minutes / max) * 100);
                  return (
                    <li key={t.technique}>
                      <div className="mb-1 flex items-baseline justify-between text-sm">
                        <span className="font-medium">{name}</span>
                        <span className="text-muted-foreground">
                          {t.minutes} min · {t.sessions}×
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 font-serif text-xl">What's landing</h2>
            <div className="space-y-4">
              <TagList
                heading="Worked"
                items={data.topWorked}
                tone="worked"
                empty="No wrap-up tags yet."
              />
              <TagList
                heading="Didn't"
                items={data.topDidnt}
                tone="didnt"
                empty="Nothing flagged — nice."
              />
            </div>
          </div>
        </section>

        {/* Notes */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 font-serif text-xl">Notes to future you</h2>
          {data.recentNotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Leave a "next time" note at wrap-up and it will surface here.
            </p>
          ) : (
            <ul className="space-y-3">
              {data.recentNotes.map((n) => (
                <li key={n.id} className="border-l-2 border-primary/40 pl-3">
                  <p className="text-sm text-foreground">"{n.note}"</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDay(n.when, false)} · {n.task}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-2xl text-foreground">{value}</p>
    </div>
  );
}

function TagList({
  heading,
  items,
  tone,
  empty,
}: {
  heading: string;
  items: { tag: string; count: number }[];
  tone: "worked" | "didnt";
  empty: string;
}) {
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">{heading}</p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((i) => (
            <span
              key={i.tag}
              className={`rounded-full border px-3 py-1 text-sm ${
                tone === "worked"
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              {i.tag}
              <span className="ml-1 opacity-60">×{i.count}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
