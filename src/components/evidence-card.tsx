import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pin, PinOff, Sparkles, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { evidenceQueryOptions } from "@/lib/evidence-queries";
import { dismissEvidence, setEvidencePin } from "@/lib/evidence.functions";

export function EvidenceCard() {
  const qc = useQueryClient();
  const { data = [] } = useQuery(evidenceQueryOptions());
  const pinFn = useServerFn(setEvidencePin);
  const dismissFn = useServerFn(dismissEvidence);

  const pin = useMutation({
    mutationFn: (v: { tag: string; pinned: boolean }) => pinFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["evidence"] }),
  });
  const dismiss = useMutation({
    mutationFn: (tag: string) => dismissFn({ data: { tag } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["evidence"] }),
  });

  const items = data.slice(0, 6);

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          <h2 className="font-serif text-lg text-foreground">What's worked before</h2>
        </div>
        <Link to="/insights" className="text-xs text-muted-foreground hover:text-foreground">
          More →
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          After a few wrap-ups, the chips you tag as "worked" show up here as gentle
          reminders of what helps you focus.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li
              key={it.tag}
              className="group flex items-center gap-2 rounded-xl border border-border/60 bg-background/40 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {it.tag}
                  <span className="ml-2 text-xs text-muted-foreground">×{it.count}</span>
                </p>
                {it.latest_task && (
                  <p className="truncate text-xs text-muted-foreground">
                    last: {it.latest_task}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => pin.mutate({ tag: it.tag, pinned: !it.pinned })}
                aria-label={it.pinned ? "Unpin" : "Pin"}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {it.pinned ? (
                  <PinOff className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Pin className="h-3.5 w-3.5" aria-hidden />
                )}
              </button>
              <button
                type="button"
                onClick={() => dismiss.mutate(it.tag)}
                aria-label="Dismiss"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
