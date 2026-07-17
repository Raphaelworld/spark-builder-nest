import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listUnscheduledTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("unscheduled_tasks")
      .select("*")
      .eq("user_id", context.userId)
      .order("position", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const taskInput = z.object({
  title: z.string().min(1).max(120),
  goal_id: z.string().uuid().nullable().optional(),
  technique: z.enum(["pomodoro", "deep_work", "active_recall"]).default("pomodoro"),
  planned_minutes: z.number().int().min(5).max(240).default(25),
});

export const createUnscheduledTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => taskInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: max } = await context.supabase
      .from("unscheduled_tasks")
      .select("position")
      .eq("user_id", context.userId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextPos = (max?.position ?? -1) + 1;
    const { data: row, error } = await context.supabase
      .from("unscheduled_tasks")
      .insert({
        user_id: context.userId,
        title: data.title,
        goal_id: data.goal_id ?? null,
        technique: data.technique,
        planned_minutes: data.planned_minutes,
        position: nextPos,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteUnscheduledTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("unscheduled_tasks")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
