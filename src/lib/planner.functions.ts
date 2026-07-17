import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listPlannedBlocks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("planned_blocks")
      .select("*")
      .eq("user_id", context.userId)
      .order("day_of_week", { ascending: true })
      .order("start_minute", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const blockInput = z.object({
  title: z.string().min(1).max(120),
  goal_id: z.string().uuid().nullable().optional(),
  day_of_week: z.number().int().min(0).max(6),
  start_minute: z.number().int().min(0).max(1439),
  end_minute: z.number().int().min(1).max(1440),
  planned_minutes: z.number().int().min(5).max(240),
  technique: z.enum(["pomodoro", "deep_work", "active_recall"]).default("pomodoro"),
});

export const createPlannedBlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => blockInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("planned_blocks")
      .insert({
        user_id: context.userId,
        title: data.title,
        goal_id: data.goal_id ?? null,
        day_of_week: data.day_of_week,
        start_minute: data.start_minute,
        end_minute: data.end_minute,
        planned_minutes: data.planned_minutes,
        technique: data.technique,
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
      goal_id: z.string().uuid().nullable().optional(),
      day_of_week: z.number().int().min(0).max(6).optional(),
      start_minute: z.number().int().min(0).max(1439).optional(),
      end_minute: z.number().int().min(1).max(1440).optional(),
      planned_minutes: z.number().int().min(5).max(240).optional(),
      technique: z.enum(["pomodoro", "deep_work", "active_recall"]).optional(),
    })
    .strict(),
});

export const updatePlannedBlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => updateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("planned_blocks")
      .update(data.patch)
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deletePlannedBlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("planned_blocks")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
