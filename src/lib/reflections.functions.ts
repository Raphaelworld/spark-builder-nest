import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Monday of the ISO week containing `d`, local time.
function weekStart(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // Mon = 0
  x.setDate(x.getDate() - dow);
  return x;
}

function monthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

type SessionRow = {
  status: "active" | "completed" | "abandoned";
  started_at: string;
  ended_at: string | null;
  planned_minutes: number;
  focus_rating: number | null;
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

async function computeWeekStats(supabase: SupabaseClient<Database>, userId: string, start: Date) {
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const [{ data, error }, { data: blocks, error: bErr }] = await Promise.all([
    supabase
      .from("sessions")
      .select("status, started_at, ended_at, planned_minutes, focus_rating")
      .eq("user_id", userId)
      .gte("started_at", start.toISOString())
      .lt("started_at", end.toISOString()),
    supabase.from("planned_blocks").select("planned_minutes").eq("user_id", userId),
  ]);
  if (error) throw new Error(error.message);
  if (bErr) throw new Error(bErr.message);
  const rows = (data ?? []) as SessionRow[];
  const completed = rows.filter((r) => r.status === "completed");
  const minutes = completed.reduce((s, r) => s + actualMinutes(r), 0);
  const ratings = completed.map((r) => r.focus_rating).filter((r): r is number => !!r);
  const avgFocus = ratings.length
    ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
    : 0;
  // Blocks are a weekly template, so their sum is this week's plan.
  const plannedMinutes = ((blocks ?? []) as { planned_minutes: number }[]).reduce(
    (s, b) => s + b.planned_minutes,
    0,
  );
  return {
    sessions: completed.length,
    minutes,
    plannedMinutes,
    abandoned: rows.filter((r) => r.status === "abandoned").length,
    avgFocus,
  };
}

// ---- Weekly reviews ----

export const getCurrentWeeklyReview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const start = weekStart(new Date());
    const startKey = isoDate(start);
    const [{ data: existing, error }, stats, history] = await Promise.all([
      context.supabase
        .from("weekly_reviews")
        .select("id, week_start, went_well, next_focus, stats, updated_at")
        .eq("user_id", context.userId)
        .eq("week_start", startKey)
        .maybeSingle(),
      computeWeekStats(context.supabase, context.userId, start),
      context.supabase
        .from("weekly_reviews")
        .select("id, week_start, went_well, next_focus, stats")
        .eq("user_id", context.userId)
        .order("week_start", { ascending: false })
        .limit(6),
    ]);
    if (error) throw new Error(error.message);
    if (history.error) throw new Error(history.error.message);
    return {
      weekStart: startKey,
      liveStats: stats,
      current: existing ?? null,
      history: history.data ?? [],
    };
  });

export const saveWeeklyReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        wentWell: z.string().trim().max(500).optional().default(""),
        nextFocus: z.string().trim().max(500).optional().default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const start = weekStart(new Date());
    const startKey = isoDate(start);
    const stats = await computeWeekStats(context.supabase, context.userId, start);
    const { data: row, error } = await context.supabase
      .from("weekly_reviews")
      .upsert(
        {
          user_id: context.userId,
          week_start: startKey,
          went_well: data.wentWell || null,
          next_focus: data.nextFocus || null,
          stats,
        },
        { onConflict: "user_id,week_start" },
      )
      .select("id, week_start, went_well, next_focus, stats")
      .single();
    if (error) throw new Error(error.message);
    await context.supabase.from("events").insert({
      user_id: context.userId,
      name: "review_completed",
      payload: { week_start: startKey } as never,
    });
    return row;
  });

// ---- Monthly pulses ----

// The PRD's six SRL dimensions (F4): planning ahead, staying focused,
// bouncing back from setbacks, confidence, study environment, asking for help.
const pulseSchema = z.object({
  planning: z.number().int().min(1).max(10),
  focus: z.number().int().min(1).max(10),
  resilience: z.number().int().min(1).max(10),
  confidence: z.number().int().min(1).max(10),
  environment: z.number().int().min(1).max(10),
  help_seeking: z.number().int().min(1).max(10),
  note: z.string().trim().max(500).optional().default(""),
});

export const getPulses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const start = monthStart(new Date());
    const startKey = isoDate(start);
    const [{ data: current, error }, { data: history, error: hErr }] = await Promise.all([
      context.supabase
        .from("pulses")
        .select("*")
        .eq("user_id", context.userId)
        .eq("month_start", startKey)
        .maybeSingle(),
      context.supabase
        .from("pulses")
        .select("*")
        .eq("user_id", context.userId)
        .order("month_start", { ascending: false })
        .limit(12),
    ]);
    if (error) throw new Error(error.message);
    if (hErr) throw new Error(hErr.message);
    return {
      monthStart: startKey,
      current: current ?? null,
      history: (history ?? []).slice().reverse(),
    };
  });

export const savePulse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => pulseSchema.parse(d))
  .handler(async ({ data, context }) => {
    const startKey = isoDate(monthStart(new Date()));
    const { data: row, error } = await context.supabase
      .from("pulses")
      .upsert(
        {
          user_id: context.userId,
          month_start: startKey,
          planning: data.planning,
          focus: data.focus,
          resilience: data.resilience,
          confidence: data.confidence,
          environment: data.environment,
          help_seeking: data.help_seeking,
          note: data.note || null,
        },
        { onConflict: "user_id,month_start" },
      )
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
