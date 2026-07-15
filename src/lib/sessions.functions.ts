import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const startInput = z.object({
  task: z.string().min(1).max(200),
  technique: z.enum(["pomodoro", "deep_work", "active_recall"]),
  planned_minutes: z.number().int().min(5).max(180),
  exam_mode: z.boolean().default(false),
  goal_id: z.string().uuid().nullable().optional(),
});

export const startSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => startInput.parse(d))
  .handler(async ({ data, context }) => {
    // Abandon any lingering active session for this user first
    await context.supabase
      .from("sessions")
      .update({ status: "abandoned", ended_at: new Date().toISOString(), abandon_reason: "replaced" })
      .eq("user_id", context.userId)
      .eq("status", "active");

    const { data: row, error } = await context.supabase
      .from("sessions")
      .insert({
        user_id: context.userId,
        task: data.task,
        technique: data.technique,
        planned_minutes: data.planned_minutes,
        exam_mode: data.exam_mode,
        goal_id: data.goal_id ?? null,
        status: "active",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const getActiveSession = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("sessions")
      .select("*")
      .eq("user_id", context.userId)
      .eq("status", "active")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

const checkinInput = z.object({
  session_id: z.string().uuid(),
  confidence: z.number().int().min(1).max(5),
  note: z.string().max(140).optional(),
  kind: z.enum(["auto", "manual", "stuck"]).default("manual"),
});

export const addCheckin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => checkinInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("checkins").insert({
      session_id: data.session_id,
      user_id: context.userId,
      confidence: data.confidence,
      note: data.note ?? null,
      kind: data.kind,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const wrapupInput = z.object({
  session_id: z.string().uuid(),
  focus_rating: z.number().int().min(1).max(5),
  next_time_note: z.string().max(200).optional(),
  worked: z.array(z.string().max(60)).default([]),
  didnt: z.array(z.string().max(60)).default([]),
});

export const completeSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => wrapupInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error: sErr } = await context.supabase
      .from("sessions")
      .update({
        status: "completed",
        ended_at: new Date().toISOString(),
        focus_rating: data.focus_rating,
        next_time_note: data.next_time_note ?? null,
      })
      .eq("id", data.session_id)
      .eq("user_id", context.userId);
    if (sErr) throw new Error(sErr.message);

    const tags = [
      ...data.worked.map((t) => ({
        session_id: data.session_id,
        user_id: context.userId,
        tag: t,
        polarity: "worked" as const,
      })),
      ...data.didnt.map((t) => ({
        session_id: data.session_id,
        user_id: context.userId,
        tag: t,
        polarity: "didnt" as const,
      })),
    ];
    if (tags.length) {
      const { error: tErr } = await context.supabase.from("wrapup_tags").insert(tags);
      if (tErr) throw new Error(tErr.message);
    }
    return { ok: true };
  });

const abandonInput = z.object({
  session_id: z.string().uuid(),
  reason: z.string().max(60).optional(),
});

export const abandonSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => abandonInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("sessions")
      .update({
        status: "abandoned",
        ended_at: new Date().toISOString(),
        abandon_reason: data.reason ?? null,
      })
      .eq("id", data.session_id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getTodaySummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Recent sessions (last 60 days) — used for streak, today total, suggestions
    const since = new Date();
    since.setDate(since.getDate() - 60);

    const { data: sessions, error } = await context.supabase
      .from("sessions")
      .select("id, task, status, started_at, ended_at, planned_minutes, focus_rating, next_time_note")
      .eq("user_id", context.userId)
      .gte("started_at", since.toISOString())
      .order("started_at", { ascending: false });
    if (error) throw new Error(error.message);

    const completed = (sessions ?? []).filter((s) => s.status === "completed");

    // Today's focus minutes
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMinutes = completed
      .filter((s) => new Date(s.started_at) >= todayStart)
      .reduce((sum, s) => {
        if (s.ended_at) {
          const mins = Math.round(
            (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000,
          );
          return sum + Math.max(0, Math.min(mins, s.planned_minutes ?? mins));
        }
        return sum + (s.planned_minutes ?? 0);
      }, 0);

    // Streak: consecutive days ending today (or yesterday) with a completed session
    const days = new Set<string>();
    for (const s of completed) {
      const d = new Date(s.started_at);
      days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    }
    let streak = 0;
    const cursor = new Date();
    // Allow starting from today OR yesterday
    const today = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
    if (!days.has(today)) cursor.setDate(cursor.getDate() - 1);
    while (
      days.has(`${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`)
    ) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    const recentTasks = Array.from(
      new Set(
        (sessions ?? [])
          .map((s) => s.task)
          .filter((t): t is string => Boolean(t))
          .slice(0, 20),
      ),
    ).slice(0, 5);

    const lastNote = completed.find((s) => s.next_time_note)?.next_time_note ?? null;

    return {
      streak,
      todayMinutes,
      recentTasks,
      lastNote,
      completedCount: completed.length,
    };
  });
