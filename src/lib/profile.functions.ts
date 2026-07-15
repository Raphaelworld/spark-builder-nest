import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

const patchInput = z.object({
  display_name: z.string().min(1).max(80).optional(),
  default_technique: z.enum(["pomodoro", "deep_work", "active_recall"]).optional(),
  default_duration: z.number().int().min(5).max(180).optional(),
  coach_tone: z.enum(["gentle", "direct", "playful"]).optional(),
  onboarding_completed_at: z.string().nullable().optional(),
});

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => patchInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update(data)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        display_name: z.string().min(1).max(80),
        default_technique: z.enum(["pomodoro", "deep_work", "active_recall"]),
        default_duration: z.number().int().min(5).max(180),
        coach_tone: z.enum(["gentle", "direct", "playful"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ ...data, onboarding_completed_at: new Date().toISOString() })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
