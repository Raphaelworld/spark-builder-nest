import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type EvidenceItem = {
  tag: string;
  count: number;
  latest_task: string | null;
  latest_at: string;
  pinned: boolean;
  latest_id: string;
};

export const getEvidence = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EvidenceItem[]> => {
    const since = new Date();
    since.setDate(since.getDate() - 90);

    const { data, error } = await context.supabase
      .from("evidence")
      .select("id, tag, task, pinned, created_at")
      .eq("user_id", context.userId)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);

    const byTag = new Map<string, EvidenceItem>();
    for (const row of data ?? []) {
      const key = row.tag;
      const existing = byTag.get(key);
      if (existing) {
        existing.count += 1;
        if (row.pinned) existing.pinned = true;
      } else {
        byTag.set(key, {
          tag: row.tag,
          count: 1,
          latest_task: row.task ?? null,
          latest_at: row.created_at,
          pinned: !!row.pinned,
          latest_id: row.id,
        });
      }
    }
    return Array.from(byTag.values()).sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.count - a.count;
    });
  });

const pinInput = z.object({
  tag: z.string().min(1).max(60),
  pinned: z.boolean(),
});

export const setEvidencePin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => pinInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("evidence")
      .update({ pinned: data.pinned })
      .eq("user_id", context.userId)
      .eq("tag", data.tag);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const dismissInput = z.object({ tag: z.string().min(1).max(60) });

export const dismissEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => dismissInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("evidence")
      .delete()
      .eq("user_id", context.userId)
      .eq("tag", data.tag);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
