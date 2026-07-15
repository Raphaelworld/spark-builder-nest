import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type SessionRow = {
  id: string;
  task: string;
  status: "active" | "completed" | "abandoned";
  started_at: string;
  ended_at: string | null;
  planned_minutes: number;
  focus_rating: number | null;
  technique: string;
  goal_id: string | null;
  exam_mode: boolean;
  next_time_note: string | null;
};

function actualMinutes(s: SessionRow): number {
  if (s.ended_at) {
    const mins = Math.round(
      (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000,
    );
    return Math.max(0, Math.min(mins, s.planned_minutes ?? mins));
  }
  return s.planned_minutes ?? 0;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const getInsights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ days: z.number().int().min(7).max(180).default(30) }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const since = new Date();
    since.setDate(since.getDate() - data.days);
    since.setHours(0, 0, 0, 0);

    const { data: sessions, error } = await context.supabase
      .from("sessions")
      .select(
        "id, task, status, started_at, ended_at, planned_minutes, focus_rating, technique, goal_id, exam_mode, next_time_note",
      )
      .eq("user_id", context.userId)
      .gte("started_at", since.toISOString())
      .order("started_at", { ascending: false });
    if (error) throw new Error(error.message);

    const all = (sessions ?? []) as SessionRow[];
    const completed = all.filter((s) => s.status === "completed");
    const abandoned = all.filter((s) => s.status === "abandoned");

    // Daily buckets
    const dailyMap = new Map<string, { minutes: number; sessions: number }>();
    const cursor = new Date(since);
    while (cursor <= new Date()) {
      dailyMap.set(dayKey(cursor), { minutes: 0, sessions: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    for (const s of completed) {
      const key = dayKey(new Date(s.started_at));
      const cur = dailyMap.get(key) ?? { minutes: 0, sessions: 0 };
      dailyMap.set(key, {
        minutes: cur.minutes + actualMinutes(s),
        sessions: cur.sessions + 1,
      });
    }
    const daily = Array.from(dailyMap.entries()).map(([day, v]) => ({ day, ...v }));

    // Totals
    const totalMinutes = completed.reduce((sum, s) => sum + actualMinutes(s), 0);
    const totalSessions = completed.length;
    const ratings = completed.map((s) => s.focus_rating).filter((r): r is number => !!r);
    const avgFocus = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    const completionRate = all.length ? completed.length / all.length : 0;

    // By technique
    const techMap = new Map<string, { minutes: number; sessions: number }>();
    for (const s of completed) {
      const cur = techMap.get(s.technique) ?? { minutes: 0, sessions: 0 };
      techMap.set(s.technique, {
        minutes: cur.minutes + actualMinutes(s),
        sessions: cur.sessions + 1,
      });
    }
    const byTechnique = Array.from(techMap.entries()).map(([technique, v]) => ({
      technique,
      ...v,
    }));

    // By hour of day
    const hourMap = new Map<number, number>();
    for (const s of completed) {
      const h = new Date(s.started_at).getHours();
      hourMap.set(h, (hourMap.get(h) ?? 0) + actualMinutes(s));
    }
    const byHour = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      minutes: hourMap.get(h) ?? 0,
    }));

    // Best hour block (3-hour rolling window)
    let bestHour = 0;
    let bestSum = 0;
    for (let h = 0; h < 24; h++) {
      const sum =
        (hourMap.get(h) ?? 0) +
        (hourMap.get((h + 1) % 24) ?? 0) +
        (hourMap.get((h + 2) % 24) ?? 0);
      if (sum > bestSum) {
        bestSum = sum;
        bestHour = h;
      }
    }

    // Wrap-up tags
    const { data: tags, error: tErr } = await context.supabase
      .from("wrapup_tags")
      .select("tag, polarity, created_at")
      .eq("user_id", context.userId)
      .gte("created_at", since.toISOString());
    if (tErr) throw new Error(tErr.message);

    const workedMap = new Map<string, number>();
    const didntMap = new Map<string, number>();
    for (const t of tags ?? []) {
      const m = t.polarity === "worked" ? workedMap : didntMap;
      m.set(t.tag, (m.get(t.tag) ?? 0) + 1);
    }
    const topWorked = Array.from(workedMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([tag, count]) => ({ tag, count }));
    const topDidnt = Array.from(didntMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([tag, count]) => ({ tag, count }));

    // Weekly review (last 7 days vs previous 7)
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const lastWeek = completed.filter((s) => new Date(s.started_at) >= weekAgo);
    const prevWeek = completed.filter((s) => {
      const d = new Date(s.started_at);
      return d >= twoWeeksAgo && d < weekAgo;
    });
    const lastWeekMin = lastWeek.reduce((sum, s) => sum + actualMinutes(s), 0);
    const prevWeekMin = prevWeek.reduce((sum, s) => sum + actualMinutes(s), 0);
    const weekDelta = prevWeekMin === 0 ? (lastWeekMin > 0 ? 1 : 0) : (lastWeekMin - prevWeekMin) / prevWeekMin;

    // Recent notes (next-time reflections)
    const recentNotes = completed
      .filter((s) => s.next_time_note)
      .slice(0, 5)
      .map((s) => ({ id: s.id, note: s.next_time_note!, when: s.started_at, task: s.task }));

    return {
      range: { days: data.days, since: since.toISOString() },
      totals: {
        minutes: totalMinutes,
        sessions: totalSessions,
        abandoned: abandoned.length,
        avgFocus: Math.round(avgFocus * 10) / 10,
        completionRate: Math.round(completionRate * 100),
      },
      daily,
      byTechnique,
      byHour,
      bestHour,
      topWorked,
      topDidnt,
      weekly: {
        lastWeekMinutes: lastWeekMin,
        prevWeekMinutes: prevWeekMin,
        deltaPct: Math.round(weekDelta * 100),
        sessions: lastWeek.length,
      },
      recentNotes,
    };
  });
