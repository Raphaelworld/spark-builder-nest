import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const exportUserData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const uid = context.userId;
    const [profile, sessions, checkins, wrapupTags, goals, plannedBlocks, evidence, events] =
      await Promise.all([
        context.supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        context.supabase.from("sessions").select("*").eq("user_id", uid),
        context.supabase.from("checkins").select("*").eq("user_id", uid),
        context.supabase.from("wrapup_tags").select("*").eq("user_id", uid),
        context.supabase.from("goals").select("*").eq("user_id", uid),
        context.supabase.from("planned_blocks").select("*").eq("user_id", uid),
        context.supabase.from("evidence").select("*").eq("user_id", uid),
        context.supabase.from("events").select("*").eq("user_id", uid),
      ]);
    return {
      exported_at: new Date().toISOString(),
      user_id: uid,
      profile: profile.data,
      sessions: sessions.data ?? [],
      checkins: checkins.data ?? [],
      wrapup_tags: wrapupTags.data ?? [],
      goals: goals.data ?? [],
      planned_blocks: plannedBlocks.data ?? [],
      evidence: evidence.data ?? [],
      events: events.data ?? [],
    };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const uid = context.userId;
    // Wipe user-owned rows (RLS-safe via user client).
    await context.supabase.from("checkins").delete().eq("user_id", uid);
    await context.supabase.from("wrapup_tags").delete().eq("user_id", uid);
    await context.supabase.from("sessions").delete().eq("user_id", uid);
    await context.supabase.from("planned_blocks").delete().eq("user_id", uid);
    await context.supabase.from("goals").delete().eq("user_id", uid);
    await context.supabase.from("profiles").delete().eq("id", uid);

    // Delete the auth user with the admin client.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
