import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const goalInput = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  deadline: z.string().nullable().optional(), // ISO date
  color: z.string().max(20).default("terracotta"),
});

export const listGoals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: goals, error } = await context.supabase
      .from("goals")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: sessions, error: sErr } = await context.supabase
      .from("sessions")
      .select("goal_id, status, planned_minutes, started_at, ended_at")
      .eq("user_id", context.userId)
      .eq("status", "completed")
      .not("goal_id", "is", null);
    if (sErr) throw new Error(sErr.message);

    const stats = new Map<string, { sessions: number; minutes: number }>();
    for (const s of sessions ?? []) {
      if (!s.goal_id) continue;
      const cur = stats.get(s.goal_id) ?? { sessions: 0, minutes: 0 };
      const mins = s.ended_at
        ? Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000)
        : s.planned_minutes;
      stats.set(s.goal_id, {
        sessions: cur.sessions + 1,
        minutes: cur.minutes + Math.max(0, Math.min(mins, s.planned_minutes)),
      });
    }

    return (goals ?? []).map((g) => ({
      ...g,
      stats: stats.get(g.id) ?? { sessions: 0, minutes: 0 },
    }));
  });

export const createGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => goalInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("goals")
      .insert({
        user_id: context.userId,
        title: data.title,
        description: data.description ?? null,
        deadline: data.deadline || null,
        color: data.color,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const updateInput = z.object({
  id: z.string().uuid(),
  patch: z
    .object({
      title: z.string().min(1).max(120).optional(),
      description: z.string().max(500).nullable().optional(),
      deadline: z.string().nullable().optional(),
      color: z.string().max(20).optional(),
      status: z.enum(["active", "archived", "completed"]).optional(),
    })
    .strict(),
});

export const updateGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => updateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("goals")
      .update(data.patch)
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("goals")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
