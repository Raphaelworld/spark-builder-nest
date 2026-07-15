import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const logInput = z.object({
  name: z.string().min(1).max(80),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const logEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => logInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("events").insert({
      user_id: context.userId,
      name: data.name,
      payload: data.payload ?? {},
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
